import calendar
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, ReturnDocument

from app.schemas.todo import TodoCreate, TodoOut, TodoPriority, TodoStatus, TodoUpdate

SORT_OPTIONS = {
    "due_date_asc": [("due_date", ASCENDING), ("created_at", DESCENDING)],
    "due_date_desc": [("due_date", DESCENDING), ("created_at", DESCENDING)],
    "created_desc": [("created_at", DESCENDING)],
    "created_asc": [("created_at", ASCENDING)],
}


def _as_utc(value: datetime | None) -> datetime | None:
    """Force naive datetimes from MongoDB to be UTC-aware so the serialized
    ISO string carries timezone info. Mobile/JS parsing of timezone-naive
    ISO strings is engine-dependent and can shift times by the local offset."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _to_out(doc: dict) -> TodoOut:
    return TodoOut(
        id=str(doc["_id"]),
        user_id=str(doc["user_id"]),
        title=doc["title"],
        description=doc.get("description"),
        status=doc["status"],
        priority=doc["priority"],
        due_date=_as_utc(doc.get("due_date")),
        recurrence=doc.get("recurrence"),
        last_completed_at=_as_utc(doc.get("last_completed_at")),
        created_at=_as_utc(doc["created_at"]) or doc["created_at"],
        updated_at=_as_utc(doc["updated_at"]) or doc["updated_at"],
    )


def _next_due_date(current: datetime, recurrence: str) -> datetime:
    """Bump a due_date by one recurrence step. Monthly clamps day-of-month."""
    if recurrence == "daily":
        return current + timedelta(days=1)
    if recurrence == "weekly":
        return current + timedelta(days=7)
    if recurrence == "monthly":
        year = current.year
        month = current.month + 1
        if month > 12:
            month = 1
            year += 1
        last_day = calendar.monthrange(year, month)[1]
        return current.replace(year=year, month=month, day=min(current.day, last_day))
    return current


def _prev_due_date(current: datetime, recurrence: str) -> datetime:
    """Inverse of _next_due_date: walk one recurrence step backwards."""
    if recurrence == "daily":
        return current - timedelta(days=1)
    if recurrence == "weekly":
        return current - timedelta(days=7)
    if recurrence == "monthly":
        year = current.year
        month = current.month - 1
        if month < 1:
            month = 12
            year -= 1
        last_day = calendar.monthrange(year, month)[1]
        return current.replace(year=year, month=month, day=min(current.day, last_day))
    return current


def _parse_oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid id")


async def list_todos(
    db: AsyncIOMotorDatabase,
    user_id: ObjectId,
    status_filter: TodoStatus | None = None,
    priority_filter: TodoPriority | None = None,
    q: str | None = None,
    sort: str = "created_desc",
) -> list[TodoOut]:
    query: dict = {"user_id": user_id}
    if status_filter:
        query["status"] = status_filter.value
    if priority_filter:
        query["priority"] = priority_filter.value
    if q:
        regex = {"$regex": q, "$options": "i"}
        query["$or"] = [{"title": regex}, {"description": regex}]
    sort_spec = SORT_OPTIONS.get(sort, SORT_OPTIONS["created_desc"])
    cursor = db.todos.find(query).sort(sort_spec)
    return [_to_out(doc) async for doc in cursor]


async def create_todo(
    db: AsyncIOMotorDatabase, user_id: ObjectId, payload: TodoCreate
) -> TodoOut:
    now = datetime.now(timezone.utc)
    doc = {
        "user_id": user_id,
        "title": payload.title.strip(),
        "description": (payload.description or None),
        "status": payload.status.value,
        "priority": payload.priority.value,
        "due_date": payload.due_date,
        "recurrence": payload.recurrence.value if payload.recurrence else None,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.todos.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _to_out(doc)


async def get_todo(db: AsyncIOMotorDatabase, user_id: ObjectId, todo_id: str) -> TodoOut:
    oid = _parse_oid(todo_id)
    doc = await db.todos.find_one({"_id": oid, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
    return _to_out(doc)


async def update_todo(
    db: AsyncIOMotorDatabase, user_id: ObjectId, todo_id: str, payload: TodoUpdate
) -> TodoOut:
    oid = _parse_oid(todo_id)
    update: dict = {}
    data = payload.model_dump(exclude_unset=True)
    for key in ("title", "description", "due_date"):
        if key in data:
            update[key] = data[key]
    if "status" in data and data["status"] is not None:
        update["status"] = data["status"].value if hasattr(data["status"], "value") else data["status"]
    if "priority" in data and data["priority"] is not None:
        update["priority"] = data["priority"].value if hasattr(data["priority"], "value") else data["priority"]
    if "recurrence" in data:
        rec = data["recurrence"]
        update["recurrence"] = rec.value if hasattr(rec, "value") else rec
    if not update:
        return await get_todo(db, user_id, todo_id)
    update["updated_at"] = datetime.now(timezone.utc)

    before = await db.todos.find_one(
        {"_id": oid, "user_id": user_id},
        {"status": 1, "due_date": 1, "recurrence": 1},
    )
    if not before:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")

    # For recurring tasks: completing bumps due_date to the next occurrence
    # and keeps status pending. One record, no completion clutter, history-free.
    transitioned_to_completed = (
        update.get("status") == "completed" and before.get("status") != "completed"
    )
    base_due = before.get("due_date")
    recurrence = before.get("recurrence")
    if (
        transitioned_to_completed
        and recurrence in ("daily", "weekly", "monthly")
        and isinstance(base_due, datetime)
    ):
        update["status"] = "pending"
        # Record when the user actually pressed complete — matches what "today"
        # means in mobile lists, especially for late completions.
        update["last_completed_at"] = datetime.now(timezone.utc)
        update["due_date"] = _next_due_date(base_due, recurrence)

    doc = await db.todos.find_one_and_update(
        {"_id": oid, "user_id": user_id},
        {"$set": update},
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
    return _to_out(doc)


async def delete_todo(db: AsyncIOMotorDatabase, user_id: ObjectId, todo_id: str) -> None:
    oid = _parse_oid(todo_id)
    result = await db.todos.delete_one({"_id": oid, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")


async def uncomplete_todo(
    db: AsyncIOMotorDatabase, user_id: ObjectId, todo_id: str
) -> TodoOut:
    """Revert the most recent bump-in-place on a recurring task: due_date moves
    one interval backwards and last_completed_at is cleared."""
    oid = _parse_oid(todo_id)
    doc = await db.todos.find_one({"_id": oid, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
    recurrence = doc.get("recurrence")
    base_due = doc.get("due_date")
    if (
        recurrence not in ("daily", "weekly", "monthly")
        or not isinstance(base_due, datetime)
        or not doc.get("last_completed_at")
    ):
        # Nothing to revert; return as-is.
        return _to_out(doc)
    reverted_due = _prev_due_date(base_due, recurrence)
    updated = await db.todos.find_one_and_update(
        {"_id": oid, "user_id": user_id},
        {
            "$set": {
                "due_date": reverted_due,
                "last_completed_at": None,
                "status": "pending",
                "updated_at": datetime.now(timezone.utc),
            }
        },
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
    return _to_out(updated)

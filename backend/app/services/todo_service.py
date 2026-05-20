from datetime import datetime, timezone

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


def _to_out(doc: dict) -> TodoOut:
    return TodoOut(
        id=str(doc["_id"]),
        user_id=str(doc["user_id"]),
        title=doc["title"],
        description=doc.get("description"),
        status=doc["status"],
        priority=doc["priority"],
        due_date=doc.get("due_date"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


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
    if not update:
        return await get_todo(db, user_id, todo_id)
    update["updated_at"] = datetime.now(timezone.utc)
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

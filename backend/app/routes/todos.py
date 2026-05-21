from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.deps import get_current_user
from app.db.mongo import get_db
from app.schemas.todo import (
    TodoCreate,
    TodoOut,
    TodoPriority,
    TodoStatus,
    TodoUpdate,
)
from app.services.todo_service import (
    create_todo,
    delete_todo,
    get_todo,
    list_todos,
    uncomplete_todo,
    update_todo,
)

router = APIRouter(prefix="/todos", tags=["todos"])


@router.get("", response_model=list[TodoOut])
async def list_user_todos(
    status_filter: TodoStatus | None = Query(default=None, alias="status"),
    priority_filter: TodoPriority | None = Query(default=None, alias="priority"),
    q: str | None = Query(default=None, max_length=200),
    sort: str = Query(default="created_desc"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[TodoOut]:
    return await list_todos(
        db,
        user_id=current_user["_id"],
        status_filter=status_filter,
        priority_filter=priority_filter,
        q=q,
        sort=sort,
    )


@router.post("", response_model=TodoOut, status_code=status.HTTP_201_CREATED)
async def create_user_todo(
    payload: TodoCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> TodoOut:
    return await create_todo(db, user_id=current_user["_id"], payload=payload)


@router.get("/{todo_id}", response_model=TodoOut)
async def get_user_todo(
    todo_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> TodoOut:
    return await get_todo(db, user_id=current_user["_id"], todo_id=todo_id)


@router.put("/{todo_id}", response_model=TodoOut)
async def update_user_todo(
    todo_id: str,
    payload: TodoUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> TodoOut:
    return await update_todo(db, user_id=current_user["_id"], todo_id=todo_id, payload=payload)


@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_todo(
    todo_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> None:
    await delete_todo(db, user_id=current_user["_id"], todo_id=todo_id)


@router.post("/{todo_id}/uncomplete", response_model=TodoOut)
async def uncomplete_user_todo(
    todo_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> TodoOut:
    return await uncomplete_todo(db, user_id=current_user["_id"], todo_id=todo_id)

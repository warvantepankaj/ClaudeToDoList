from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class TodoStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"


class TodoPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class TodoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    status: TodoStatus = TodoStatus.pending
    priority: TodoPriority = TodoPriority.medium
    due_date: datetime | None = None


class TodoUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    status: TodoStatus | None = None
    priority: TodoPriority | None = None
    due_date: datetime | None = None


class TodoOut(BaseModel):
    id: str
    user_id: str
    title: str
    description: str | None = None
    status: TodoStatus
    priority: TodoPriority
    due_date: datetime | None = None
    created_at: datetime
    updated_at: datetime

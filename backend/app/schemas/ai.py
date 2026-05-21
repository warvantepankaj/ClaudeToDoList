from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


# ---------- /ai/parse-task ----------

class ParseTaskRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class ParsedTask(BaseModel):
    title: str = ""
    subtasks: list[str] = Field(default_factory=list)
    deadline: str = ""
    priority: Literal["low", "medium", "high", ""] = ""
    recurrence: Literal["daily", "weekly", "monthly", ""] = ""


# ---------- /ai/schedule-day ----------

class ScheduleTaskInput(BaseModel):
    title: str
    priority: Literal["low", "medium", "high"] | None = None
    deadline: str | None = None
    duration_minutes: int | None = None


class ScheduleDayRequest(BaseModel):
    tasks: list[ScheduleTaskInput] = Field(min_length=1, max_length=30)
    start_hour: int = Field(default=9, ge=0, le=23)
    end_hour: int = Field(default=18, ge=1, le=24)


class ScheduledSlot(BaseModel):
    time: str
    task: str


# ---------- /ai/chat ----------

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    context: dict[str, Any] | None = None


class ChatResponse(BaseModel):
    intent: str = ""
    response: str = ""
    actions: dict[str, Any] = Field(default_factory=dict)


# ---------- /ai/plan (smart scheduler) ----------

class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    text: str


class ExistingTask(BaseModel):
    title: str
    priority: Literal["low", "medium", "high"] | None = None
    due_date: str | None = None
    status: Literal["pending", "in_progress", "completed"] | None = None


class TimeRange(BaseModel):
    start_hour: int = Field(ge=0, le=23)
    end_hour: int = Field(ge=1, le=24)


class PlanRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation: list[ChatTurn] = Field(default_factory=list, max_length=20)
    existing_tasks: list[ExistingTask] = Field(default_factory=list, max_length=50)
    time_range: TimeRange | None = None


class TaskDraft(BaseModel):
    title: str
    priority: Literal["low", "medium", "high"] = "medium"
    deadline: str = ""
    recurrence: Literal["daily", "weekly", "monthly", ""] = ""


class ScheduleSlotDraft(BaseModel):
    time: str
    task: str
    priority: Literal["low", "medium", "high"] = "medium"


PlanType = Literal["question", "create_task", "create_tasks", "schedule"]


class PlanResponse(BaseModel):
    type: PlanType
    message: str = ""
    questions: list[str] = Field(default_factory=list)
    tasks: list[TaskDraft] = Field(default_factory=list)
    schedule: list[ScheduleSlotDraft] = Field(default_factory=list)

from __future__ import annotations

import json
import re
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_user
from app.schemas.ai import (
    ChatRequest,
    ChatResponse,
    ParsedTask,
    ParseTaskRequest,
    PlanRequest,
    PlanResponse,
    ScheduleDayRequest,
    ScheduledSlot,
)
from app.services.gemini_service import generate_json

router = APIRouter(prefix="/ai", tags=["ai"])


_PARSE_TASK_SYSTEM = (
    "You convert a single natural-language todo into structured data. "
    "Infer a short title (max 80 chars), a deadline as ISO-8601 date or datetime "
    "(empty string if absent), a priority from {{low, medium, high}} based on urgency "
    "and importance, and up to 5 atomic subtasks. Today is {today}. "
    "Never invent commitments not present in the input."
)

_PARSE_TASK_SCHEMA = (
    '{"title": string, "subtasks": string[], "deadline": string, '
    '"priority": "low"|"medium"|"high"|""}'
)


_SCHEDULE_SYSTEM = (
    "You produce a realistic day plan. Given a list of tasks with optional priority, "
    "deadline, and duration, return a chronological schedule between {start}:00 and "
    "{end}:00. Use HH:MM 24h time. Higher-priority and earlier-deadline tasks first. "
    "Allow short breaks if many tasks. Each task appears at most once."
)

_SCHEDULE_SCHEMA = '[{"time": "HH:MM", "task": string}]'


_CHAT_SYSTEM = (
    "You are a productivity assistant inside a todo app. Classify the user's intent "
    'as one of: "create_task", "list_tasks", "complete_task", "schedule", '
    '"summary", "smalltalk", "other". Reply briefly in `response`. '
    "In `actions`, include structured intent data the client can act on, e.g. "
    '{"task": {"title": "...", "priority": "..."}} for create_task, or '
    '{"filter": {"status": "pending"}} for list_tasks. Empty dict if none.'
)

_CHAT_SCHEMA = '{"intent": string, "response": string, "actions": object}'


_PLAN_SYSTEM = (
    "You are a planning assistant inside a todo app. Today is {today}.\n\n"
    "EVERY response MUST commit to one action `type`. NEVER reply with a bare "
    "acknowledgement like \"okay noted\", \"got it\", or \"sure\" — that is a "
    "failure mode. If you have no action to take, you MUST ask a question.\n\n"
    "TYPES (decide in this order):\n\n"
    "1) \"question\" — use when ANY critical info is missing:\n"
    "   • A task is named but has NO time/deadline (and isn't explicitly \"someday\").\n"
    "   • Multiple tasks listed without clear priority/ordering.\n"
    "   • Broad intent like \"plan my day\" without working hours.\n"
    "   Rules for questions:\n"
    "   • Reference the SPECIFIC task being discussed by name. Generic questions "
    "fail the user.\n"
    "   • If deadline missing → first question MUST ask \"When?\" / \"By when?\" "
    "/ \"What time?\".\n"
    "   • If priority unclear AND it matters (multiple tasks, or high-stakes "
    "language) → ask priority.\n"
    "   • 1-3 questions max. `questions` array MUST be non-empty when type=question.\n\n"
    "2) \"create_task\" — exactly ONE task, AND the user EXPLICITLY stated a "
    "time or deadline. Accept these as explicit:\n"
    "   • Clock times: \"at 10pm\", \"by 5\", \"at 14:30\"\n"
    "   • Named times: \"tonight\" (today 21:00), \"tomorrow morning\" (tomorrow 09:00), "
    "\"next Monday\", \"in 2 hours\"\n"
    "   • Explicit no-deadline statements: \"no deadline\", \"someday\", \"whenever\"\n"
    "   Default priority \"medium\" unless urgency words are used (\"urgent\", "
    "\"asap\", \"important\" → high; \"sometime\", \"eventually\" → low).\n"
    "   NEVER invent a deadline from silence. If the user did not state one, "
    "this is type=question, not type=create_task.\n\n"
    "3) \"create_tasks\" — multiple concrete tasks AND EACH task has an explicitly "
    "stated time/deadline. If any task is missing a time, switch to type=question.\n\n"
    "4) \"schedule\" — user explicitly wants a day plan AND you have working hours "
    "(from time_range or earlier turns) AND a clear list of tasks. Chronological, "
    "HH:MM 24h.\n\n"
    "EXAMPLES:\n"
    "User: \"Dinner at 10pm\"\n"
    "→ type=create_task, tasks=[{title:\"Dinner\", priority:\"medium\", "
    "deadline:\"<today>T22:00:00\"}], message=\"Added.\"\n\n"
    "User: \"I need to prepare a report\"\n"
    "→ type=question, questions=[\"When does the report need to be done?\", "
    "\"Is this high priority?\"]\n\n"
    "User: \"Play cricket\"  (no time given)\n"
    "→ type=question, questions=[\"When do you want to play cricket?\", "
    "\"Is it high priority?\"]\n\n"
    "User: \"Buy milk\"  (no time given)\n"
    "→ type=question, questions=[\"When do you want to buy milk?\", "
    "\"Is it high priority?\"]\n\n"
    "User: \"Laundry, gym, and code review\"\n"
    "→ type=question, questions=[\"When do you want each of these done?\", "
    "\"Which is most urgent?\"]\n\n"
    "User: \"Plan my day\" (no time_range yet)\n"
    "→ type=question, questions=[\"What are your working hours today?\", "
    "\"Any must-do tasks?\", \"Any fixed meetings?\"]\n\n"
    "Use conversation history to avoid re-asking answered questions. "
    "Use existing_tasks to avoid duplicates. Respect time_range as a hard constraint."
)

_PLAN_SCHEMA = (
    '{"type": "question"|"create_task"|"create_tasks"|"schedule", '
    '"message": string, '
    '"questions": string[], '
    '"tasks": [{"title": string, "priority": "low"|"medium"|"high", "deadline": string}], '
    '"schedule": [{"time": "HH:MM", "task": string, "priority": "low"|"medium"|"high"}]}'
)


# Detect whether the user's message contains ANY time/deadline language.
# Conservative: only matches words that strongly imply a time anchor.
_TIME_KEYWORDS = {
    "today", "tonight", "tomorrow", "yesterday",
    "morning", "afternoon", "evening", "night", "noon", "midnight",
    "asap", "urgent", "soon", "later", "eod", "now",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "weekend", "weekday",
    "january", "february", "march", "april", "june",
    "july", "august", "september", "october", "november", "december",
    "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec",
}
# Multi-word phrases. Match as substrings on lowercased message.
_TIME_PHRASES = (
    "next week", "this week", "next month", "this month",
    "next year", "in a few", "in an hour", "in a day",
    "by end of", "end of day", "before bed", "after lunch", "after dinner",
    "right now",
)
# Regex: clock times ("10pm", "10:30", "14:30") and relative offsets ("in 2 hours").
_TIME_REGEX = re.compile(
    r"\b\d{1,2}\s*(?::\d{2})?\s*(?:am|pm)\b"
    r"|\b\d{1,2}:\d{2}\b"
    r"|\bin\s+\d+\s*(?:min|mins|minute|minutes|hr|hrs|hour|hours|day|days|week|weeks|month|months)\b",
    re.IGNORECASE,
)


def _message_has_time(text: str) -> bool:
    if not text:
        return False
    low = text.lower()
    if _TIME_REGEX.search(low):
        return True
    if any(p in low for p in _TIME_PHRASES):
        return True
    tokens = re.findall(r"[a-z]+", low)
    return any(t in _TIME_KEYWORDS for t in tokens)


@router.post("/parse-task", response_model=ParsedTask)
async def parse_task(
    payload: ParseTaskRequest,
    _user: dict = Depends(get_current_user),
) -> ParsedTask:
    raw = await generate_json(
        system=_PARSE_TASK_SYSTEM.format(today=date.today().isoformat()),
        user=payload.text,
        schema_hint=_PARSE_TASK_SCHEMA,
        temperature=0.1,
        max_output_tokens=400,
    )
    if not isinstance(raw, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI returned non-object payload",
        )
    try:
        return ParsedTask(**raw)
    except Exception as exc:  # pydantic ValidationError
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI output failed validation: {exc}",
        ) from exc


@router.post("/schedule-day", response_model=list[ScheduledSlot])
async def schedule_day(
    payload: ScheduleDayRequest,
    _user: dict = Depends(get_current_user),
) -> list[ScheduledSlot]:
    user_msg = json.dumps(
        {"tasks": [t.model_dump(exclude_none=True) for t in payload.tasks]},
        ensure_ascii=False,
    )
    raw = await generate_json(
        system=_SCHEDULE_SYSTEM.format(start=payload.start_hour, end=payload.end_hour),
        user=user_msg,
        schema_hint=_SCHEDULE_SCHEMA,
        temperature=0.2,
        max_output_tokens=1500,
    )
    if not isinstance(raw, list):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI returned non-array payload",
        )
    try:
        return [ScheduledSlot(**slot) for slot in raw if isinstance(slot, dict)]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI output failed validation: {exc}",
        ) from exc


@router.post("/plan", response_model=PlanResponse)
async def plan(
    payload: PlanRequest,
    _user: dict = Depends(get_current_user),
) -> PlanResponse:
    user_msg = json.dumps(
        {
            "message": payload.message,
            "conversation": [t.model_dump() for t in payload.conversation],
            "existing_tasks": [t.model_dump(exclude_none=True) for t in payload.existing_tasks],
            "time_range": payload.time_range.model_dump() if payload.time_range else None,
        },
        ensure_ascii=False,
    )
    raw = await generate_json(
        system=_PLAN_SYSTEM.replace("{today}", date.today().isoformat()),
        user=user_msg,
        schema_hint=_PLAN_SCHEMA,
        temperature=0.2,
        max_output_tokens=900,
    )
    if not isinstance(raw, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI returned non-object payload",
        )
    try:
        result = PlanResponse(**raw)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI output failed validation: {exc}",
        ) from exc

    # Safety nets: the AI sometimes acknowledges without an actionable payload,
    # or invents a deadline the user never stated. Coerce those into useful
    # questions so the UI never shows a dead end and tasks aren't created
    # with hallucinated times.
    no_deadline_phrases = ("no deadline", "someday", "whenever", "anytime", "no rush")
    msg_lower = payload.message.lower()
    user_said_no_deadline = any(p in msg_lower for p in no_deadline_phrases)

    # Consider both the current message AND prior user turns when deciding
    # whether time info has been provided. The AI might be acting on a
    # deadline the user mentioned earlier in the conversation.
    user_text_blob = "\n".join(
        [payload.message] + [t.text for t in payload.conversation if t.role == "user"]
    )
    time_provided = _message_has_time(user_text_blob)

    # Use the user's own phrasing as a fallback task reference when the AI
    # didn't include one. Strip punctuation, cap length.
    msg_ref = payload.message.strip().strip(".!?,;:").lower()
    if len(msg_ref) > 60:
        msg_ref = msg_ref[:60].rstrip() + "…"
    if not msg_ref:
        msg_ref = "this"

    if result.type == "question" and not result.questions:
        result.questions = [
            f"When do you want to {msg_ref}?",
            "Is it high priority?",
        ]
    elif result.type in ("create_task", "create_tasks"):
        # Block creation if the user never provided time info and didn't
        # explicitly say "no deadline" — even if the AI invented a deadline.
        if not result.tasks:
            result.type = "question"
            result.message = ""
            result.questions = [
                f"When do you want to {msg_ref}?",
                "Is it high priority?",
            ]
        elif not user_said_no_deadline and not time_provided:
            ref = result.tasks[0].title.lower() if len(result.tasks) == 1 else "these tasks"
            result.type = "question"
            result.tasks = []
            result.message = ""
            result.questions = [
                f"When do you want to {ref}?",
                "Is it high priority?",
            ]
        elif not user_said_no_deadline and any(not t.deadline for t in result.tasks):
            missing = [t.title for t in result.tasks if not t.deadline]
            ref = missing[0].lower() if len(missing) == 1 else "these tasks"
            result.type = "question"
            result.tasks = []
            result.message = ""
            result.questions = [
                f"When do you want to {ref}?",
                "Is it high priority?",
            ]
    elif result.type == "schedule" and not result.schedule:
        result.type = "question"
        result.questions = [
            "What are your working hours today?",
            "Which tasks should I include?",
        ]
    return result


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    _user: dict = Depends(get_current_user),
) -> ChatResponse:
    user_msg = json.dumps(
        {"message": payload.message, "context": payload.context or {}},
        ensure_ascii=False,
    )
    raw = await generate_json(
        system=_CHAT_SYSTEM,
        user=user_msg,
        schema_hint=_CHAT_SCHEMA,
        temperature=0.3,
        max_output_tokens=400,
    )
    if not isinstance(raw, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI returned non-object payload",
        )
    try:
        return ChatResponse(**raw)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI output failed validation: {exc}",
        ) from exc

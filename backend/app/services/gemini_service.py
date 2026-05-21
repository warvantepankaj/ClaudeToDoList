"""Gemini 2.5 Flash integration.

Single entrypoint `generate_json` posts a strict-JSON prompt to the
Generative Language API and returns the parsed object. Callers pass the
system instruction + user payload; this module owns transport, parsing,
and error mapping.
"""
from __future__ import annotations

import json
import re
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.config import get_settings

_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

_JSON_FENCE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)


class GeminiError(Exception):
    pass


def _extract_text(payload: dict[str, Any]) -> str:
    try:
        candidate = payload["candidates"][0]
        parts = candidate["content"]["parts"]
    except (KeyError, IndexError, TypeError) as exc:
        raise GeminiError(f"Malformed Gemini response: {payload}") from exc
    text = "".join(p.get("text", "") for p in parts).strip()
    finish_reason = candidate.get("finishReason")
    if finish_reason == "MAX_TOKENS":
        raise GeminiError(
            "AI response was truncated — try fewer tasks or a shorter request."
        )
    if finish_reason == "SAFETY":
        raise GeminiError("AI response was blocked by safety filters.")
    return text


def _parse_json(text: str) -> Any:
    if not text:
        raise GeminiError("Empty AI response")
    fenced = _JSON_FENCE.search(text)
    if fenced:
        text = fenced.group(1)
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = min(
            (i for i in (text.find("{"), text.find("[")) if i != -1),
            default=-1,
        )
        end = max(text.rfind("}"), text.rfind("]"))
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError as exc:
                raise GeminiError(f"Could not parse JSON: {text!r}") from exc
        raise GeminiError(f"Could not parse JSON: {text!r}")


async def generate_json(
    *,
    system: str,
    user: str,
    schema_hint: str,
    temperature: float = 0.2,
    max_output_tokens: int = 512,
) -> Any:
    """Call Gemini and return parsed JSON. Raises HTTPException on failure."""
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY is not configured",
        )

    url = f"{_API_BASE}/{settings.GEMINI_MODEL}:generateContent"
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": settings.GEMINI_API_KEY,
    }
    body = {
        "system_instruction": {
            "parts": [{"text": f"{system}\n\nReturn STRICT JSON only matching: {schema_hint}\nNo prose. No markdown. No code fences."}]
        },
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_output_tokens,
            "responseMimeType": "application/json",
        },
    }

    try:
        async with httpx.AsyncClient(timeout=settings.GEMINI_TIMEOUT) as client:
            resp = await client.post(url, headers=headers, json=body)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini transport error: {exc}",
        ) from exc

    if resp.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini {resp.status_code}: {resp.text[:300]}",
        )

    try:
        text = _extract_text(resp.json())
        return _parse_json(text)
    except GeminiError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

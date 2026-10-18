"""Thin client for Sarvam AI chat and translation endpoints."""

import json
import os
import re

import httpx

SARVAM_BASE = "https://api.sarvam.ai"
SARVAM_MODEL = os.getenv("SARVAM_MODEL", "sarvam-105b")


def sarvam_enabled() -> bool:
    return bool(os.getenv("SARVAM_API_KEY"))


def _headers() -> dict[str, str]:
    return {
        "api-subscription-key": os.getenv("SARVAM_API_KEY", ""),
        "Content-Type": "application/json",
    }


def extract_json(text: str) -> dict:
    """Parse a JSON object from plain or markdown-wrapped model output."""
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in model output")
    return json.loads(text[start:end + 1])


async def sarvam_chat(
    system: str,
    user: str,
    *,
    json_mode: bool = False,
    max_tokens: int = 800,
    timeout: float = 15.0,
) -> str:
    body = {
        "model": SARVAM_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
        "max_tokens": max_tokens,
        "reasoning_effort": "low",
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            f"{SARVAM_BASE}/v1/chat/completions",
            headers=_headers(),
            json=body,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"].get("content") or ""
        return content.strip()


async def sarvam_translate(text: str, target: str = "hi-IN", source: str = "auto") -> str:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"{SARVAM_BASE}/translate",
            headers=_headers(),
            json={
                "input": text,
                "source_language_code": source,
                "target_language_code": target,
            },
        )
        response.raise_for_status()
        return response.json()["translated_text"]
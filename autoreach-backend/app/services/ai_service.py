import json
from typing import Any

from openai import AsyncOpenAI

from app.config import get_settings


SYSTEM_PROMPT = """You are an expert executive assistant. You will be given an original email sent by a user.
Your task is to draft a follow-up email that is polite, concise (under 4 sentences), and professional.
Guidelines:
1. Restructure the context -- do not copy-paste lines. Acknowledge they are busy.
2. Value add -- reiterate the core request smoothly (scheduling a meeting, checking an application status, etc.)
3. Tone -- confident, respectful, and short. Never passive-aggressive.
Output format strictly as JSON: { subject: string, body: string }"""


def build_user_prompt(original_body: str, recipient_name: str, tone: str, intent_tag: str) -> str:
    return (
        f"Recipient name: {recipient_name}\n"
        f"Requested tone: {tone}\n"
        f"Intent tag: {intent_tag}\n\n"
        f"Original email:\n{original_body}"
    )


def _parse_json_response(content: str) -> dict[str, str]:
    parsed: Any = json.loads(content)
    if not isinstance(parsed, dict):
        raise ValueError("OpenAI response must be a JSON object.")

    subject = parsed.get("subject")
    body = parsed.get("body")
    if not isinstance(subject, str) or not subject.strip():
        raise ValueError("OpenAI response JSON must include a non-empty subject string.")
    if not isinstance(body, str) or not body.strip():
        raise ValueError("OpenAI response JSON must include a non-empty body string.")

    return {"subject": subject.strip(), "body": body.strip()}


async def generate_follow_up(
    original_body: str,
    recipient_name: str,
    tone: str,
    intent_tag: str,
) -> dict:
    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.openai_api_key, timeout=10.0)

    response = await client.chat.completions.create(
        model=settings.openai_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_user_prompt(
                    original_body=original_body,
                    recipient_name=recipient_name,
                    tone=tone,
                    intent_tag=intent_tag,
                ),
            },
        ],
        temperature=0.4,
        max_tokens=300,
    )

    content = response.choices[0].message.content
    if content is None:
        raise ValueError("OpenAI returned an empty response.")

    draft = _parse_json_response(content)
    draft["tokens_used"] = response.usage.total_tokens if response.usage else 0
    return draft

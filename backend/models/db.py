"""Supabase context layer for the elder companion.

Direct Python port of server/deno/supabase.ts, adapted from ElatoAI's
users/personalities schema to the elders/medications/family_members schema.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from supabase import create_client, Client
import pytz


load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError("SUPABASE_URL or SUPABASE_SERVICE_KEY is not set")

_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def get_elder(elder_id: str) -> dict | None:
    """Fetch an elder profile, joined with their active medications and family members.

    Equivalent to Deno's getUserByEmail, but keyed by elder_id instead of email,
    and joining medications/family_members instead of personality/language.
    """
    result = (
        _client.table("elders")
        .select("*, medications(*), family_members(*)")
        .eq("elder_id", elder_id)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]


def get_chat_history(elder_id: str, limit: int = 20) -> list[dict]:
    """Fetch the most recent conversation turns for an elder.

    Equivalent to Deno's getChatHistory. No personality_key or isDoctor
    filtering here since this app has one companion per elder, not a
    marketplace of personalities.
    """
    try:
        result = (
            _client.table("conversations")
            .select("*")
            .eq("elder_id", elder_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return list(reversed(result.data))  # oldest-first, matches conversational order
    except Exception:
        return []

def get_recent_summaries(elder_id: str, limit: int = 5) -> list[dict]:
    """Fetch the most recent past-session summaries for an elder."""
    result = (
        _client.table("conversation_summaries")
        .select("*")
        .eq("elder_id", elder_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return list(reversed(result.data))  # oldest-first


def summarize_session(elder_id: str, session_id: str) -> str | None:
    """Summarize one finished session's turns and save it to conversation_summaries."""
    result = (
        _client.table("conversations")
        .select("*")
        .eq("elder_id", elder_id)
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
    )
    turns = result.data
    if not turns:
        return None

    transcript = "\n".join(f"{t['role']}: {t['content']}" for t in turns)

    from openai import OpenAI
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "Summarize this conversation between an elderly person and their "
                    "AI companion in 2-3 short sentences, in Macedonian. Focus on what "
                    "was discussed and anything worth remembering next time."
                ),
            },
            {"role": "user", "content": transcript},
        ],
        max_tokens=150,
    )
    summary_text = response.choices[0].message.content.strip()

    _client.table("conversation_summaries").insert(
        {"elder_id": elder_id, "session_id": session_id, "summary_text": summary_text}
    ).execute()

    return summary_text

def compose_chat_history(history: list[dict]) -> str:
    """Turn a list of conversation rows into a single text block for the prompt.

    Equivalent to Deno's composeChatHistory.
    """
    lines = [
        f"{turn['role']} [{turn['created_at']}]: {turn['content']}"
        for turn in history
    ]
    return "\n".join(lines)


def _format_medications(medications: list[dict]) -> str:
    active = [m for m in medications if m.get("active")]
    if not active:
        return "No medications on file."
    lines = []
    for m in active:
        times = ", ".join(m.get("times_of_day") or [])
        dosage = f" ({m['dosage']})" if m.get("dosage") else ""
        lines.append(f"- {m['name']}{dosage} at {times or 'unspecified times'}")
    return "\n".join(lines)


def _format_family(family_members: list[dict]) -> str:
    if not family_members:
        return "No family members on file."
    lines = []
    for f in family_members:
        relation = f" ({f['relation']})" if f.get("relation") else ""
        notes = f" — {f['notes']}" if f.get("notes") else ""
        lines.append(f"- {f['name']}{relation}{notes}")
    return "\n".join(lines)


def create_first_message(elder: dict) -> str:
    """Equivalent to Deno's createFirstMessage."""
    if elder.get("first_message_prompt"):
        return f"Always start the conversation following these instructions: {elder['first_message_prompt']}"
    return (
        "Greet the person briefly for the time of day (good morning/afternoon/evening) "
        "and ask how you can help. One short sentence only — do not introduce yourself "
        "or explain who you are, they already know."
    )


def create_system_prompt(elder: dict, chat_history: list[dict]) -> str:
    """Build the full system prompt: tone + medications + family + chat history + time.

    Equivalent to Deno's createSystemPrompt, minus the story-mode / user_type
    branching (not needed — one companion type here, not a character marketplace).
    Keep responses short — 1 to 2 sentences for most exchanges, like a natural spoken 
    conversation. Only give a longer, more detailed answer when telling a story, 
    explaining something the person asked about in depth, or when they ask for more detail. 
    If asked the time or day, answer naturally using this: {local_time}
    """
    summaries_str = "\n".join(f"- {s['summary_text']}" for s in summaries) or "No past conversations yet."
    medications_str = _format_medications(elder.get("medications") or [])
    family_str = _format_family(elder.get("family_members") or [])

    now = datetime.now(pytz.timezone("Europe/Skopje"))
    local_datetime_str = now.strftime("%A, %d %B %Y, %H:%M")
    weather_str = "Weather data unavailable."

    if elder.get("location_lat") and elder.get("location_lon"):
        weather = get_weather(elder["location_lat"], elder["location_lon"])
        weather_str = format_weather_for_prompt(weather)

    location_str = elder.get("location_name") or "unknown"

    return f"""
You are a warm, patient AI companion for {elder['name']}, age {elder.get('age', 'unknown')}.

Your tone should be: {elder.get('tone_description') or 'warm, patient, and simple to understand'}.

The default language is {elder.get('language_code', 'mk-MK')}, but switch languages if the user asks.

Medications to know about (you can remind {elder['name']} what to take and when, if asked):
{medications_str}

Family members {elder['name']} may talk about:
{family_str}

Current date and time: {local_datetime_str}
Location: {location_str}
Current weather: {weather_str}

Do not ask for sensitive personal or financial information.
Keep responses short — 1 to 2 sentences for most exchanges, like a natural spoken
conversation. Only give a longer answer when explaining something in depth or when
asked for more detail.

Summary of recent past conversations (for your context only — don't recite this back):
{summaries_str}
"""


def add_conversation_turn(elder_id: str, role: str, content: str, session_id: str | None = None) -> None:
    """Insert one conversation turn, tagged with the session it belongs to."""
    row = {"elder_id": elder_id, "role": role, "content": content}
    if session_id:
        row["session_id"] = session_id
    _client.table("conversations").insert(row).execute()


# ============================================================
# Pipeline hook: captures transcripts/replies as they flow through,
# saves each to `conversations`. Insert one instance after STT and
# one instance after TTS in the pipeline (see voice_pipeline.py).
# ============================================================
from pipecat.frames.frames import Frame, TranscriptionFrame, TTSTextFrame
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor


class ConversationLogger(FrameProcessor):
    def __init__(self, elder_id: str | None, session_id: str | None = None):
        super().__init__()
        self._elder_id = elder_id
        self._session_id = session_id

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        if self._elder_id:
            if isinstance(frame, TranscriptionFrame) and frame.text.strip():
                add_conversation_turn(self._elder_id, "user", frame.text, self._session_id)
            elif isinstance(frame, TTSTextFrame) and frame.text.strip():
                add_conversation_turn(self._elder_id, "assistant", frame.text, self._session_id)
        await self.push_frame(frame, direction)

def get_elder_id_by_mac(mac_address: str) -> str | None:
    """Look up which elder a physical device belongs to, by MAC address."""
    result = (
        _client.table("devices")
        .select("elder_id")
        .eq("mac_address", mac_address)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]["elder_id"]
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
from weather import get_weather, format_weather_for_prompt
from loguru import logger
from datetime import datetime, time, timedelta, timezone
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError("SUPABASE_URL or SUPABASE_SERVICE_KEY is not set")

_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

_pending_reminder_texts: dict[str, set[str]] = {}

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

# def get_recent_summaries(elder_id: str, limit: int = 10) -> list[dict]:
#     """Fetch the most recent past-session summaries for an elder."""
#     result = (
#         _client.table("conversation_summaries")
#         .select("*")
#         .eq("elder_id", elder_id)
#         .order("created_at", desc=True)
#         .limit(limit)
#         .execute()
#     )
#     return list(reversed(result.data))  # oldest-first

def get_due_reminders(now: datetime) -> list[dict]:
    """Find active reminders scheduled for the current minute that haven't fired today."""
    current_time = now.strftime("%H:%M:00")
    current_day = now.strftime("%a").lower()[:3]
    today = now.date().isoformat()

    result = (
        _client.table("reminders")
        .select("*")
        .eq("active", True)
        .eq("time_of_day", current_time)
        .execute()
    )
    return [
        r for r in result.data
        if current_day in (r.get("days_of_week") or []) and r.get("last_triggered_date") != today
    ]


def mark_reminder_triggered(reminder_id: str, now: datetime) -> None:
    """Record that a reminder fired today, so it doesn't fire again until tomorrow."""
    _client.table("reminders").update(
        {"last_triggered_date": now.date().isoformat()}
    ).eq("reminder_id", reminder_id).execute()

def summarize_session(elder_id: str, session_id: str) -> str | None:
    """Summarize one finished session and save its summary and wellbeing signal."""
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

    elder = get_elder(elder_id)
    name = elder["name"] if elder else "корисникот"
    gender = (elder or {}).get("gender")

    if gender == "female":
        gender_rule = "Личноста е од женски род. Користи женски род за сите глаголи, придавки и заменки (таа, нејзин, ѝ, неа)."
    elif gender == "male":
        gender_rule = "Личноста е од машки род. Користи машки род за сите глаголи, придавки и заменки (тој, негов, му, него)."
    else:
        gender_rule = "Родот не е познат — избегнувај заменки, користи само името."

    transcript = "\n".join(f"{t['role']}: {t['content']}" for t in turns)

    system_prompt = f"""Сумираш разговор меѓу {name} и неговиот/нејзиниот дигитален придружник.

Врати САМО JSON во оваа форма, без друг текст пред или после:
{{"summary": "...", "mood": "neutral"}}

Правила за "summary":
- Природен, течен, разговорен македонски јазик. Точно 1 до 3 кратки реченици со најважните факти поврзани со корисникот и тоа што го кажал од разговорот
- Секогаш го користиш името {name}. НИКОГАШ не пишуваш „старец", „старица", „постар човек", „возрасна личност" или слично.
- {gender_rule}
- Запиши САМО факти од разговорот — што било кажано, споменато или направено.
- Никогаш не пишувај совети или препораки. Без реченици како „Важно е...", „Треба да се обрне внимание...", „Следниот пат би можело...".

Правила за "mood" — точно една од трите вредности:
- "neutral" — обичен, секојдневен разговор, без силно изразени чувства. ОВА Е НАЈЧЕСТИОТ ИЗБОР — користи го кога немаш јасен знак за спротивното.
- "positive" — личноста изразува радост, задоволство или силно добро расположение, не само љубезен тон.
- "concerning" — личноста изразува тага, осаменост, збунетост, болка, страв или вознемиреност.

Не бирај "positive" само затоа што разговорот бил пријатен или личноста била љубезна — тоа е "neutral"."""

    from openai import OpenAI
    import json

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": transcript},
        ],
        max_tokens=250,
        response_format={"type": "json_object"},
    )

    parsed = json.loads(response.choices[0].message.content)

    summary_text = parsed.get("summary", "").strip()
    mood = parsed.get("mood", "neutral")

    if mood not in {"positive", "neutral", "concerning"}:
        mood = "neutral"

    embedding = _embed_text(summary_text)

    _client.table("conversation_summaries").insert(
        {
            "elder_id": elder_id,
            "session_id": session_id,
            "summary_text": summary_text,
            "mood": mood,
            "embedding": embedding,
        }
    ).execute()

    try:
        skopje_tz = pytz.timezone("Europe/Skopje")
        local_date = datetime.now(skopje_tz).date()

        summarize_daily_activity(
            elder_id=elder_id,
            target_date=local_date,
        )

    except Exception as e:
        logger.exception(
            "Failed to update daily caregiver digest for elder {}: {}",
            elder_id,
            e,
        )

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
        return f"Секогаш почни го разговорот следејќи ги овие инструкции: {elder['first_message_prompt']}"
    return (
        "Поздрави ја пострата личност со краток поздрав според делот од денот (добро утро/ добар ден/добра вечер)"
        " и прашај како можеш да помогнеш. Само една кратка реченица — не се претставувај"
        " или објаснувај кој си, тие веќе знаат."
    )


def create_system_prompt(elder: dict) -> str:
    """Build the full system prompt: tone + medications + family + chat history + time.

    Equivalent to Deno's createSystemPrompt, minus the story-mode / user_type
    branching (not needed — one companion type here, not a character marketplace).
    Keep responses short — 1 to 2 sentences for most exchanges, like a natural spoken 
    conversation. Only give a longer, more detailed answer when telling a story, 
    explaining something the person asked about in depth, or when they ask for more detail. 
    If asked the time or day, answer naturally using this: {local_time}
    """
    # summaries_str = "\n".join(f"- {s['summary_text']}" for s in summaries) or "No past conversations yet."
    medications_str = _format_medications(elder.get("medications") or [])
    family_str = _format_family(elder.get("family_members") or [])

    now = datetime.now(pytz.timezone("Europe/Skopje"))
    local_datetime_str = now.strftime("%A, %d %B %Y, %H:%M")
    weather_str = "Weather data unavailable."

    if elder.get("location_lat") and elder.get("location_lon"):
        weather = get_weather(elder["location_lat"], elder["location_lon"])
        weather_str = format_weather_for_prompt(weather)
        
    logger.info("LAT: {}", elder.get("location_lat"))
    logger.info("LON: {}", elder.get("location_lon"))
    logger.info("WEATHER: {}", weather_str)

    location_str = elder.get("location_name") or "unknown"

    gender_note = ""
    if elder.get("gender") == "female":
        gender_note = f"{elder['name']} е жена. Секогаш обраќај се во женски род (таа, нејзин, ѝ)."
    elif elder.get("gender") == "male":
        gender_note = f"{elder['name']} е маж. Секогаш обраќај се во машки род (тој, негов, му)."

    return f"""
    Ти си топол, трпелив дигитален придружник на {elder['name']}, {elder.get('age', 'непозната возраст')} години.

    Твојот тон треба да биде: {elder.get('tone_description') or 'топол, трпелив и едноставен за разбирање'}.

    {gender_note}

    Зборувај на природен, разговорен и литературен македонски јазик — онака како што зборува човек во секојдневен разговор, никогаш како преведен или книжевен текст. Ако {elder['name']} почне да зборува на друг јазик, 
    префрли се на тој јазик.

    Лекови за кои треба да знаеш (можеш да го/ја потсетиш {elder['name']} што и кога да земе, ако прашa, но не давај медицински совети и кажи ги колчините и времето во нормал формат, не во медицински термини):
    {medications_str}

    Членови на семејството за кои {elder['name']} може да спомене:
    {family_str}

    Тековен датум и време: {local_datetime_str}
    Локација: {location_str}
    Тековно време (временски услови): {weather_str}

    Не барај чувствителни лични или финансиски информации.
    Одговарај кратко — 1 до 2 реченици за повеќето размени, како природен говорен разговор.
    Само кога објаснуваш нешто подетално, ако раскажуваш за нешто или {elder['name']} бара повеќе детали, дозволен е подолг одговор.
    Ако во текстот има знак како степени, или други специјални знаци, или кратенки кои вои нормалниот јазик се изговараат целосно, замени ги со зборот како што се изговараат. На пример, 20° → 20 степени, 3D → три димензионално, 1/2 → половина, итн., но бројките пишувај ги со цифри, не со зборови.

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
    def __init__(
        self,
        elder_id: str | None,
        session_id: str | None = None,
        context=None,
    ):
        super().__init__()
        self._elder_id = elder_id
        self._session_id = session_id
        self._context = context
        
    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if self._elder_id:
            if isinstance(frame, TranscriptionFrame) and frame.text.strip():
                add_conversation_turn(self._elder_id, "user", frame.text, self._session_id)
            elif isinstance(frame, TTSTextFrame) and frame.text.strip():
                pending = _pending_reminder_texts.get(self._elder_id, set())
                if frame.text in pending:
                    pending.discard(frame.text)
                    logger.info("Skipped logging reminder text for elder {}", self._elder_id)
                else:
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

def _embed_text(text: str) -> list[float]:
    """Create an embedding for semantic memory retrieval."""
    from openai import OpenAI

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )

    return response.data[0].embedding

def get_similar_summaries(
    elder_id: str,
    query_text: str,
    k: int = 5,
) -> list[dict]:
    """Retrieve the most semantically relevant past conversation summaries."""
    query_embedding = _embed_text(query_text)

    result = _client.rpc(
        "match_summaries",
        {
            "query_embedding": query_embedding,
            "match_elder_id": elder_id,
            "match_count": k,
        },
    ).execute()

    summaries = result.data or []

    # Keep only memories that are sufficiently relevant.
    return [
        summary
        for summary in summaries
        if summary.get("similarity", 0) >= 0.70
    ]

def get_daily_summaries(
    elder_id: str,
    target_date: datetime.date,
) -> list[dict]:
    """Fetch all session summaries for an elder on a specific local date."""

    tz = pytz.timezone("Europe/Skopje")

    # Start and end of the selected day in Skopje.
    start_local = tz.localize(
        datetime.combine(target_date, time.min)
    )
    end_local = start_local + timedelta(days=1)

    # Convert boundaries to UTC for the Supabase query.
    start_utc = start_local.astimezone(timezone.utc).isoformat()
    end_utc = end_local.astimezone(timezone.utc).isoformat()

    result = (
        _client.table("conversation_summaries")
        .select("*")
        .eq("elder_id", elder_id)
        .gte("created_at", start_utc)
        .lt("created_at", end_utc)
        .order("created_at")
        .execute()
    )

    return result.data or []

def summarize_daily_activity(
    elder_id: str,
    target_date: datetime.date,
) -> dict | None:
    """Generate or update the caregiver's daily digest."""

    import json
    from openai import OpenAI

    summaries = get_daily_summaries(elder_id, target_date)

    if not summaries:
        logger.info(
            "No summaries found for elder {} on {}",
            elder_id,
            target_date,
        )
        return None

    elder = get_elder(elder_id)
    if not elder:
        logger.warning("Elder {} not found", elder_id)
        return None

    elder_name = elder["name"]

    summaries_text = "\n".join(
        f"- {summary['summary_text']}"
        for summary in summaries
    )

    system_prompt = f"""
Ти создаваш краток дневен преглед за овластен негувател, врз основа на резимеата од
 разговорите на {elder_name} со дигиталниот придружник Паметен Пријател.
   Датум: {target_date.isoformat()} Број на разговори: {len(summaries)}
     Врати САМО валиден JSON во следнава форма: {{ "highlights": "...", "activities": [], "wellbeing_observations": [] }} 
     Правила:
        ОПШТО:
    - Пиши на природен, јасен и едноставен македонски јазик. 
    - Користи го името {elder_name} кога е природно, но не го повторувај непотребно. 
    - Обедини ги информациите од сите разговори во еден дневен преглед. 
    - Ако истата информација се појавува повеќе пати, спомни ја само еднаш. 
    - Не измислувај информации што не се присутни во резимеата. 
    - Не претпоставувај чувства, активности, планови или настани. 
    - Не поставувај медицински или психолошки дијагнози. 
    - Не претворај обична тема во предупредување. 
    - Не вклучувај непотребни интимни или чувствителни детали. 
        HIGHLIGHTS: 
    - Напиши 2 до 4 кратки реченици, во зависност од количината на информации, со најважните факти од денот. 
    - Вклучи ги најважните информации од денот. 
    - Комбинирај ги состојбата, значајните активности и важните теми од разговорите. 
    - Не испуштај конкретни и корисни детали само затоа што се појавиле во еден разговор. 
    - На пример, ако лицето споменало дека било во продавница, купило овошје и зеленчук и разговарало за вечера со компири и моркови,
      овие информации може да бидат дел од дневниот преглед. 
      ACTIVITIES: - Стави кратки, конкретни активности или теми што се појавиле во разговорите. 
      - Вклучи активности како посета на продавница, средба или разговор со семејството, готвење, прошетка, гледање телевизија, хобија или други активности само ако се експлицитно споменати. 
      - Може да вклучиш и практични теми за кои лицето разговарало, ако се релевантни за дневниот контекст. 
      - Не додавај активности што само ги планирало лицето, освен ако е јасно дека планот е важен дел од разговорот. 
      - Секоја ставка нека биде кратка и јасна. WELLBEING_OBSERVATIONS: 
      - Вклучи само директно изразени чувства или состојби, како „се чувствува добро“, „била малку уморна“, „била загрижена“ или „била расположена“. 
      - Не прави медицински или психолошки заклучоци. - Не користи дијагнози или клинички термини. 
      - Не извлекувај заклучоци само од темата на разговорот. 
      - Ако нема јасна информација за расположението или состојбата, врати празна листа. Ако нема доволно информации за одредена секција, врати празна листа или празен стринг за таа секција.
"""

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": summaries_text},
        ],
        max_tokens=500,
        response_format={"type": "json_object"},
    )

    parsed = json.loads(response.choices[0].message.content)

    highlights = parsed.get("highlights", "").strip()
    activities = parsed.get("activities", [])
    wellbeing = parsed.get("wellbeing_observations", [])

    digest_data = {
        "elder_id": elder_id,
        "digest_date": target_date.isoformat(),
        "digest_text": highlights,
        "activities": activities,
        "wellbeing_observations": wellbeing,
        "conversation_count": len(summaries),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    result = (
        _client.table("daily_caregiver_digests")
        .upsert(
            digest_data,
            on_conflict="elder_id,digest_date",
        )
        .execute()
    )

    logger.info(
        "Daily digest generated for elder {} on {}",
        elder_id,
        target_date,
    )

    return result.data[0] if result.data else None
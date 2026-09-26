# ElderlyCompanion Backend

The `backend` directory contains the FastAPI and Pipecat backend responsible for real-time voice processing, AI responses, conversational memory, database interaction, and communication with the browser and ESP32 device.

## Architecture

```text
Browser / ESP32
       │
    WebSocket
       │
       ▼
FastAPI + Pipecat
       │
   ┌───┼───┐
   ▼   ▼   ▼
  STT  LLM  TTS
       │
       ▼
Supabase / PostgreSQL
       │
    pgvector
```

## Voice Pipeline

```text
Audio
  ↓
STT
  ↓
Elder + Conversation Context
  ↓
Semantic Memory Retrieval
  ↓
LLM
  ↓
TTS
  ↓
Browser / ESP32
```

The backend provides the LLM with relevant elder information, current conversation context, and semantically relevant memories from previous conversations.

### AI Providers

| Component  | Current Provider                                     |
| ---------- | ---------------------------------------------------- |
| STT        | `h-gajdov/whisper_full_finetune_all_dialects_lr1e-5` |
| LLM        | OpenAI `gpt-4o`                                      |
| TTS        | Microsoft Edge TTS — `mk-MK-MarijaNeural`            |
| Embeddings | OpenAI `text-embedding-3-small`                      |

Providers are separated through a provider-registry structure so they can be changed independently.

## Memory and Summaries

The backend uses two levels of conversation memory:

* **Session memory** — keeps the current conversation context available to the LLM.
* **Long-term memory** — completed conversations are summarized, embedded, and stored in `pgvector`. Relevant memories are retrieved during future conversations.

After a session ends, the backend also generates a conversation summary. These summaries are later used to generate daily caregiver digests.

## WebSocket Routes

```text
/ws/browser
/ws/esp32
```

The browser route handles web-based voice conversations. The ESP32 route handles audio communication with the physical device, including its audio transport and encoding/decoding.

## Project Structure

```text
backend/
│
├── bot.py
├── server.py
├── voice_pipeline.py
├── esp32_transport.py
├── scheduler.py
│
└── models/
    ├── db.py
    ├── llm/
    ├── stt/
    └── tts/
```

### Main Files

* `server.py` — FastAPI application and WebSocket routes.
* `bot.py` — Pipecat conversation session management.
* `voice_pipeline.py` — STT → LLM → TTS pipeline and memory retrieval.
* `esp32_transport.py` — ESP32 audio transport.
* `models/db.py` — database operations.
* `models/llm/`, `models/stt/`, `models/tts/` — AI provider implementations.

## Database

The backend uses Supabase/PostgreSQL for application data and `pgvector` for semantic memory.

Main tables used by the backend include:

```text
elders
caregiver_profiles
elder_caregivers
medications
family_members
conversations
conversation_summaries
daily_caregiver_digests
devices
```

## Configuration

Backend configuration is provided through environment variables:

```env
OPENAI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

STT_PROVIDER=...
LLM_PROVIDER=...
TTS_PROVIDER=...

ESP32_INPUT_SAMPLE_RATE=16000
AUDIO_OUTPUT_SAMPLE_RATE=24000
```

## Based on ElatoAI

The backend was initially based on parts of the FastAPI/Pipecat architecture and ESP32 communication from [ElatoAI](https://github.com/akdeb/ElatoAI).

It has since been adapted and extended with Macedonian AI providers, elder context, conversational memory, semantic retrieval, summaries, caregiver digests, and scheduled processing.

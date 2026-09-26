# ElderlyCompanion

ElderlyCompanion is a voice-first AI companion built for elderly people, designed to be spoken to naturally in Macedonian. It combines a web application, a real-time voice pipeline, conversational memory, and an ESP32-based physical device to give elderly users a simple, low-friction way to talk to an AI companion — and gives the family members who care for them visibility into how their loved one is doing.

The project is built on top of the open-source [ElatoAI](https://github.com/akdeb/ElatoAI) platform, substantially restructured and extended.

## Who the app is for

The app has two roles:

- **Caregiver** — a family member who creates and manages one or more elder profiles: medications, family members, plus a daily digest of how conversations have gone.
- **Elder** — the person the companion is for. An elder's profile can be either:
  - **Caregiver-managed** — set up and maintained by a family member; the elder never needs to log in, they simply talk to the companion.
  - **Self-managed** — the elder registers their own account and manages their own medications, family members, and profile directly.

Self-managed elders do **not** see their own conversation summaries or mood/wellbeing data.

## Features

- 🎙️ **Natural voice conversations** — speak to the companion through a browser or the physical ESP32 device.
- 🗣️ **Native Macedonian language support** — prompts, summaries, and spoken responses are built to sound like natural conversational Macedonian, not translated text.
- 🧠 **Two-layer conversational memory** — recency-based context (recent conversation summaries) plus per-turn semantic retrieval (pgvector similarity search) so the companion can recall relevant details from any past conversation, not just the last one.
- 👤 **Elder profiles** — name, age, gender, tone preferences, location, and language.
- 💊 **Medications** — structured tracking (name, dosage, times of day).
- 👨‍👩‍👧 **Family members** — names, relations, and notes the companion can naturally reference in conversation.
- 🌤️ **Context-aware responses** — live date, time, weather, and location are included in every conversation.
- 📝 **Conversation summaries & daily digests** — each finished conversation is summarized and mood-tagged, then rolled up into a daily digest for caregivers.
- 📱 **Web application** — caregivers manage everything through a Next.js app; elders talk through a simple, minimal voice-first interface.
- 🔊 **Physical voice device** — an ESP32 with a dedicated microphone and speaker, so the elder never needs a phone or computer to talk to their companion.

## How It Works

```text
                    ┌─────────────────────┐
                    │   Web Application   │
                    │       Next.js       │
                    └──────────┬──────────┘
                               │
                               │ WebSocket
                               │
                    ┌──────────▼──────────┐
                    │    Backend Server   │
                    │  FastAPI + Pipecat  │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┼─────────────┐
                 │             │             │
                 ▼             ▼             ▼
              Speech          LLM           TTS
               (STT)       Processing      (Voice)
                 │             │             │
                 └─────────────┼─────────────┘
                               │
                    ┌──────────▼──────────┐
                    │      Supabase       │
                    │ Database + Vector   │
                    │      Memory         │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    ESP32 Device     │
                    │ Microphone + Speaker│
                    └─────────────────────┘
```

### AI Models

| Component      | Model / Provider                                     | Purpose                                                                                 |
| -------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **STT**        | `h-gajdov/whisper_full_finetune_all_dialects_lr1e-5` | Fine-tuned Whisper model selected for its Macedonian and dialect transcription quality. |
| **LLM**        | OpenAI `gpt-4o`                                 | Conversational responses, memory-aware reasoning, summaries, and caregiver digests.     |
| **TTS**        | Microsoft Edge TTS — `mk-MK-MarijaNeural`            | Natural Macedonian speech generation.                                                   |
| **Embeddings** | OpenAI `text-embedding-3-small`                      | Semantic retrieval of past conversations using pgvector.                                |

The models are configurable through the backend provider registry, allowing different models and providers to be tested or replaced independently.


### Conversation flow

1. The elder starts talking, through the browser or the ESP32 device.
2. Audio is streamed to the backend and transcribed by the configured STT provider.
3. On each turn, the system retrieves semantically relevant past conversation summaries and injects them alongside recent-session context.
4. The LLM generates a response grounded in the elder's profile, medications, family, current date/time/weather, and retrieved memory.
5. The response is spoken back using the configured TTS provider.
6. The full conversation is logged; once the session ends, it's summarized and mood-tagged in the background.
7. Summaries roll up into a daily digest that caregivers see on the elder's dashboard.

## Technology Stack

### Frontend
- Next.js, React, TypeScript
- Tailwind CSS
- Supabase (auth + data)

### Backend
- Python, FastAPI
- Pipecat (real-time voice pipeline framework)
- WebSockets
- OpenAI (LLM)
- Configurable STT/TTS providers (Whisper, Edge TTS, and others via a provider-registry pattern)

### Database & Memory
- Supabase / PostgreSQL
- pgvector for semantic similarity search over conversation summaries

### Hardware
- ESP32 (WROOM-32)
- INMP441 I2S MEMS microphone
- MAX98357A I2S Class-D amplifier
- 3W 8Ω speaker

## Project Structure

```text
ElderlyCompanion/
│
├── backend/
│   ├── models/            # DB access, provider registries (STT/TTS/LLM), weather
│   ├── bot.py             # Pipecat pipeline orchestration per session
│   ├── server.py          # FastAPI app, websocket routes (browser, ESP32, device-observer)
│   ├── voice_pipeline.py  # STT → LLM → TTS pipeline construction, memory retrieval
│   └── esp32_transport.py # ESP32-specific websocket transport (Opus encode/decode)
│
├── frontend/
│   ├── app/                # Next.js routes: caregiver/*, elder/*, login/*
│   ├── components/         # Shared UI: ElderDashboard, VoiceChat, DeviceVoiceChat, auth forms
│   ├── db/                 # Supabase query helpers
│   └── utils/
│
└── firmware-arduino/
    ├── src/                # ESP32 firmware: WiFi, websocket client, I2S audio I/O
    ├── platformio.ini
```

## Database Schema (Supabase / PostgreSQL)

| Table | Purpose |
|---|---|
| `elders` | Elder profile: name, age, gender, tone preferences, language, location, `is_self_managed`, `username`/`auth_user_id` for self-managed login |
| `caregiver_profiles` | Caregiver account details |
| `elder_caregivers` | Many-to-many join between elders and caregiver accounts, with `role` |
| `medications` | Structured medication schedule per elder |
| `family_members` | Family context per elder |
| `conversations` | Every logged conversation turn, grouped by `session_id` |
| `conversation_summaries` | Per-session summary, mood tag, and vector embedding for semantic retrieval |
| `daily_caregiver_digests` | Daily rollup of conversations, activities, and wellbeing observations per elder |
| `devices` | Physical device registration by MAC address |

## Configuration

The app is configured via environment variables. Depending on which providers are enabled, this includes:

- Supabase URL and service credentials
- OpenAI API key
- STT provider credentials (e.g. local Whisper model settings)
- TTS provider credentials (e.g. Edge TTS)
- Backend WebSocket URL
- Weather service configuration (Open-Meteo, no key required)

See the backend and frontend `.env` files for the exact variables required.

## Memory System

ElderlyCompanion uses two distinct layers of conversational memory:

**Session context** — the current conversation is kept live in the LLM's context for continuity within that session.

**Long-term semantic memory** — every completed session is summarized and embedded as a vector. On each new turn, the system searches these embeddings for conversations relevant to what's currently being discussed — not just the most recent ones.

```text
Earlier conversation:
"I'll visit my granddaughter Maria next Sunday for her birthday."

Weeks later:
Elder: "What should I get Maria for her birthday?"
```

The system retrieves the relevant earlier conversation by meaning, even though it isn't part of recent history.

## Physical Device

The ESP32 firmware connects to the backend over a persistent WebSocket. Audio is streamed as raw PCM from the device's microphone and played back through the speaker, encoded/decoded with Opus for the audio path.

## Based on ElatoAI

ElderlyCompanion is built on the open-source **ElatoAI** project. Portions of the Arduino/ESP32 firmware, the hardware integration approach, and parts of the frontend/backend architecture were used as a starting point and substantially adapted and extended — including native Macedonian language support, elder/caregiver profile management, two-layer conversational memory, semantic retrieval, conversation summarization, daily digests, none of which exist in the original project.

Original project: [ElatoAI by akdeb](https://github.com/akdeb/ElatoAI)
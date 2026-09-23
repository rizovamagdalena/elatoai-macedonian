# ElderlyCompanion

ElderlyCompanion is a voice-based digital companion designed to provide older adults with a simple, natural, and accessible way to interact with an AI assistant.

The application combines a web interface, voice interaction, conversational memory, and a physical voice device to create a more natural experience for elderly users.

## Features

* 🎙️ **Voice conversations** — Talk naturally with the assistant using speech.
* 🗣️ **Macedonian language support** — Designed for natural conversational interaction in Macedonian.
* 🧠 **Conversational memory** — Relevant information from previous conversations can be retrieved using semantic similarity.
* 👤 **Elder profiles** — Store information such as name, age, family members, and medications.
* 💊 **Medication information** — Keep track of medications.
* 👨‍👩‍👧 **Family information** — Store family members and information that can be relevant during conversations.
* 🌤️ **Context-aware conversations** — The assistant can use information such as the current time, location, and weather.
* 📱 **Web interface** — Manage elder profiles and interact with the assistant through the web application.
* 🔊 **Physical voice device** — An ESP32-based device provides a dedicated microphone and speaker interface.
* 💾 **Conversation summaries** — Completed conversations are summarized and stored as semantic memories for later retrieval.

## How It Works

ElderlyCompanion consists of three main parts:

```text
                    ┌─────────────────────┐
                    │   Web Application   │
                    │       Next.js      │
                    └──────────┬──────────┘
                               │
                               │ WebSocket
                               │
                    ┌──────────▼──────────┐
                    │    Backend Server   │
                    │ FastAPI + Pipecat   │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┼─────────────┐
                 │             │             │
                 ▼             ▼             ▼
              Speech          LLM           TTS
               STT          Processing      Voice
                 │             │             │
                 └─────────────┼─────────────┘
                               │
                    ┌──────────▼──────────┐
                    │       Supabase      │
                    │  Database + Memory  │
                    └─────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    ESP32 Device     │
                    │ Microphone + Speaker│
                    └─────────────────────┘
```

### Conversation Flow

1. The elder starts a voice conversation.
2. Audio is captured through the browser or physical device.
3. Speech is converted to text using the configured STT provider.
4. Relevant memories from previous conversations are retrieved using semantic similarity.
5. The LLM generates a response using the elder's profile and relevant context.
6. The response is converted back to speech using the configured TTS provider.
7. The conversation is stored in the database.
8. Completed conversations can be summarized and stored as long-term semantic memories.

## Technology Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* Supabase

### Backend

* Python
* FastAPI
* Pipecat
* WebSockets
* OpenAI
* Speech-to-Text providers
* Text-to-Speech providers

### Database & Memory

* Supabase
* PostgreSQL
* Vector embeddings
* Semantic similarity search

### Hardware

* ESP32
* INMP441 I2S microphone
* MAX98357 I2S amplifier
* 3W speaker

## Project Structure

```text
ElderlyCompanion/
│
├── backend/
│   ├── models/
│   ├── bot.py
│   ├── server.py
│   ├── scheduler.py
│   └── voice_pipeline.py
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── db/
│   └── utils/
│
└── firmware-arduino/
    ├── src/
    ├── platformio.ini
    └── partition.csv
```

## Configuration

The application uses environment variables for external services and configuration.

Depending on the enabled providers, configuration may include:

* Supabase URL and credentials
* OpenAI API key
* Speech-to-text provider credentials
* Text-to-speech provider credentials
* Backend WebSocket URL
* Weather service configuration

See the environment configuration used by the backend and frontend for the required variables.

## Memory System

ElderlyCompanion uses two levels of conversational context.

### Current Conversation

The current conversation is kept in the LLM context so the assistant can maintain continuity during an active conversation.

### Long-Term Memory

Completed conversations can be summarized and converted into vector embeddings.

When the elder says something new, the system can search these embeddings for semantically relevant past conversations.

For example:

```text
Previous conversation:

"I'll visit my granddaughter Maria next Sunday for her birthday."

Later:

Elder:

"What should I buy Maria for her birthday?"
```

The system can retrieve the relevant previous conversation even if it was not the most recent conversation.

## Based on ElatoAI

ElderlyCompanion was developed based on the open-source **ElatoAI** project.

Parts of the original project were used as a foundation and subsequently adapted and extended for ElderlyCompanion. This includes portions of the **Arduino/ESP32 firmware**, the **hardware integration and communication approach**, as well as parts of the **frontend and backend/server architecture and logic**.

The original project provided the foundation for connecting the physical voice device with the software system. ElderlyCompanion extends and modifies this foundation with its own user interface, Macedonian language support, elder profiles, conversational memory, semantic retrieval, conversation summaries, and other application-specific functionality.

Original project: [ElatoAI by akdeb](https://github.com/akdeb/ElatoAI)

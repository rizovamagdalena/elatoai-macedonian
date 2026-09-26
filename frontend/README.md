# ElderlyCompanion
The frontend directory contains the Next.js web application.

It provides the user interface for caregivers and elders, handles authentication and profile management, displays conversation-related information, and provides the browser-based voice conversation interface.

Frontend Structure
frontend/
│
├── app/
│   ├── caregiver/
│   ├── elder/
│   ├── login/
│   └── ...
│
├── components/
│   ├── ElderDashboard/
│   ├── VoiceChat/
│   ├── DeviceVoiceChat/
│   └── ...
│
├── db/
│   └── ...
│
└── utils/
    └── ...
Main Responsibilities

The frontend is responsible for:

User authentication
Caregiver and elder profile management
Medication and family member management
Caregiver dashboards
Browser-based voice conversations
Starting conversations through the ESP32 device
Communication with Supabase
Communication with the backend through WebSockets
User Interfaces
Caregiver

The caregiver interface allows caregivers to:

Manage elder profiles
Manage medications
Manage family members
View conversation summaries
View daily caregiver digests
View relevant wellbeing information
Manage information associated with the elders they care for

Elder

The elder interface provides a simplified experience focused primarily on interacting with the assistant.

Depending on the profile type, the elder can also manage their own profile information.

Voice Interfaces

The frontend provides two voice interaction options.

Browser Conversation

The "Разговарај" interface establishes a WebSocket connection with the backend and handles the browser-based voice conversation.

Browser microphone
        ↓
VoiceChat
        ↓
WebSocket
        ↓
Backend
        ↓
Audio response
        ↓
Browser speaker
ESP32 Conversation

The "Разговарај преку уред" interface starts a conversation through the connected ESP32 device.

The frontend communicates with the backend to start and monitor the device conversation session.

Supabase Integration

Supabase is used by the frontend for authentication and database access.

Frontend database helpers are located in:

frontend/db/

They provide access to application data such as:

Elder profiles
Caregiver profiles
Medications
Family members
Conversations
Conversation summaries
Daily caregiver digests
Devices

Authentication and Supabase client configuration are located in the corresponding utility files under:

frontend/utils/
Main Components
VoiceChat

Handles browser-based voice conversations, including the WebSocket connection, audio input/output, conversation state, and displaying the conversation interface.

DeviceVoiceChat

Handles the frontend interface for starting and monitoring conversations through the ESP32 device.

Dashboard Components

Dashboard components display and manage elder and caregiver information, including profiles, medications, family members, summaries, and daily digests.

C
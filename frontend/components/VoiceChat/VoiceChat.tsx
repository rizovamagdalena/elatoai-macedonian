"use client";

import { useEffect, useRef, useState } from "react";
import {
    getConversationsForElder,
    IConversationTurn,
} from "@/db/conversations_display";
import {
    Mic,
    Volume2,
    MessageCircle,
    Heart,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type ConnectionState = "idle" | "connecting" | "listening" | "speaking";

// Same PCM downsample/encode logic as the working browser test.
function downsampleBuffer(
    buffer: Float32Array,
    inputRate: number,
    outputRate: number
) {
    if (outputRate === inputRate) return buffer;

    const ratio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);

    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
        const nextOffsetBuffer = Math.round(
            (offsetResult + 1) * ratio
        );

        let accum = 0;
        let count = 0;

        for (
            let i = offsetBuffer;
            i < nextOffsetBuffer && i < buffer.length;
            i++
        ) {
            accum += buffer[i];
            count++;
        }

        result[offsetResult] = accum / count;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }

    return result;
}

function floatTo16BitPCM(float32Array: Float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));

        view.setInt16(
            i * 2,
            s < 0 ? s * 0x8000 : s * 0x7fff,
            true
        );
    }

    return buffer;
}

function int16ToFloat32(int16Array: Int16Array) {
    const out = new Float32Array(int16Array.length);

    for (let i = 0; i < int16Array.length; i++) {
        out[i] = int16Array[i] / 32768;
    }

    return out;
}

export default function VoiceChat({
    elderId,
    elderName,
    backendUrl,
    initialMessages,
}: {
    elderId: string;
    elderName: string;
    backendUrl: string;
    initialMessages: IConversationTurn[];
}) {
    const supabase = createClient();

    const [messages, setMessages] =
        useState<IConversationTurn[]>(initialMessages);

    const [state, setState] =
        useState<ConnectionState>("idle");

    const [currentTime, setCurrentTime] = useState(
        new Date()
    );

    const messagesEndRef =
        useRef<HTMLDivElement>(null);

    const wsRef =
        useRef<WebSocket | null>(null);

    const audioContextRef =
        useRef<AudioContext | null>(null);

    const mediaStreamRef =
        useRef<MediaStream | null>(null);

    const sourceNodeRef =
        useRef<MediaStreamAudioSourceNode | null>(null);

    const processorNodeRef =
        useRef<ScriptProcessorNode | null>(null);

    const outputNodeRef =
        useRef<ScriptProcessorNode | null>(null);

    const outputQueueRef =
        useRef<Float32Array[]>([]);

        
    const [reminderBanner, setReminderBanner] = useState<string | null>(null);
    const conversationStartedRef = useRef(false);

    const liveMessageIdRef = useRef<string | null>(null);

    /*
     * Keep the clock updated.
     */
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    /*
     * Scroll to newest message.
     */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages]);

    /*
     * Refresh conversation history after the backend
     * has saved the latest exchange.
     */
    const refreshMessages = async () => {
        await new Promise((resolve) =>
            setTimeout(resolve, 600)
        );

        const latest =
            await getConversationsForElder(
                supabase,
                elderId
            );

        setMessages(latest);
    };

    /*
     * Audio playback.
     */
    const setupPlayback = (ctx: AudioContext) => {
        const outputNode =
            ctx.createScriptProcessor(
                4096,
                1,
                1
            );

        outputNode.onaudioprocess = (event) => {
            const out =
                event.outputBuffer.getChannelData(0);

            out.fill(0);

            let offset = 0;

            while (
                offset < out.length &&
                outputQueueRef.current.length > 0
            ) {
                const chunk =
                    outputQueueRef.current[0];

                const copy = Math.min(
                    chunk.length,
                    out.length - offset
                );

                out.set(
                    chunk.subarray(0, copy),
                    offset
                );

                offset += copy;

                if (copy < chunk.length) {
                    outputQueueRef.current[0] =
                        chunk.subarray(copy);
                } else {
                    outputQueueRef.current.shift();
                }
            }
        };

        outputNode.connect(ctx.destination);

        outputNodeRef.current = outputNode;
    };

    /*
    * Mic press: get microphone, start streaming, tell backend to start talking.
    */
    const startMic = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            mediaStreamRef.current = mediaStream;

            const audioContext = audioContextRef.current!;
            const sourceNode = audioContext.createMediaStreamSource(mediaStream);
            sourceNodeRef.current = sourceNode;

            const processorNode = audioContext.createScriptProcessor(4096, 1, 1);
            processorNodeRef.current = processorNode;

            processorNode.onaudioprocess = (event) => {
                if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
                const input = event.inputBuffer.getChannelData(0);
                const downsampled = downsampleBuffer(input, audioContext.sampleRate, 16000);
                wsRef.current.send(floatTo16BitPCM(downsampled));
            };

            sourceNode.connect(processorNode);
            processorNode.connect(audioContext.destination);

            if (!conversationStartedRef.current) {
                conversationStartedRef.current = true;
                wsRef.current?.send(JSON.stringify({ type: "instruction", msg: "start_conversation" }));
            }

            setState("listening");
        } catch (error) {
            console.error("Could not start microphone:", error);
        }
    };


    /*
    * Open the socket + audio playback only. No mic yet.
    */
    const connectSocket = () => {
        setState("connecting");

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 24000,
        });
        audioContextRef.current = audioContext;
        setupPlayback(audioContext);

        const ws = new WebSocket(`${backendUrl}/ws/browser?elder_id=${elderId}`);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;

        ws.onopen = async () => {
             await startMic();
        };

        ws.onclose = () => setState("idle");
        ws.onerror = () => setState("idle");

        ws.onmessage = (event) => {
            if (typeof event.data === "string") {
                const message = JSON.parse(event.data);
                console.log(
                    "📥 FRONTEND RECEIVED:",
                    message,
                    "TIME:",
                    new Date().toISOString()
                );
                console.log("WEBSOCKET MESSAGE:", event.data);
                if (message.msg === "REMINDER") {
                    setReminderBanner(message.text);
                    setTimeout(() => setReminderBanner(null), 8000);
                    return;
                }
                  if (message.msg === "TRANSCRIPT") {
                    console.log("ADDING TRANSCRIPT TO UI:", {
                        role: message.role,
                        text: message.text,
                    });
                    const id = crypto.randomUUID();

                    setMessages((prev) => [
                        ...prev,
                        {
                            conversation_id: id,
                            elder_id: elderId,
                            role: message.role,
                            content: message.text,
                            created_at: new Date().toISOString(),
                        },
                    ]);

                    return;
                }
                if (message.msg === "RESPONSE.CREATED") setState("speaking");
                if (message.msg === "RESPONSE.COMPLETE") {
                    setState("listening");
                    // refreshMessages();
                }
                return;
            }

            const int16 = new Int16Array(event.data as ArrayBuffer);
            outputQueueRef.current.push(int16ToFloat32(int16));
        };
    };


    /*
     * Stop voice conversation.
     */
    const disconnect = () => {
        wsRef.current?.close();

        processorNodeRef.current?.disconnect();

        sourceNodeRef.current?.disconnect();

        outputNodeRef.current?.disconnect();

        mediaStreamRef.current
            ?.getTracks()
            .forEach((track) => track.stop());

        audioContextRef.current?.close();

        wsRef.current = null;

        outputQueueRef.current = [];

        setState("idle");
    };

    useEffect(() => {
        connectSocket();

        return () => {
            disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const firstName =
        elderName.split(" ")[0];

    const time = currentTime.toLocaleTimeString(
        "en-US",
        {
            hour: "numeric",
            minute: "2-digit",
        }
    );

    const date = currentTime.toLocaleDateString(
        "en-US",
        {
            weekday: "long",
            month: "long",
            day: "numeric",
        }
    );

    const statusLabel: Record<
    ConnectionState,
    string
    > = {
        idle: "Ready",
        connecting: "Connecting to Elato...",
        listening: "I'm listening...",
        speaking: "Elato is speaking...",
    };

    const statusDescription: Record<
        ConnectionState,
        string
    > = {
        idle: "Whenever you're ready, I'm here.",
        connecting: "Just a moment...",
        listening: "Go ahead, I'm listening.",
        speaking: "Please wait a moment.",
    };

return (
    <div className="min-h-screen bg-[#F7F4EC]">
        {reminderBanner && (
            <div className="fixed left-1/2 top-4 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-2xl border border-[#22281F]/10 bg-[#4B6355] px-5 py-4 text-white shadow-lg sm:top-6">
                <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 shrink-0" />
                    <p className="font-[family-name:var(--font-sans)] text-base font-medium sm:text-lg">
                        {reminderBanner}
                    </p>
                </div>
            </div>
        )}

        <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10 sm:py-14">

            {/* Header */}
            <header>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <Heart className="h-4 w-4 text-[#4B6355]" />

                            <span className="font-[family-name:var(--font-sans)] text-sm font-medium text-[#4B6355]">
                                Elato
                            </span>
                        </div>

                        <h1 className="font-[family-name:var(--font-display)] text-3xl font-medium tracking-tight text-[#22281F] sm:text-4xl">
                            Good{" "}
                            {currentTime.getHours() < 12
                                ? "morning"
                                : currentTime.getHours() < 18
                                  ? "afternoon"
                                  : "evening"}
                            , {firstName}
                        </h1>

                        <p className="mt-1.5 font-[family-name:var(--font-sans)] text-sm text-[#22281F]/60 sm:text-base">
                            I'm happy to talk with you.
                        </p>
                    </div>

                    {/* Time */}
                    <div className="hidden rounded-2xl border border-[#22281F]/10 bg-[#EFEAE0] px-5 py-3 text-right sm:block">
                        <p className="font-[family-name:var(--font-display)] text-2xl font-medium tracking-tight text-[#22281F]">
                            {time}
                        </p>

                        <p className="mt-0.5 font-[family-name:var(--font-sans)] text-xs text-[#22281F]/60">
                            {date}
                        </p>
                    </div>
                </div>

                {/* Mobile time */}
                <div className="mt-5 flex items-center gap-2 font-[family-name:var(--font-sans)] text-sm text-[#22281F]/60 sm:hidden">
                    <span className="font-medium text-[#22281F]">
                        {time}
                    </span>

                    <span>·</span>

                    <span>{date}</span>
                </div>
            </header>

            {/* Conversation */}
            <main className="mt-10 flex min-h-0 flex-1 flex-col">
                <div className="border-t border-[#22281F]/10 pt-8">

                    <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-[#4B6355]" />

                        <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[#22281F]">
                            Conversation
                        </h2>
                    </div>

                    <p className="mt-1 font-[family-name:var(--font-sans)] text-sm text-[#22281F]/60">
                        Your conversation with Elato.
                    </p>

                    {/* Messages */}
                    <div className="mt-6 min-h-[360px]">
                        {messages.length === 0 ? (
                            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#DCE3D6]">
                                    <Heart className="h-7 w-7 text-[#4B6355]" />
                                </div>

                                <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[#22281F]">
                                    I'm here for you
                                </h2>

                                <p className="mt-2 max-w-sm font-[family-name:var(--font-sans)] text-sm leading-6 text-[#22281F]/60">
                                    Start talking whenever you're ready.
                                </p>
                            </div>
                        ) : (
                            <div className="flex max-h-[52vh] flex-col gap-4 overflow-y-auto pr-1">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.conversation_id}
                                        className={`flex ${
                                            msg.role === "user"
                                                ? "justify-end"
                                                : "justify-start"
                                        }`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-2xl px-5 py-3.5 font-[family-name:var(--font-sans)] text-base leading-7 sm:max-w-[75%] sm:text-lg ${
                                                msg.role === "user"
                                                    ? "rounded-br-md bg-[#4B6355] text-white"
                                                    : "rounded-bl-md border border-[#22281F]/10 bg-[#EFEAE0] text-[#22281F]"
                                            }`}
                                        >
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}

                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Voice controls */}
                <div className="mt-auto border-t border-[#22281F]/10 pt-8">
                    <div className="flex flex-col items-center">

                        <div className="mb-1 flex items-center gap-2">
                            {state === "speaking" && (
                                <Volume2 className="h-5 w-5 text-[#4B6355]" />
                            )}

                            {state === "listening" && (
                                <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#4B6355]" />
                            )}

                            <p className="font-[family-name:var(--font-sans)] text-base font-semibold text-[#22281F] sm:text-lg">
                                {statusLabel[state]}
                            </p>
                        </div>

                        <p className="mb-5 font-[family-name:var(--font-sans)] text-sm text-[#22281F]/60">
                            {statusDescription[state]}
                        </p>

                        {/* Main microphone */}
                        <div
                            className={`relative flex h-24 w-24 items-center justify-center rounded-full shadow-sm transition-colors sm:h-28 sm:w-28 ${
                                state === "speaking"
                                    ? "bg-[#DCE3D6] text-[#4B6355]"
                                    : "bg-[#4B6355] text-white"
                            }`}
                        >
                            {state === "speaking" ? (
                                <Volume2 className="h-10 w-10 sm:h-12 sm:w-12" />
                            ) : (
                                <Mic className="h-10 w-10 sm:h-12 sm:w-12" />
                            )}

                            {state === "listening" && (
                                <span className="absolute h-24 w-24 animate-ping rounded-full border border-[#4B6355]/30 sm:h-28 sm:w-28" />
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>
);
}
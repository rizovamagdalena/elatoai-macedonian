"use client";

import { useEffect, useRef, useState } from "react";
import {
    getConversationsForElder,
    IConversationTurn,
} from "@/db/conversations_display";
import { Button } from "@/components/ui/button";
import {
    Mic,
    Square,
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
     * Start voice conversation.
     */
    const connect = async () => {
        try {
            setState("connecting");

            const audioContext =
                new (window.AudioContext ||
                    (window as any).webkitAudioContext)({
                    sampleRate: 24000,
                });

            audioContextRef.current =
                audioContext;

            setupPlayback(audioContext);

            const mediaStream =
                await navigator.mediaDevices.getUserMedia(
                    {
                        audio: true,
                        video: false,
                    }
                );

            mediaStreamRef.current =
                mediaStream;

            const sourceNode =
                audioContext.createMediaStreamSource(
                    mediaStream
                );

            sourceNodeRef.current =
                sourceNode;

            const processorNode =
                audioContext.createScriptProcessor(
                    4096,
                    1,
                    1
                );

            processorNodeRef.current =
                processorNode;

            processorNode.onaudioprocess = (
                event
            ) => {
                if (
                    !wsRef.current ||
                    wsRef.current.readyState !==
                        WebSocket.OPEN
                ) {
                    return;
                }

                const input =
                    event.inputBuffer.getChannelData(
                        0
                    );

                const downsampled =
                    downsampleBuffer(
                        input,
                        audioContext.sampleRate,
                        16000
                    );

                wsRef.current.send(
                    floatTo16BitPCM(
                        downsampled
                    )
                );
            };

            sourceNode.connect(processorNode);

            processorNode.connect(
                audioContext.destination
            );

            const ws = new WebSocket(
                `${backendUrl}/ws/browser?elder_id=${elderId}`
            );

            ws.binaryType = "arraybuffer";

            wsRef.current = ws;

            ws.onopen = () => {
                setState("listening");
            };

            ws.onclose = () => {
                setState("idle");
            };

            ws.onerror = () => {
                setState("idle");
            };

            ws.onmessage = (event) => {
                if (
                    typeof event.data ===
                    "string"
                ) {
                    const message =
                        JSON.parse(event.data);

                    if (
                        message.msg ===
                        "RESPONSE.CREATED"
                    ) {
                        setState("speaking");
                    }

                    if (
                        message.msg ===
                        "RESPONSE.COMPLETE"
                    ) {
                        setState("listening");
                        refreshMessages();
                    }

                    return;
                }

                const int16 =
                    new Int16Array(
                        event.data as ArrayBuffer
                    );

                outputQueueRef.current.push(
                    int16ToFloat32(int16)
                );
            };
        } catch (error) {
            console.error(
                "Could not start voice chat:",
                error
            );

            disconnect();
        }
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

    /*
     * Cleanup.
     */
    useEffect(() => {
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
        idle: "Tap the microphone to talk",
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
        <div className="flex min-h-[100dvh] w-full flex-col bg-background">
            {/* Top greeting */}
            <header className="px-6 pb-4 pt-6 sm:px-8 sm:pt-8">
                <div className="mx-auto flex w-full max-w-3xl items-start justify-between gap-4">
                    <div>
                        <div className="mb-1 flex items-center gap-2">
                            <Heart className="h-4 w-4 text-primary" />

                            <span className="text-sm font-medium text-primary">
                                Elato
                            </span>
                        </div>

                        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            Good{" "}
                            {currentTime.getHours() < 12
                                ? "morning"
                                : currentTime.getHours() < 18
                                  ? "afternoon"
                                  : "evening"}
                            , {firstName}
                        </h1>

                        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                            I'm happy to talk with you.
                        </p>
                    </div>

                    {/* Time */}
                    <div className="hidden rounded-2xl border bg-muted/30 px-5 py-3 text-right sm:block">
                        <p className="text-2xl font-semibold tracking-tight">
                            {time}
                        </p>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {date}
                        </p>
                    </div>
                </div>

                {/* Mobile time */}
                <div className="mx-auto mt-5 flex w-full max-w-3xl items-center gap-2 text-sm text-muted-foreground sm:hidden">
                    <span className="font-medium text-foreground">
                        {time}
                    </span>

                    <span>·</span>

                    <span>{date}</span>
                </div>
            </header>

            {/* Conversation */}
            <main className="flex min-h-0 flex-1 flex-col px-4 sm:px-8">
                <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
                    <div className="mb-3 flex items-center gap-2 border-b pb-3">
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />

                        <span className="text-sm font-medium text-muted-foreground">
                            Conversation
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto py-4 sm:py-6">
                        {messages.length === 0 ? (
                            <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-6 text-center">
                                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                                    <Heart className="h-7 w-7 text-primary" />
                                </div>

                                <h2 className="text-xl font-semibold">
                                    I'm here for you
                                </h2>

                                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground sm:text-base">
                                    Tap the microphone below and
                                    start a conversation whenever
                                    you'd like.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {messages.map((msg) => (
                                    <div
                                        key={
                                            msg.conversation_id
                                        }
                                        className={`flex ${
                                            msg.role ===
                                            "user"
                                                ? "justify-end"
                                                : "justify-start"
                                        }`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-base leading-7 sm:max-w-[75%] sm:text-lg ${
                                                msg.role ===
                                                "user"
                                                    ? "rounded-br-md bg-primary text-primary-foreground"
                                                    : "rounded-bl-md bg-muted text-foreground"
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

                    {/* Voice controls */}
                    <div className="border-t px-2 pb-6 pt-5 sm:pb-8 sm:pt-6">
                        <div className="flex flex-col items-center">
                            <div className="mb-1 flex items-center gap-2">
                                {state ===
                                    "speaking" && (
                                    <Volume2 className="h-5 w-5 text-primary" />
                                )}

                                {state ===
                                    "listening" && (
                                    <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
                                )}

                                <p className="text-base font-semibold sm:text-lg">
                                    {statusLabel[state]}
                                </p>
                            </div>

                            <p className="mb-5 text-sm text-muted-foreground">
                                {
                                    statusDescription[
                                        state
                                    ]
                                }
                            </p>

                            {/* Main microphone */}
                            <Button
                                type="button"
                                aria-label={
                                    state ===
                                    "idle"
                                        ? "Start talking"
                                        : "Stop talking"
                                }
                                onClick={
                                    state ===
                                    "idle"
                                        ? connect
                                        : disconnect
                                }
                                className={`relative h-24 w-24 rounded-full shadow-lg transition-all duration-200 sm:h-28 sm:w-28 ${
                                    state ===
                                    "idle"
                                        ? "hover:scale-105 hover:shadow-xl"
                                        : "bg-destructive hover:bg-destructive/90"
                                }`}
                            >
                                {state ===
                                "idle" ? (
                                    <Mic className="h-10 w-10 sm:h-12 sm:w-12" />
                                ) : (
                                    <Square className="h-8 w-8 sm:h-9 sm:w-9" />
                                )}

                                {state ===
                                    "listening" && (
                                    <span className="absolute inset-[-8px] animate-ping rounded-full border border-primary/30" />
                                )}
                            </Button>

                            <p className="mt-4 text-xs text-muted-foreground">
                                {state ===
                                "idle"
                                    ? "Press once to start"
                                    : "Press to stop"}
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
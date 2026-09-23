"use client";

import { useEffect, useRef, useState } from "react";

type DeviceVoiceChatProps = {
    elderId: string;
    elderName: string;
    backendUrl: string;
    initialMessages: any[];
};

export default function DeviceVoiceChat({
    elderId,
    elderName,
    backendUrl,
    initialMessages,
}: DeviceVoiceChatProps) {
    const [messages, setMessages] = useState<any[]>(initialMessages || []);
    const [connected, setConnected] = useState(false);

    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const socket = new WebSocket(
            `${backendUrl}/ws/device-observer?elder_id=${elderId}`
        );

        socketRef.current = socket;

        socket.onopen = () => {
            console.log("Device observer connected");
            setConnected(true);
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                if (
                    message.type === "server" &&
                    message.msg === "TRANSCRIPT"
                ) {
                    setMessages((previous) => [
                        ...previous,
                        {
                            role: message.role,
                            content: message.text,
                        },
                    ]);
                }
            } catch (error) {
                console.error(
                    "Failed to process device message:",
                    error
                );
            }
        };

        socket.onclose = () => {
            console.log("Device observer disconnected");
            setConnected(false);
        };

        socket.onerror = (error) => {
            console.error("Device observer error:", error);
            setConnected(false);
        };

        return () => {
            socket.close();
            socketRef.current = null;
        };
    }, [backendUrl, elderId]);

    return (
        <div className="flex min-h-screen flex-col p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold">
                    Talk through device
                </h1>

                <p className="text-gray-500">
                    {connected
                        ? `Your Elato device is connected.`
                        : "Connecting to your Elato device..."}
                </p>
            </div>

            <div className="flex-1 space-y-4">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`rounded-lg p-3 ${
                            message.role === "user"
                                ? "bg-blue-100"
                                : "bg-gray-100"
                        }`}
                    >
                        <div className="text-sm font-medium">
                            {message.role === "user"
                                ? elderName
                                : "Elato"}
                        </div>

                        <div className="mt-1">
                            {message.content}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
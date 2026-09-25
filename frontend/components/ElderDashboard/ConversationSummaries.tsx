"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";

const MOOD_STYLES: Record<
    string,
    { label: string; className: string }
> = {
    positive: {
        label: "Добро расположение",
        className:
            "bg-[#DCE3D6] text-[#4B6355]",
    },
    neutral: {
        label: "Неутрално",
        className:
            "bg-[#EFEAE0] text-[#22281F]/60",
    },
    concerning: {
        label: "Внимание потребно",
        className:
            "bg-[#A8552F]/10 text-[#A8552F]",
    },
};

function getToday() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Skopje",
    }).format(new Date());
}

function formatDate(date: string) {
    return new Intl.DateTimeFormat("mk-MK", {
        timeZone: "Europe/Skopje",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(`${date}T12:00:00`));
}

export default function ConversationSummaries({
    digests,
}: {
    digests: any[];
}) {
    const today = getToday();

    const [selectedDate, setSelectedDate] =
        useState(today);

    const digest = digests.find(
        (item) =>
            item.digest_date === selectedDate
    );

    if (digests.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-[#22281F]/15 p-6 text-center font-[family-name:var(--font-sans)]">
                <p className="text-sm font-medium text-[#22281F]">
                    Сè уште нема разговори
                </p>

                <p className="mt-1 text-xs text-[#22281F]/50">
                    Дневните прегледи од разговорите ќе се појават тука.
                </p>
            </div>
        );
    }

    const activities = Array.isArray(
        digest?.activities
    )
        ? digest.activities
        : [];

    const wellbeing =
        Array.isArray(
            digest?.wellbeing_observations
        )
            ? digest.wellbeing_observations
            : [];

    return (
        <div className="space-y-5 font-[family-name:var(--font-sans)]">

            {/* Calendar */}
            <div className="flex items-center justify-between gap-4">

                <div>
                    <p className="text-xs text-[#22281F]/50">
                        Избран ден
                    </p>

                    <p className="mt-1 text-sm font-medium capitalize text-[#22281F]">
                        {selectedDate === today
                            ? "Денес"
                            : formatDate(selectedDate)}
                    </p>
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#22281F]/10 bg-[#EFEAE0] px-3 py-2.5">

                    <CalendarDays className="h-4 w-4 text-[#4B6355]" />

                    <input
                        type="date"
                        value={selectedDate}
                        max={today}
                        onChange={(event) =>
                            setSelectedDate(
                                event.target.value
                            )
                        }
                        className="bg-transparent text-sm text-[#22281F] outline-none"
                    />

                </label>

            </div>

            {/* No digest for selected date */}
            {!digest ? (
                <div className="rounded-2xl border border-dashed border-[#22281F]/15 p-6 text-center">

                    <p className="text-sm font-medium text-[#22281F]">
                        Нема дневен преглед за овој ден
                    </p>

                    <p className="mt-1 text-xs text-[#22281F]/50">
                        За овој ден нема достапен дневен преглед.
                    </p>

                </div>
            ) : (
                <>
                    {/* Date + conversation count */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                        <span className="text-xs text-[#22281F]/50">
                            {formatDate(
                                digest.digest_date
                            )}
                        </span>

                        <span className="w-fit rounded-full bg-[#EFEAE0] px-2.5 py-1 text-xs font-medium text-[#22281F]/60">
                            {digest.conversation_count}{" "}
                            {digest.conversation_count === 1
                                ? "разговор"
                                : "разговори"}
                        </span>

                    </div>

                    {/* Daily summary */}
                    <div className="rounded-2xl border border-[#22281F]/10 p-5">

                        <p className="text-sm leading-relaxed text-[#22281F]">
                            {digest.digest_text}
                        </p>

                    </div>

                    {/* Activities */}
                    {activities.length > 0 && (
                        <div className="rounded-2xl border border-[#22281F]/10 p-5">

                            <h3 className="font-[family-name:var(--font-display)] text-lg font-medium text-[#22281F]">
                                Активности
                            </h3>

                            <ul className="mt-3 space-y-2">
                                {activities.map(
                                    (
                                        activity: string,
                                        index: number
                                    ) => (
                                        <li
                                            key={index}
                                            className="flex gap-3 text-sm leading-relaxed text-[#22281F]"
                                        >
                                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4B6355]" />

                                            <span>
                                                {activity}
                                            </span>
                                        </li>
                                    )
                                )}
                            </ul>

                        </div>
                    )}

                    {/* Wellbeing */}
                    {wellbeing.length > 0 && (
                        <div className="rounded-2xl border border-[#22281F]/10 p-5">

                            <h3 className="font-[family-name:var(--font-display)] text-lg font-medium text-[#22281F]">
                                Состојба
                            </h3>

                            <ul className="mt-3 space-y-2">
                                {wellbeing.map(
                                    (
                                        observation: string,
                                        index: number
                                    ) => (
                                        <li
                                            key={index}
                                            className="flex gap-3 text-sm leading-relaxed text-[#22281F]"
                                        >
                                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4B6355]" />

                                            <span>
                                                {observation}
                                            </span>
                                        </li>
                                    )
                                )}
                            </ul>

                        </div>
                    )}
                </>
            )}
        </div>
    );
}
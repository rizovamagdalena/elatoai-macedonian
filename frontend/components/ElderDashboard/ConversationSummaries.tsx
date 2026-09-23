import { getSummariesForElder } from "@/db/conversation_summaries";

const MOOD_STYLES: Record<string, { label: string; className: string }> = {
    positive: {
        label: "Добро расположение",
        className: "bg-[#DCE3D6] text-[#4B6355]",
    },
    neutral: {
        label: "Неутрално",
        className: "bg-[#EFEAE0] text-[#22281F]/60",
    },
    concerning: {
        label: "Внимание потребно",
        className: "bg-[#A8552F]/10 text-[#A8552F]",
    },
};

export default async function ConversationSummaries({
    elderId,
}: {
    elderId: string;
}) {
    const summaries = await getSummariesForElder(elderId);

    if (summaries.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-[#22281F]/15 p-6 text-center font-[family-name:var(--font-sans)]">
                <p className="text-sm font-medium text-[#22281F]">
                    Сè уште нема разговори
                </p>
                <p className="mt-1 text-xs text-[#22281F]/50">
                    Резимеата од разговорите ќе се појават тука.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3 font-[family-name:var(--font-sans)]">
            {summaries.map((summary) => {
                const mood = MOOD_STYLES[summary.mood] ?? MOOD_STYLES.neutral;

                return (
                    <div
                        key={summary.summary_id}
                        className="rounded-2xl border border-[#22281F]/10 p-4"
                    >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-xs text-[#22281F]/50">
                                {new Date(summary.created_at).toLocaleString("mk-MK")}
                            </span>

                            <span
                                className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${mood.className}`}
                            >
                                {mood.label}
                            </span>
                        </div>

                        <p className="mt-3 text-sm leading-relaxed text-[#22281F]">
                            {summary.summary_text}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
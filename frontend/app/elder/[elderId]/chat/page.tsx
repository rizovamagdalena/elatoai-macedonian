import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getElderById } from "@/db/elders";
import { getConversationsForElder } from "@/db/conversations_display";
import VoiceChat from "@/app/components/VoiceChat/VoiceChat";

export const revalidate = 0;
export const dynamic = "force-dynamic";

// TODO: move this to an env var once you deploy the backend somewhere
// other than your own machine.
const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:7860";

export default async function ElderChatPage({
    params,
}: {
    params: { elderId: string };
}) {
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const elder = await getElderById(supabase, params.elderId);

    if (!elder) {
        notFound();
    }

    const initialMessages = await getConversationsForElder(
        supabase,
        elder.elder_id
    );

    return (
        <VoiceChat
            elderId={elder.elder_id}
            elderName={elder.name}
            backendUrl={BACKEND_URL}
            initialMessages={initialMessages}
        />
    );
}
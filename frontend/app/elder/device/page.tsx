import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getConversationsForElder } from "@/db/conversations_display";
import DeviceVoiceChat from "@/components/DeviceVoiceChat/DeviceVoiceChat";
export const revalidate = 0;
export const dynamic = "force-dynamic";

const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:7860";

export default async function ElderDevicePage() {
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: elder } = await supabase
        .from("elders")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (!elder) {
        notFound();
    }

    const initialMessages = await getConversationsForElder(
        supabase,
        elder.elder_id
    );

    return (
        <DeviceVoiceChat
            elderId={elder.elder_id}
            elderName={elder.name}
            backendUrl={BACKEND_URL}
            initialMessages={initialMessages}
        />
    );
}
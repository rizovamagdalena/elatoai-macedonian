import { createClient } from "@/utils/supabase/server";

export async function getSummariesForElder(
    elderId: string,
    limit = 10
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("conversation_summaries")
        .select("*")
        .eq("elder_id", elderId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        throw error;
    }

    return data;
}
import { createClient } from "@/utils/supabase/server";

export async function getDailyDigestsForElder(
    elderId: string
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("daily_caregiver_digests")
        .select("*")
        .eq("elder_id", elderId)
        .order("digest_date", { ascending: false });

    if (error) {
        console.error(
            "Error fetching daily caregiver digests:",
            error
        );

        return [];
    }

    return data ?? [];
}
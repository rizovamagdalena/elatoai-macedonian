import { SupabaseClient } from "@supabase/supabase-js";

export interface IConversationTurn {
    conversation_id: string;
    elder_id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
}

export const getConversationsForElder = async (
    supabase: SupabaseClient,
    elderId: string,
    limit: number = 50,
): Promise<IConversationTurn[]> => {
    const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("elder_id", elderId)
        .order("created_at", { ascending: true })
        .limit(limit);

    if (error) {
        console.error("Error fetching conversations:", error);
        return [];
    }

    return data as IConversationTurn[];
};
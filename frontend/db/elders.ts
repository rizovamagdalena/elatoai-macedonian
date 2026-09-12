import { SupabaseClient } from "@supabase/supabase-js";

export interface IElder {
    elder_id: string;
    name: string;
    age: number | null;
    tone_description: string;
    first_message_prompt: string | null;
    language_code: string;
    is_self_managed: boolean;
    created_at: string;
    username: string | null;
    auth_user_id: string | null;
}

export const getMyElders = async (
    supabase: SupabaseClient,
    userId: string,
): Promise<IElder[]> => {
    const { data, error } = await supabase
        .from("elder_caregivers")
        .select("elders(*)")
        .eq("caregiver_user_id", userId);

    if (error) {
        console.error("Error fetching elders:", error);
        return [];
    }

    return (data ?? [])
    .flatMap((row) => row.elders ?? []) as IElder[];
};
export const getElderById = async (
    supabase: SupabaseClient,
    elderId: string,
): Promise<IElder | null> => {
    const { data, error } = await supabase
        .from("elders")
        .select("*")
        .eq("elder_id", elderId)
        .single();

    if (error) {
        console.error("Error fetching elder:", error);
        return null;
    }

    return data as IElder;
};

export const createElder = async (
    supabase: SupabaseClient,
    userId: string,
    elder: Partial<IElder>,
): Promise<IElder | null> => {
    const elderId = crypto.randomUUID();

    // 1. Insert elder without .select()
    const { error: elderError } = await supabase
        .from("elders")
        .insert({
            ...elder,
            elder_id: elderId,
        });

    if (elderError) {
        console.error("ELDER INSERT ERROR:", elderError);
        throw elderError;
    }

    // 2. Create caregiver relationship
    const { error: relationshipError } = await supabase
        .from("elder_caregivers")
        .insert({
            elder_id: elderId,
            caregiver_user_id: userId,
            role: "caregiver",
        });

    if (relationshipError) {
        console.error(
            "ELDER-CAREGIVER INSERT ERROR:",
            relationshipError
        );
        throw relationshipError;
    }

    // 3. Now the SELECT policy is satisfied
    const { data, error: fetchError } = await supabase
        .from("elders")
        .select("*")
        .eq("elder_id", elderId)
        .single();

    if (fetchError) {
        console.error("FINAL ELDER FETCH ERROR:", fetchError);
        throw fetchError;
    }

    return data as IElder;
};

export const getElderForUser = async (
    supabase: SupabaseClient,
    elderId: string,
    userId: string,
): Promise<IElder | null> => {
    // First check if this user is the elder themselves
    const { data: selfElder, error: selfError } = await supabase
        .from("elders")
        .select("*")
        .eq("elder_id", elderId)
        .eq("auth_user_id", userId)
        .maybeSingle();

    if (selfError) {
        console.error("Error checking elder account:", selfError);
        return null;
    }

    if (selfElder) {
        return selfElder as IElder;
    }

    // Otherwise check whether the user is a caregiver
    const { data: caregiverLink, error: caregiverError } = await supabase
        .from("elder_caregivers")
        .select("elders(*)")
        .eq("elder_id", elderId)
        .eq("caregiver_user_id", userId)
        .maybeSingle();

    if (caregiverError) {
        console.error("Error checking caregiver access:", caregiverError);
        return null;
    }

    if (!caregiverLink?.elders) {
        return null;
    }

    return caregiverLink.elders as IElder;
};
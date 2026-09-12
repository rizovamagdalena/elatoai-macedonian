import { SupabaseClient } from "@supabase/supabase-js";

export interface IMedication {
    medication_id: string;
    elder_id: string;
    name: string;
    dosage: string | null;
    times_of_day: string[];
    notes: string | null;
    active: boolean;
    created_at: string;
}

export const getMedicationsForElder = async (
    supabase: SupabaseClient,
    elderId: string,
): Promise<IMedication[]> => {
    const { data, error } = await supabase
        .from("medications")
        .select("*")
        .eq("elder_id", elderId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching medications:", error);
        return [];
    }

    return data as IMedication[];
};

export const addMedication = async (
    supabase: SupabaseClient,
    elderId: string,
    medication: { name: string; dosage?: string; times_of_day: string[]; notes?: string },
): Promise<IMedication | null> => {
    const { data, error } = await supabase
        .from("medications")
        .insert({ ...medication, elder_id: elderId })
        .select();

    if (error) {
        console.error("Error adding medication:", error);
        throw error;
    }

    return data ? (data[0] as IMedication) : null;
};

export const deleteMedication = async (
    supabase: SupabaseClient,
    medicationId: string,
): Promise<void> => {
    const { error } = await supabase
        .from("medications")
        .delete()
        .eq("medication_id", medicationId);

    if (error) {
        console.error("Error deleting medication:", error);
        throw error;
    }
};
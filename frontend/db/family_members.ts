import { SupabaseClient } from "@supabase/supabase-js";

export interface IFamilyMember {
    family_member_id: string;
    elder_id: string;
    name: string;
    relation: string | null;
    notes: string | null;
    created_at: string;
}

export const getFamilyMembersForElder = async (
    supabase: SupabaseClient,
    elderId: string,
): Promise<IFamilyMember[]> => {
    const { data, error } = await supabase
        .from("family_members")
        .select("*")
        .eq("elder_id", elderId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching family members:", error);
        return [];
    }

    return data as IFamilyMember[];
};

export const addFamilyMember = async (
    supabase: SupabaseClient,
    elderId: string,
    familyMember: { name: string; relation?: string; notes?: string },
): Promise<IFamilyMember | null> => {
    const { data, error } = await supabase
        .from("family_members")
        .insert({ ...familyMember, elder_id: elderId })
        .select();

    if (error) {
        console.error("Error adding family member:", error);
        throw error;
    }

    return data ? (data[0] as IFamilyMember) : null;
};

export const deleteFamilyMember = async (
    supabase: SupabaseClient,
    familyMemberId: string,
): Promise<void> => {
    const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("family_member_id", familyMemberId);

    if (error) {
        console.error("Error deleting family member:", error);
        throw error;
    }
};
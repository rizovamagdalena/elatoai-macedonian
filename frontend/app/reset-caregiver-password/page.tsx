import { createAdminClient } from "@/utils/supabase/admin";

export default async function ResetPasswordPage() {
    const admin = createAdminClient();

    const { error } = await admin.auth.admin.updateUserById(
        "7994aee5-862d-4391-a644-71e98ea45ad2",
        {
            password: "Password1",
        }
    );

    return <pre>{error ? error.message : "Password changed successfully."}</pre>;
}
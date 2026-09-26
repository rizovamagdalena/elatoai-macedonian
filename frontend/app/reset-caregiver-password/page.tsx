import { createAdminClient } from "@/utils/supabase/admin";

export default async function ResetPasswordPage() {
    const admin = createAdminClient();

    const { error } = await admin.auth.admin.updateUserById(
        "82a11e59-437e-4900-907b-45ea2e796cc8",
        {
            password: "Password1",
        }
    );

    return <pre>{error ? error.message : "Password changed successfully."}</pre>;
}
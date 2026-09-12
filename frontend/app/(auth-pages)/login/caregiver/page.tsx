    import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

export default async function CaregiverLoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string }>;
}) {
    const params = await searchParams;
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user) {
        redirect("/home");
    }
    
    async function loginCaregiver(formData: FormData) {
        "use server";

        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        const supabase = createClient();

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            redirect(
                `/login/caregiver?message=${encodeURIComponent(
                    error.message
                )}`
            );
        }

        redirect("/home");
    }

    return (
        <div className="w-full max-w-md px-6 py-12">
            <Link
                href="/login"
                className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" />
                Back
            </Link>

            <div className="mb-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Users className="h-6 w-6" />
                </div>

                <h1 className="text-3xl font-semibold tracking-tight">
                    Welcome back
                </h1>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Sign in to manage Elato for your family member.
                </p>
            </div>

            {params.message && (
                <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {params.message}
                </div>
            )}

            <form action={loginCaregiver} className="space-y-5">
                <div className="space-y-2">
                    <label
                        htmlFor="email"
                        className="text-sm font-medium"
                    >
                        Email address
                    </label>

                    <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                        className="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label
                            htmlFor="password"
                            className="text-sm font-medium"
                        >
                            Password
                        </label>

                        <Link
                            href="/forgot-password"
                            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                        >
                            Forgot password?
                        </Link>
                    </div>

                    <input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Enter your password"
                        required
                        className="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                </div>

                <button
                    type="submit"
                    className="h-11 w-full rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                    Sign in
                </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
                Don't have a caregiver account?{" "}
                <Link
                    href="/register/caregiver"
                    className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                >
                    Create one
                </Link>
            </p>
        </div>
    );
}
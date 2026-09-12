import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Heart } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

export default async function ElderLoginPage({
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
        // We don't know the elder ID here yet, so keep the existing
        // authenticated behavior for now.
        redirect("/home");
    }

    async function loginElder(formData: FormData) {
        "use server";

        const username = formData.get("username")?.toString().trim();
        const password = formData.get("password")?.toString();

        if (!username || !password) {
            redirect(
                "/login/elder?message=Please enter your username and password."
            );
        }

        const supabase = createClient();

        const email = `${username.toLowerCase()}@elder.elato.local`;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error || !data.user) {
            redirect(
                `/login/elder?message=${encodeURIComponent(
                    "We couldn't sign you in. Please check your username and password."
                )}`
            );
        }

        const { data: elder, error: elderError } = await supabase
            .from("elders")
            .select("elder_id")
            .eq("auth_user_id", data.user.id)
            .maybeSingle();

        if (elderError || !elder) {
            await supabase.auth.signOut();

            redirect(
                "/login/elder?message=Your Elato profile could not be found."
            );
        }

        redirect(`/elder/${elder.elder_id}/chat`);
    }

    return (
        <div className="w-full max-w-md px-6 py-12 sm:py-16">
            {/* Back */}
            <Link
                href="/login"
                className="mb-10 inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-foreground"
            >
                <ArrowLeft className="h-5 w-5" />
                Back
            </Link>

            {/* Header */}
            <div className="mb-10 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                    <Heart className="h-10 w-10 text-primary" />
                </div>

                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Welcome back
                </h1>

                <p className="mt-3 text-base leading-7 text-muted-foreground">
                    Sign in and start talking with your Elato companion.
                </p>
            </div>

            {/* Error */}
            {params.message && (
                <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-base text-destructive">
                    {params.message}
                </div>
            )}

            {/* Login */}
            <form action={loginElder} className="space-y-6">
                <div className="space-y-2">
                    <label
                        htmlFor="username"
                        className="text-base font-medium"
                    >
                        Username
                    </label>

                    <input
                        id="username"
                        name="username"
                        type="text"
                        placeholder="Enter your username"
                        autoComplete="username"
                        required
                        className="h-14 w-full rounded-xl border border-border bg-background px-4 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="password"
                        className="text-base font-medium"
                    >
                        Password
                    </label>

                    <input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        required
                        className="h-14 w-full rounded-xl border border-border bg-background px-4 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                </div>

                <button
                    type="submit"
                    className="h-14 w-full rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                    Start talking
                </button>
            </form>

            {/* Register */}
            <div className="mt-8 rounded-xl border bg-muted/30 p-5 text-center">
                <p className="text-base text-muted-foreground">
                    Don't have an Elato account?
                </p>

                <Link
                    href="/register/elder"
                    className="mt-2 inline-block text-base font-semibold text-primary underline underline-offset-4 hover:text-primary/80"
                >
                    Create your account
                </Link>
            </div>
        </div>
    );
}
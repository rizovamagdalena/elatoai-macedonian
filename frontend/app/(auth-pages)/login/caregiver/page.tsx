import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function CaregiverAuthPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string; mode?: string }>;
}) {
    const params = await searchParams;
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user) {
        redirect("/caregiver");
    }

    const isRegister = params.mode === "register";

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

        redirect("/caregiver");
    }

    async function registerCaregiver(formData: FormData) {
        "use server";
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        const supabase = createClient();
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            redirect(
                `/login/caregiver?mode=register&message=${encodeURIComponent(
                    error.message
                )}`
            );
        }
        if (!data.user) {
            redirect(
                "/login/caregiver?mode=register&message=Could not create the account"
            );
        }

        const { error: profileError } = await supabase
            .from("caregiver_profiles")
            .insert({ user_id: data.user.id, name });

        if (profileError) {
            redirect(
                `/login/caregiver?mode=register&message=${encodeURIComponent(
                    profileError.message
                )}`
            );
        }

        redirect("/caregiver");
    }

    return (
        <div className="min-h-screen bg-[#F7F4EC] px-6 py-12">
            <div className="mx-auto w-full max-w-md">
                <Link
                    href="/"
                    className="mb-8 inline-block text-sm text-[#22281F]/50 hover:text-[#22281F]"
                >
                    ← Back
                </Link>

                <div className="mb-8">
                    <h1 className="font-[family-name:var(--font-display)] text-3xl font-medium tracking-tight text-[#22281F]">
                        {isRegister ? "Create your account" : "Welcome back"}
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-[#22281F]/60">
                        {isRegister
                            ? "Set up your account to manage Elato for a family member."
                            : "Sign in to manage Elato for your family member."}
                    </p>
                </div>

                <div className="mb-8 flex gap-2">
                    <Link
                        href="/login/caregiver"
                        className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                            !isRegister
                                ? "bg-[#4B6355] text-[#F7F4EC]"
                                : "text-[#22281F]/50 hover:bg-[#EFEAE0]"
                        }`}
                    >
                        Sign in
                    </Link>
                    <Link
                        href="/login/caregiver?mode=register"
                        className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                            isRegister
                                ? "bg-[#4B6355] text-[#F7F4EC]"
                                : "text-[#22281F]/50 hover:bg-[#EFEAE0]"
                        }`}
                    >
                        Register
                    </Link>
                </div>

                {params.message && (
                    <div className="mb-6 rounded-lg border border-[#A8552F]/30 bg-[#A8552F]/10 px-4 py-3 text-sm text-[#A8552F]">
                        {params.message}
                    </div>
                )}

                {isRegister ? (
                    <form action={registerCaregiver} className="space-y-5">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium text-[#22281F]/80">
                                Your name
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="e.g. Magdalena"
                                required
                                className="h-11 w-full rounded-lg border border-[#22281F]/15 bg-white px-4 text-sm outline-none transition-colors placeholder:text-[#22281F]/30 focus:border-[#4B6355] focus:ring-2 focus:ring-[#4B6355]/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium text-[#22281F]/80">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="you@example.com"
                                required
                                className="h-11 w-full rounded-lg border border-[#22281F]/15 bg-white px-4 text-sm outline-none transition-colors placeholder:text-[#22281F]/30 focus:border-[#4B6355] focus:ring-2 focus:ring-[#4B6355]/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-[#22281F]/80">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="Create a password"
                                required
                                className="h-11 w-full rounded-lg border border-[#22281F]/15 bg-white px-4 text-sm outline-none transition-colors placeholder:text-[#22281F]/30 focus:border-[#4B6355] focus:ring-2 focus:ring-[#4B6355]/20"
                            />
                        </div>
                        <button
                            type="submit"
                            className="h-11 w-full rounded-full bg-[#4B6355] px-4 text-sm font-medium text-[#F7F4EC] transition-colors hover:bg-[#3B4F44]"
                        >
                            Create account
                        </button>
                    </form>
                ) : (
                    <form action={loginCaregiver} className="space-y-5">
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium text-[#22281F]/80">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="you@example.com"
                                required
                                className="h-11 w-full rounded-lg border border-[#22281F]/15 bg-white px-4 text-sm outline-none transition-colors placeholder:text-[#22281F]/30 focus:border-[#4B6355] focus:ring-2 focus:ring-[#4B6355]/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="text-sm font-medium text-[#22281F]/80">
                                    Password
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="text-sm text-[#22281F]/50 hover:text-[#22281F] hover:underline"
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
                                className="h-11 w-full rounded-lg border border-[#22281F]/15 bg-white px-4 text-sm outline-none transition-colors placeholder:text-[#22281F]/30 focus:border-[#4B6355] focus:ring-2 focus:ring-[#4B6355]/20"
                            />
                        </div>
                        <button
                            type="submit"
                            className="h-11 w-full rounded-full bg-[#4B6355] px-4 text-sm font-medium text-[#F7F4EC] transition-colors hover:bg-[#3B4F44]"
                        >
                            Sign in
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
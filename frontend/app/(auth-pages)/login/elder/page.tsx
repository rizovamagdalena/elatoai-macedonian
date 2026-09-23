import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ElderRegisterForm from "@/components/auth/ElderRegisterForm";

export default async function ElderAuthPage({
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
        const { data: elder } = await supabase
            .from("elders")
            .select("elder_id")
            .eq("auth_user_id", user.id)
            .maybeSingle();

        if (elder) {
            redirect(`/elder`);
        }
        redirect("/");
    }

    const isRegister = params.mode === "register";

    async function loginElder(formData: FormData) {
        "use server";

        const username = formData.get("username")?.toString().trim();
        const password = formData.get("password")?.toString();

        if (!username || !password) {
            redirect(
                "/login/elder?message=Внеси корисничко име и лозинка."
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
                    "Не успеавме да те најавиме. Провери го корисничкото име и лозинката."
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
                "/login/elder?message=Твојот профил не можеше да се пронајде."
            );
        }

        redirect(`/elder`);
    }

    return (
        <div className="min-h-screen bg-[#F7F4EC] px-6 py-12 sm:py-16">
            <div className="mx-auto w-full max-w-lg">
                <Link
                    href="/"
                    className="mb-8 inline-block font-[family-name:var(--font-sans)] text-sm text-[#22281F]/50 hover:text-[#22281F]"
                >
                    ← Назад
                </Link>

                <div className="mb-8 text-center">
                    <h1 className="font-[family-name:var(--font-display)] text-3xl font-medium tracking-tight text-[#22281F] sm:text-4xl">
                        {isRegister
                            ? "Создади го твојот профил"
                            : "Добредојде назад"}
                    </h1>
                    <p className="mt-3 font-[family-name:var(--font-sans)] text-base leading-7 text-[#22281F]/60">
                        {isRegister
                            ? "Кажи ни малку за себе за разговорите да бидат поприлагодени."
                            : "Најави се и почни да разговараш со твојот придружник."}
                    </p>
                </div>

                <div className="mb-8 flex justify-center gap-2">
                    <Link
                        href="/login/elder"
                        className={`rounded-full px-5 py-2 font-[family-name:var(--font-sans)] text-sm font-medium transition-colors ${
                            !isRegister
                                ? "bg-[#4B6355] text-[#F7F4EC]"
                                : "text-[#22281F]/50 hover:bg-[#EFEAE0]"
                        }`}
                    >
                        Најави се
                    </Link>
                    <Link
                        href="/login/elder?mode=register"
                        className={`rounded-full px-5 py-2 font-[family-name:var(--font-sans)] text-sm font-medium transition-colors ${
                            isRegister
                                ? "bg-[#4B6355] text-[#F7F4EC]"
                                : "text-[#22281F]/50 hover:bg-[#EFEAE0]"
                        }`}
                    >
                        Регистрирај се
                    </Link>
                </div>

                {params.message && (
                    <div className="mb-6 rounded-xl border border-[#A8552F]/30 bg-[#A8552F]/10 px-5 py-4 text-base text-[#A8552F]">
                        {params.message}
                    </div>
                )}

                {isRegister ? (
                    <ElderRegisterForm />
                ) : (
                    <form action={loginElder} className="space-y-6">
                        <div className="space-y-2">
                            <label
                                htmlFor="username"
                                className="font-[family-name:var(--font-sans)] text-base font-medium text-[#22281F]/80"
                            >
                                Корисничко име
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                placeholder="Внеси го твоето корисничко име"
                                autoComplete="username"
                                required
                                className="h-14 w-full rounded-xl border border-[#22281F]/15 bg-white px-4 text-base text-[#22281F] outline-none transition-colors placeholder:text-[#22281F]/30 focus:border-[#4B6355] focus:ring-2 focus:ring-[#4B6355]/20"
                            />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="password"
                                className="font-[family-name:var(--font-sans)] text-base font-medium text-[#22281F]/80"
                            >
                                Лозинка
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="Внеси ја твојата лозинка"
                                autoComplete="current-password"
                                required
                                className="h-14 w-full rounded-xl border border-[#22281F]/15 bg-white px-4 text-base text-[#22281F] outline-none transition-colors placeholder:text-[#22281F]/30 focus:border-[#4B6355] focus:ring-2 focus:ring-[#4B6355]/20"
                            />
                        </div>

                        <button
                            type="submit"
                            className="h-14 w-full rounded-full bg-[#4B6355] text-base font-medium text-[#F7F4EC] transition-colors hover:bg-[#3B4F44]"
                        >
                            Разговарај
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
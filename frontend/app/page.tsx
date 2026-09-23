// app/page.tsx
import Link from "next/link";
import { User, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function LandingPage() {
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

        redirect(elder ? "/elder" : "/caregiver");
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-[#F7F4EC] px-6 py-16">
            <div className="w-full max-w-2xl text-center">
                <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-tight text-[#22281F] sm:text-5xl">
                    Дигитален придружник за постари лица
                </h1>

                <p className="mt-4 font-[family-name:var(--font-sans)] text-lg leading-8 text-[#22281F]/70">
                    Пријателски AI придружник кој разговара, слуша и помага
                    на постарите лица низ денот.
                </p>

                <p className="mt-10 font-[family-name:var(--font-sans)] text-sm text-[#22281F]/50">
                    Како го користиш Elato?
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Link
                        href="/login/elder"
                        className="group flex flex-col items-center rounded-2xl border border-[#22281F]/10 bg-white/40 p-8 text-center transition-colors hover:border-[#4B6355]/40 hover:bg-white/70"
                    >
                        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#DCE3D6]">
                            <User className="h-7 w-7 text-[#4B6355]" />
                        </div>

                        <h2 className="font-[family-name:var(--font-display)] text-lg font-medium text-[#22281F]">
                            Постар корисник
                        </h2>

                        <p className="mt-2 font-[family-name:var(--font-sans)] text-sm leading-6 text-[#22281F]/60">
                            Најави се за да разговараш со твојот придружник.
                        </p>
                    </Link>

                    <Link
                        href="/login/caregiver"
                        className="group flex flex-col items-center rounded-2xl border border-[#22281F]/10 bg-white/40 p-8 text-center transition-colors hover:border-[#4B6355]/40 hover:bg-white/70"
                    >
                        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#DCE3D6]">
                            <Users className="h-7 w-7 text-[#4B6355]" />
                        </div>

                        <h2 className="font-[family-name:var(--font-display)] text-lg font-medium text-[#22281F]">
                            Негувател
                        </h2>

                        <p className="mt-2 font-[family-name:var(--font-sans)] text-sm leading-6 text-[#22281F]/60">
                            Најави се за да управуваш со Elato за твоето
                            семејство.
                        </p>
                    </Link>
                </div>
            </div>
        </main>
    );
}
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getMyElders } from "@/db/elders";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight, LogOut } from "lucide-react";
import { BRAND } from "@/lib/branding";

export const revalidate = 0;
export const dynamic = "force-dynamic";

import { signOutAction } from "@/app/actions";

export default async function CaregiverHome() {
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const elders = await getMyElders(supabase, user.id);

    if (elders.length === 0) {
        return (
            <div className="min-h-screen bg-[#F7F4EC]">
                <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
                    <p className="font-[family-name:var(--font-sans)] text-sm text-[#4B6355]">
                        {BRAND.name}
                    </p>

                    <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-medium tracking-tight text-[#22281F] sm:text-5xl">
                        Постави го твојот прв придружник
                    </h1>

                    <p className="mt-4 max-w-md font-[family-name:var(--font-sans)] text-base leading-7 text-[#22281F]/70">
                        Создади профил за некој за кого се грижиш и управувај
                        со неговиот {BRAND.name} придружник, лекови и
                        семејни детали на едно место.
                    </p>

                    <Link href="/caregiver/elder/create" className="mt-8">
                        <Button
                            size="lg"
                            className="gap-2 rounded-full bg-[#4B6355] px-6 text-[#F7F4EC] hover:bg-[#3B4F44]"
                        >
                            <Plus className="h-5 w-5" />
                            Додади го првиот придружник
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F7F4EC]">
            <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
                {/* Header */}
                <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-tight text-[#22281F] sm:text-5xl">
                            Луѓето за кои се грижиш
                        </h1>

                        <p className="mt-3 max-w-xl font-[family-name:var(--font-sans)] text-base leading-7 text-[#22281F]/70">
                            Моментално управуваш со {elders.length}{" "}
                            {elders.length === 1
                                ? "придружник"
                                : "придружници"}
                            . Сè тука е подготвено да се ажурира кога ти
                            треба.
                        </p>
                    </div>

                    <form action={signOutAction}>
                        <Button
                            type="submit"
                            variant="ghost"
                            className="gap-2 text-[#22281F]/60 hover:bg-[#E9E2D0] hover:text-[#22281F]"
                        >
                            <LogOut className="h-4 w-4" />
                            Одјави се
                        </Button>
                    </form>
                </div>

                {/* Roster */}
                <div className="flex flex-col divide-y divide-[#22281F]/10 border-t border-[#22281F]/10">
                    {elders.map((elder) => {
                        const initials = elder.name
                            .split(" ")
                            .map((part) => part.charAt(0))
                            .join("")
                            .slice(0, 2)
                            .toUpperCase();

                        return (
                            <Link
                                key={elder.elder_id}
                                href={`/caregiver/elder/${elder.elder_id}`}
                                className="group flex items-center gap-5 py-6 transition-colors hover:bg-[#EFEAE0]/60 sm:px-4 sm:rounded-2xl"
                            >
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#DCE3D6]">
                                    <span className="font-[family-name:var(--font-display)] text-lg font-medium text-[#4B6355]">
                                        {initials}
                                    </span>
                                </div>

                                <div className="flex-1">
                                    <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[#22281F]">
                                        {elder.name}
                                    </h2>

                                    <p className="mt-1 font-[family-name:var(--font-sans)] text-sm text-[#22281F]/60">
                                        {elder.is_self_managed
                                            ? "Самостојно управуван"
                                            : "Управуван од семејство"}
                                    </p>
                                </div>

                                <ArrowRight className="h-5 w-5 shrink-0 text-[#22281F]/30 transition-transform group-hover:translate-x-1 group-hover:text-[#4B6355]" />
                            </Link>
                        );
                    })}
                </div>

                {/* Add another */}
                <Link
                    href="/caregiver/elder/create"
                    className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-[#22281F]/20 px-4 py-5 font-[family-name:var(--font-sans)] text-sm text-[#22281F]/60 transition-colors hover:border-[#4B6355]/40 hover:bg-[#EFEAE0]/40 hover:text-[#22281F]"
                >
                    <Plus className="h-4 w-4" />
                    Додади уште некого за кого се грижиш
                </Link>
            </div>
        </div>
    );
}
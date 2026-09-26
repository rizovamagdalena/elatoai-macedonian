import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/utils/supabase/server";
import { getMedicationsForElder } from "@/db/medications";
import { getFamilyMembersForElder } from "@/db/family_members";

import MedicationsSection from "@/components/ElderDashboard/MedicationsSection";
import FamilyMembersSection from "@/components/ElderDashboard/FamilyMembersSection";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function ElderManagePage() {
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: elder } = await supabase
        .from("elders")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (!elder) {
        notFound();
    }

    const medications = await getMedicationsForElder(supabase, elder.elder_id);
    const familyMembers = await getFamilyMembersForElder(
        supabase,
        elder.elder_id
    );

    return (
        <div className="min-h-screen bg-[#F7F4EC]">
            <div className="mx-auto max-w-2xl px-6 py-10 sm:py-14">
                {/* Back */}
                <Link
                    href="/elder"
                    className="inline-flex items-center gap-2 font-[family-name:var(--font-sans)] text-base text-[#22281F]/50 transition-colors hover:text-[#22281F]"
                >
                    <ArrowLeft className="h-5 w-5" />
                    Назад
                </Link>

                {/* Introduction */}
                <div className="mt-8 flex items-center gap-5">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#DCE3D6]">
                        <span className="font-[family-name:var(--font-display)] text-3xl font-medium text-[#4B6355]">
                            {elder.name.charAt(0).toUpperCase()}
                        </span>
                    </div>

                    <div>
                        <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium tracking-tight text-[#22281F]">
                            {elder.name}
                        </h1>

                        <p className="mt-1.5 font-[family-name:var(--font-sans)] text-base text-[#22281F]/60">
                            {elder.age ? `${elder.age} години` : ""}
                            {elder.age ? ", " : ""}
                            {elder.location_name}
                        </p>
                    </div>
                </div>

                {/* Medications */}
                <div className="mt-14">
                    <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[#22281F]">
                        Мои лекови
                    </h2>

                    <p className="mt-1.5 font-[family-name:var(--font-sans)] text-base text-[#22281F]/60">
                        {medications.length === 0
                            ? "Сè уште нема внесено лекови."
                            : `${medications.length} ${
                                  medications.length === 1 ? "лек" : "лекови"
                              } за сега.`}
                    </p>

                    <div className="mt-6">
                        <MedicationsSection
                            elderId={elder.elder_id}
                            initialMedications={medications}
                        />
                    </div>
                </div>

                {/* Family */}
                <div className="mt-14">
                    <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[#22281F]">
                        Моето семејство
                    </h2>

                    <p className="mt-1.5 font-[family-name:var(--font-sans)] text-base text-[#22281F]/60">
                        Лица за кои можеш да зборуваш во разговорите.
                    </p>

                    <div className="mt-6">
                        <FamilyMembersSection
                            elderId={elder.elder_id}
                            initialFamilyMembers={familyMembers}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
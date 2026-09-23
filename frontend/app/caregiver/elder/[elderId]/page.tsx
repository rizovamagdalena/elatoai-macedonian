import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { createClient } from "@/utils/supabase/server";
import { getElderForUser } from "@/db/elders";
import { getMedicationsForElder } from "@/db/medications";
import { getFamilyMembersForElder } from "@/db/family_members";

import MedicationsSection from "@/components/ElderDashboard/MedicationsSection";
import FamilyMembersSection from "@/components/ElderDashboard/FamilyMembersSection";
import ConversationSummaries from "@/components/ElderDashboard/ConversationSummaries";
import { Button } from "@/components/ui/button";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function CaregiverElderDashboard({
    params,
}: {
    params: { elderId: string };
}) {
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const elder = await getElderForUser(supabase, params.elderId, user.id);

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
            <div className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
                {/* Back */}
                <Link
                    href="/caregiver"
                    className="inline-flex items-center gap-2 font-[family-name:var(--font-sans)] text-sm text-[#22281F]/50 transition-colors hover:text-[#22281F]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Лица за кои се грижите
                </Link>

                {/* Introduction */}
                <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-5">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#DCE3D6]">
                            <span className="font-[family-name:var(--font-display)] text-2xl font-medium text-[#4B6355]">
                                {elder.name.charAt(0).toUpperCase()}
                            </span>
                        </div>

                        <div>
                            <h1 className="font-[family-name:var(--font-display)] text-3xl font-medium tracking-tight text-[#22281F] sm:text-4xl">
                                {elder.name}
                            </h1>

                            <p className="mt-1.5 font-[family-name:var(--font-sans)] text-sm text-[#22281F]/60">
                                {elder.age ? `${elder.age} years old, ` : ""}
                                speaks {elder.language_code}
                            </p>
                        </div>
                    </div>

                    <Link
                        href={`/caregiver/elder/${elder.elder_id}/edit`}
                        className="shrink-0"
                    >
                        {/* <Button
                            variant="outline"
                            className="gap-2 rounded-full border-[#22281F]/15 text-[#22281F] hover:bg-[#EFEAE0]"
                        >
                            <Pencil className="h-4 w-4" />
                            Уреди профил
                        </Button> */}
                    </Link>
                </div>

                {/* Medications */}
                <div className="mt-12">
                    <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[#22281F]">
                        Лекови
                    </h2>

                    <p className="mt-1 font-[family-name:var(--font-sans)] text-sm text-[#22281F]/60">
                        {medications.length === 0
                            ? "Nothing on file yet."
                            : `${medications.length} ${
                                  medications.length === 1
                                      ? "лек"
                                      : "лекови"
                              } за сега.`}
                    </p>

                    <div className="mt-5">
                        <MedicationsSection
                            elderId={elder.elder_id}
                            initialMedications={medications}
                        />
                    </div>
                </div>

                {/* Family */}
                <div className="mt-12">
                    <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[#22281F]">
                        Семејство
                    </h2>

                    <p className="mt-1 font-[family-name:var(--font-sans)] text-sm text-[#22281F]/60">
                        Лица за кои {elder.name} може да зборува во разговорите.
                    </p>

                    <div className="mt-5">
                        <FamilyMembersSection
                            elderId={elder.elder_id}
                            initialFamilyMembers={familyMembers}
                        />
                    </div>
                </div>

                {/* Recent conversations */}
                <div className="mt-12 border-t border-[#22281F]/10 pt-10">
                    <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-[#22281F]">
                        Неодамнешни разговори
                    </h2>

                    <p className="mt-1 font-[family-name:var(--font-sans)] text-sm text-[#22281F]/60">
                        Краток преглед на неодамнешните разговори со асистентот.
                    </p>

                    <div className="mt-5">
                        <ConversationSummaries elderId={elder.elder_id} />
                    </div>
                </div>
            </div>
        </div>
    );
}
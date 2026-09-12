import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
    ArrowLeft,
    CalendarDays,
    Clock,
    Pencil,
    User,
    Users,
    Pill,
} from "lucide-react";

import { createClient } from "@/utils/supabase/server";
import { getElderForUser } from "@/db/elders";
import { getMedicationsForElder } from "@/db/medications";
import { getFamilyMembersForElder } from "@/db/family_members";

import MedicationsSection from "@/app/components/ElderDashboard/MedicationsSection";
import FamilyMembersSection from "@/app/components/ElderDashboard/FamilyMembersSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function ElderDashboard({
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

    const elder = await getElderForUser(
        supabase,
        params.elderId,
        user.id
    );

    if (!elder) {
        notFound();
    }

    const medications = await getMedicationsForElder(
        supabase,
        elder.elder_id
    );

    const familyMembers = await getFamilyMembersForElder(
        supabase,
        elder.elder_id
    );

    return (
        <div className="w-full max-w-5xl mx-auto px-6 py-8">
            {/* Back */}
            <Link
                href="/home"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
                <ArrowLeft className="h-4 w-4" />
                My Elders
            </Link>

            {/* Profile header */}
            <Card className="mb-8 overflow-hidden border-border/60">
                <CardContent className="p-0">
                    <div className="p-6 sm:p-8">
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-5">
                                {/* Avatar */}
                                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <span className="text-3xl font-semibold">
                                        {elder.name
                                            .charAt(0)
                                            .toUpperCase()}
                                    </span>
                                </div>

                                {/* Basic information */}
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                                            {elder.name}
                                        </h1>

                                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                            Family-managed
                                        </span>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                                        {elder.age && (
                                            <span className="inline-flex items-center gap-1.5">
                                                <User className="h-4 w-4" />
                                                {elder.age} years old
                                            </span>
                                        )}

                                        <span className="inline-flex items-center gap-1.5">
                                            <CalendarDays className="h-4 w-4" />
                                            {elder.language_code}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Edit */}
                            <Link
                                href={`/elder/${elder.elder_id}/edit`}
                                className="shrink-0"
                            >
                                <Button
                                    variant="outline"
                                    className="w-full sm:w-auto gap-2"
                                >
                                    <Pencil className="h-4 w-4" />
                                    Edit profile
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-2 border-t border-border/60 sm:grid-cols-3">
                        <div className="flex items-center gap-3 p-4 sm:p-5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                                <Pill className="h-4 w-4" />
                            </div>

                            <div>
                                <p className="text-lg font-semibold">
                                    {medications.length}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Medications
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 border-l border-border/60 p-4 sm:p-5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                                <Users className="h-4 w-4" />
                            </div>

                            <div>
                                <p className="text-lg font-semibold">
                                    {familyMembers.length}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Family members
                                </p>
                            </div>
                        </div>

                        <div className="hidden items-center gap-3 border-l border-border/60 p-5 sm:flex">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                                <Clock className="h-4 w-4" />
                            </div>

                            <div>
                                <p className="text-sm font-medium">
                                    Companion
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Macedonian · Active
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Page introduction */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold">
                    Manage {elder.name}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                    Keep their personal information, medications, and family
                    context up to date.
                </p>
            </div>

            {/* Today's medication overview */}
            <Card className="mb-6 border-border/60">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Clock className="h-5 w-5" />
                        </div>

                        <div>
                            <h3 className="font-semibold">
                                Today&apos;s medication schedule
                            </h3>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Medication reminders and confirmations will
                                appear here.
                            </p>
                        </div>
                    </div>

                    {medications.length === 0 ? (
                        <div className="mt-5 rounded-xl border border-dashed border-border p-5 text-center">
                            <Pill className="mx-auto h-5 w-5 text-muted-foreground" />

                            <p className="mt-2 text-sm font-medium">
                                No medications scheduled
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                                Add medications below to start keeping track
                                of their daily schedule.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-5 rounded-xl bg-muted/40 p-4">
                            <p className="text-sm text-muted-foreground">
                                {medications.length === 1
                                    ? "1 medication"
                                    : `${medications.length} medications`}{" "}
                                currently on file.
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                                Detailed scheduling and confirmation can be
                                added here next.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Medications */}
            <div className="mb-6">
                <MedicationsSection
                    elderId={elder.elder_id}
                    initialMedications={medications}
                />
            </div>

            {/* Family */}
            <div className="mb-6">
                <FamilyMembersSection
                    elderId={elder.elder_id}
                    initialFamilyMembers={familyMembers}
                />
            </div>

            {/* Bottom profile reminder */}
            <Card className="border-border/60 bg-muted/30">
                <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="font-medium">
                            Keep {elder.name}&apos;s profile up to date
                        </h3>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Update their basic information or companion
                            preferences whenever something changes.
                        </p>
                    </div>

                    <Link
                        href={`/elder/${elder.elder_id}/edit`}
                        className="shrink-0"
                    >
                        <Button variant="outline" className="gap-2">
                            <Pencil className="h-4 w-4" />
                            Edit profile
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
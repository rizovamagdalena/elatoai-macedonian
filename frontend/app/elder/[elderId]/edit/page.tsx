import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getElderForUser } from "@/db/elders";
import {
    ArrowLeft,
    Check,
    KeyRound,
    MessageCircle,
    User,
} from "lucide-react";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function EditElderPage({
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

    async function updateElder(formData: FormData) {
        "use server";

        const supabase = createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            redirect("/login");
        }

        const elderId = params.elderId;

        // Make sure this caregiver actually has access
        // to this elder before updating anything.
        const existingElder = await getElderForUser(
            supabase,
            elderId,
            user.id
        );

        if (!existingElder) {
            notFound();
        }

        const name = formData.get("name")?.toString().trim();

        const ageValue = formData
            .get("age")
            ?.toString()
            .trim();

        const toneDescription = formData
            .get("toneDescription")
            ?.toString()
            .trim();

        const firstMessagePrompt = formData
            .get("firstMessagePrompt")
            ?.toString()
            .trim();

        if (!name) {
            return;
        }

        const age = ageValue ? Number(ageValue) : null;

        if (
            ageValue &&
            (Number.isNaN(age) || age! < 0)
        ) {
            return;
        }

        const { error } = await supabase
            .from("elders")
            .update({
                name,
                age,
                tone_description: toneDescription || null,
                first_message_prompt:
                    firstMessagePrompt || null,
            })
            .eq("elder_id", elderId);

        if (error) {
            console.error(
                "Failed to update elder:",
                error
            );
            return;
        }

        redirect(`/elder/${elderId}`);
    }

    return (
        <div className="w-full max-w-3xl mx-auto px-6 py-8">
            {/* Back */}
            <Link
                href={`/elder/${elder.elder_id}`}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to {elder.name}
            </Link>

            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <span className="text-xl font-semibold">
                            {elder.name
                                .charAt(0)
                                .toUpperCase()}
                        </span>
                    </div>

                    <div>
                        <p className="text-sm text-muted-foreground">
                            Companion profile
                        </p>

                        <h1 className="text-3xl font-semibold tracking-tight">
                            Edit {elder.name}
                        </h1>
                    </div>
                </div>

                <p className="mt-4 max-w-2xl text-muted-foreground">
                    Update {elder.name}&apos;s personal information
                    and customize how Elato communicates with them.
                </p>
            </div>

            <form
                action={updateElder}
                className="space-y-6"
            >
                {/* About */}
                <section className="overflow-hidden rounded-2xl border border-border/60 bg-background">
                    <div className="border-b border-border/60 p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                                <User className="h-5 w-5" />
                            </div>

                            <div>
                                <h2 className="font-semibold">
                                    Personal information
                                </h2>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Basic information about the person
                                    using Elato.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-5 p-6 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label
                                htmlFor="name"
                                className="text-sm font-medium"
                            >
                                Name
                            </label>

                            <input
                                id="name"
                                name="name"
                                type="text"
                                defaultValue={elder.name}
                                required
                                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="age"
                                className="text-sm font-medium"
                            >
                                Age
                            </label>

                            <input
                                id="age"
                                name="age"
                                type="number"
                                min="0"
                                defaultValue={elder.age ?? ""}
                                placeholder="Optional"
                                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>
                </section>

                {/* Account */}
                <section className="overflow-hidden rounded-2xl border border-border/60 bg-background">
                    <div className="border-b border-border/60 p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                                <KeyRound className="h-5 w-5" />
                            </div>

                            <div>
                                <h2 className="font-semibold">
                                    Account access
                                </h2>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Login information used by the elder
                                    to access their companion.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="space-y-2">
                            <label
                                htmlFor="username"
                                className="text-sm font-medium"
                            >
                                Username
                            </label>

                            <input
                                id="username"
                                type="text"
                                value={elder.username ?? ""}
                                disabled
                                readOnly
                                className="h-11 w-full rounded-xl border border-border bg-muted/50 px-4 text-sm text-muted-foreground"
                            />

                            <p className="text-xs text-muted-foreground">
                                The username cannot be changed at the
                                moment.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Companion */}
                <section className="overflow-hidden rounded-2xl border border-border/60 bg-background">
                    <div className="border-b border-border/60 p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <MessageCircle className="h-5 w-5" />
                            </div>

                            <div>
                                <h2 className="font-semibold">
                                    Companion preferences
                                </h2>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Customize the way Elato talks and
                                    interacts with {elder.name}.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 p-6">
                        {/* Tone */}
                        <div className="space-y-2">
                            <label
                                htmlFor="toneDescription"
                                className="text-sm font-medium"
                            >
                                How should Elato speak?
                            </label>

                            <textarea
                                id="toneDescription"
                                name="toneDescription"
                                defaultValue={
                                    elder.tone_description ?? ""
                                }
                                placeholder="e.g. warm, patient, friendly, and simple to understand"
                                rows={4}
                                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />

                            <p className="text-xs text-muted-foreground">
                                Describe the tone and communication style
                                that would work best for this person.
                            </p>
                        </div>

                        {/* Greeting */}
                        <div className="space-y-2">
                            <label
                                htmlFor="firstMessagePrompt"
                                className="text-sm font-medium"
                            >
                                First greeting
                            </label>

                            <textarea
                                id="firstMessagePrompt"
                                name="firstMessagePrompt"
                                defaultValue={
                                    elder.first_message_prompt ?? ""
                                }
                                placeholder={`e.g. Greet ${elder.name} warmly and ask how their morning is going.`}
                                rows={4}
                                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />

                            <p className="text-xs text-muted-foreground">
                                Optional. Leave empty to use Elato&apos;s
                                default greeting.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Save area */}
                <div className="sticky bottom-4 z-10 rounded-2xl border border-border/60 bg-background/95 p-4 shadow-lg backdrop-blur">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="hidden sm:block">
                            <p className="text-sm font-medium">
                                Ready to save?
                            </p>

                            <p className="text-xs text-muted-foreground">
                                Your changes will update {elder.name}&apos;s
                                profile.
                            </p>
                        </div>

                        <div className="flex w-full gap-3 sm:w-auto">
                            <Link
                                href={`/elder/${elder.elder_id}`}
                                className="flex h-11 flex-1 items-center justify-center rounded-xl border border-border px-5 text-sm font-medium transition-colors hover:bg-muted sm:flex-none"
                            >
                                Cancel
                            </Link>

                            <button
                                type="submit"
                                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:flex-none"
                            >
                                <Check className="h-4 w-4" />
                                Save changes
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
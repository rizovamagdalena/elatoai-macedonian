import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import CreateElderForm from "@/app/components/CreateElder/CreateElderForm";

export default async function CreateElderPage() {
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <div className="w-full max-w-3xl mx-auto px-6 py-8 md:py-10">
            <Link
                href="/home"
                className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to my companions
            </Link>

            <div className="mb-8">
                <p className="mb-2 text-sm font-medium text-primary">
                    New companion
                </p>

                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                    Create an elder profile
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                    Set up Elato for an older family member. You can add their
                    basic information, create their login, and personalize how
                    their companion communicates.
                </p>
            </div>

            <CreateElderForm />
        </div>
    );
}
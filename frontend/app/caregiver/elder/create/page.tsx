import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import CreateElderForm from "@/components/CreateElder/CreateElderForm";

export default async function CreateElderPage() {
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <div className="min-h-screen bg-[#F7F4EC] px-6 py-8 md:py-12">
            <div className="mx-auto w-full max-w-3xl">
                <Link
                    href="/"
                    className="mb-8 inline-flex items-center gap-2 text-sm text-[#22281F]/50 transition-colors hover:text-[#22281F]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Назад кон моите корисници
                </Link>

                <div className="mb-8">
                    <p className="mb-2 text-sm font-medium text-[#4B6355]">
                        Нов корисник
                    </p>

                    <h1 className="font-[family-name:var(--font-display)] text-3xl font-medium tracking-tight text-[#22281F] md:text-4xl">
                        Креирај профил за возрасен
                    </h1>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#22281F]/50 md:text-base">
                        Поставете го Паметниот Пријател за повозрасен член на семејството.
                        Можете да ги внесете неговите основни информации,
                        да креирате податоци за најава и да го прилагодите
                        начинот на кој асистентот ќе комуницира со него.
                    </p>
                </div>

                <CreateElderForm />
            </div>
        </div>
    );
}
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { MessageCircle, Smartphone, Settings } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";

export const revalidate = 0;
export const dynamic = "force-dynamic";
import { signOutAction } from "@/app/actions";

export default async function ElderHome() {
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

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F4EC] px-6 py-12">
            <div className="flex w-full max-w-xl flex-col items-center text-center">
                <h1 className="font-[family-name:var(--font-display)] text-5xl font-medium tracking-tight text-[#22281F] sm:text-6xl">
                    Здраво, {elder.name}
                </h1>

                <p className="mt-4 font-[family-name:var(--font-sans)] text-xl leading-8 text-[#22281F]/70">
                    Тука сум кога сакаш да разговараме.
                </p>

                <div className="mt-12 flex w-full flex-col gap-4">
                    <Link href="/elder/chat" className="w-full">
                        <Button className="h-20 w-full gap-3 rounded-full bg-[#4B6355] text-xl font-medium text-[#F7F4EC] hover:bg-[#3B4F44]">
                            <MessageCircle className="h-7 w-7" />
                            Разговарај
                        </Button>
                    </Link>

                    <Link href="/elder/device" className="w-full">
                        <Button
                            variant="outline"
                            className="h-16 w-full gap-3 rounded-full border-[#22281F]/20 text-lg font-medium text-[#22281F] hover:bg-[#EFEAE0]"
                        >
                            <Smartphone className="h-6 w-6" />
                            Разговарај преку уред
                        </Button>
                    </Link>

                    {elder.is_self_managed && (
                        <Link href="/elder/manage" className="w-full">
                            <Button
                                variant="outline"
                                className="h-16 w-full gap-3 rounded-full border-[#22281F]/20 text-lg font-medium text-[#22281F] hover:bg-[#EFEAE0]"
                            >
                                <Settings className="h-6 w-6" />
                                Мои информации
                            </Button>
                        </Link>
                    )}
                </div>

                <form action={signOutAction} className="mt-10">
                    <Button
                        type="submit"
                        variant="outline"
                        className="rounded-full border-[#22281F]/15 text-base text-[#22281F]/70 hover:bg-[#EFEAE0] hover:text-[#22281F]"
                    >
                        Одјави се
                    </Button>
                </form>
            </div>
        </div>
    );
}
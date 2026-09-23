"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { createElder } from "@/db/elders";
import { createElderAuthAccount } from "@/app/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    UserRound,
    KeyRound,
    MessageCircle,
    CheckCircle2,
    Loader2,
} from "lucide-react";

export default function CreateElderForm() {
    const router = useRouter();
    const supabase = createClient();

    const [name, setName] = useState("");
    const [age, setAge] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [toneDescription, setToneDescription] = useState(
        "топол, трпелив и лесен за разбирање"
    );

    const [firstMessagePrompt, setFirstMessagePrompt] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setError(null);

        if (!name.trim()) {
            setError("Ве молиме внесете име.");
            return;
        }

        if (!username.trim()) {
            setError("Ве молиме внесете корисничко име.");
            return;
        }

        if (!password) {
            setError("Ве молиме внесете лозинка.");
            return;
        }

        setSubmitting(true);

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            const authResult = await createElderAuthAccount(
                username.trim(),
                password
            );

            if (!authResult.success) {
                setError(
                    authResult.error ??
                        "Неуспешно креирање на профилот за корисникот."
                );
                return;
            }

            const elder = await createElder(supabase, user.id, {
                name: name.trim(),
                age: age ? parseInt(age, 10) : null,
                tone_description: toneDescription.trim(),
                first_message_prompt:
                    firstMessagePrompt.trim() || null,
                language_code: "mk-MK",
                is_self_managed: false,
                username: username.trim(),
                auth_user_id: authResult.userId,
            });

            if (elder) {
                router.push(`/elder/${elder.elder_id}`);
            }
        } catch (err) {
            console.error(err);

            setError(
                "Се појави проблем при креирањето на профилот. Ве молиме обидете се повторно."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Основни информации */}
            <section className="space-y-5 rounded-2xl border border-[#22281F]/10 bg-white/40 p-6">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#4B6355]/10">
                        <UserRound className="h-5 w-5 text-[#4B6355]" />
                    </div>

                    <div>
                        <h2 className="font-[family-name:var(--font-display)] text-lg font-medium text-[#22281F]">
                            За корисникот
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-[#22281F]/50">
                            Започнете со внесување на основните информации за
                            лицето кое ќе го користи Elato.
                        </p>
                    </div>
                </div>

                <div className="grid gap-5">
                    <div className="grid gap-2">
                        <Label
                            htmlFor="name"
                            className="text-[#22281F]/80"
                        >
                            Име
                            <span className="ml-1 text-[#A8552F]">*</span>
                        </Label>

                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="пр. Верка"
                            className="h-12 rounded-xl border-[#22281F]/15 bg-white text-base focus-visible:ring-[#4B6355]"
                        />

                        <p className="text-sm text-[#22281F]/50">
                            Ова е името со кое Elato ќе му се обраќа на
                            корисникот.
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label
                            htmlFor="age"
                            className="text-[#22281F]/80"
                        >
                            Возраст
                        </Label>

                        <Input
                            id="age"
                            type="number"
                            min="1"
                            max="120"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            placeholder="пр. 78"
                            className="h-12 rounded-xl border-[#22281F]/15 bg-white text-base focus-visible:ring-[#4B6355]"
                        />

                        <p className="text-sm text-[#22281F]/50">
                            Опционално. Ова може да го додадете и подоцна.
                        </p>
                    </div>
                </div>
            </section>

            {/* Пристап до профилот */}
            <section className="space-y-5 rounded-2xl border border-[#22281F]/10 bg-white/40 p-6">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#4B6355]/10">
                        <KeyRound className="h-5 w-5 text-[#4B6355]" />
                    </div>

                    <div>
                        <h2 className="font-[family-name:var(--font-display)] text-lg font-medium text-[#22281F]">
                            Пристап до профилот
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-[#22281F]/50">
                            Креирајте податоци за најава кои корисникот ќе ги
                            користи за пристап до Elato од својот уред.
                        </p>
                    </div>
                </div>

                <div className="grid gap-5">
                    <div className="rounded-xl border border-[#22281F]/10 bg-white/60 px-4 py-3">
                        <p className="text-sm font-medium text-[#22281F]">
                            Најава на корисникот
                        </p>

                        <p className="mt-1 text-sm leading-5 text-[#22281F]/50">
                            Чувајте ги овие податоци на безбедно место за да
                            може корисникот да ги користи при најавување.
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label
                            htmlFor="username"
                            className="text-[#22281F]/80"
                        >
                            Корисничко име
                            <span className="ml-1 text-[#A8552F]">*</span>
                        </Label>

                        <Input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="пр. verka"
                            className="h-12 rounded-xl border-[#22281F]/15 bg-white text-base focus-visible:ring-[#4B6355]"
                            autoComplete="off"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label
                            htmlFor="password"
                            className="text-[#22281F]/80"
                        >
                            Лозинка
                            <span className="ml-1 text-[#A8552F]">*</span>
                        </Label>

                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Креирајте лозинка"
                            className="h-12 rounded-xl border-[#22281F]/15 bg-white text-base focus-visible:ring-[#4B6355]"
                            autoComplete="new-password"
                        />

                        <p className="text-sm text-[#22281F]/50">
                            Корисникот ќе ја користи оваа лозинка заедно со
                            корисничкото име при најавување.
                        </p>
                    </div>
                </div>
            </section>

            {/* Преференции за асистентот */}
            <section className="space-y-5 rounded-2xl border border-[#22281F]/10 bg-white/40 p-6">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#4B6355]/10">
                        <MessageCircle className="h-5 w-5 text-[#4B6355]" />
                    </div>

                    <div>
                        <h2 className="font-[family-name:var(--font-display)] text-lg font-medium text-[#22281F]">
                            Преференции за асистентот
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-[#22281F]/50">
                            Прилагодете го начинот на кој Elato ќе комуницира
                            со корисникот.
                        </p>
                    </div>
                </div>

                <div className="grid gap-5">
                    <div className="grid gap-2">
                        <Label
                            htmlFor="tone"
                            className="text-[#22281F]/80"
                        >
                            Како да звучи Elato?
                        </Label>

                        <Textarea
                            id="tone"
                            value={toneDescription}
                            onChange={(e) =>
                                setToneDescription(e.target.value)
                            }
                            rows={3}
                            placeholder="пр. топол, трпелив, смирен и лесен за разбирање"
                            className="rounded-xl border-[#22281F]/15 bg-white text-base focus-visible:ring-[#4B6355]"
                        />

                        <p className="text-sm text-[#22281F]/50">
                            Опишете го тонот и начинот на комуникација што би
                            му одговарале на корисникот.
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label
                            htmlFor="firstMessage"
                            className="text-[#22281F]/80"
                        >
                            Прв поздрав
                        </Label>

                        <Textarea
                            id="firstMessage"
                            value={firstMessagePrompt}
                            onChange={(e) =>
                                setFirstMessagePrompt(e.target.value)
                            }
                            placeholder="пр. Топло поздрави ја Верка и прашај ја како ѝ поминува утрото."
                            rows={3}
                            className="rounded-xl border-[#22281F]/15 bg-white text-base focus-visible:ring-[#4B6355]"
                        />

                        <p className="text-sm text-[#22281F]/50">
                            Опционално. Оставете го празно за да се користи
                            стандардниот поздрав на Elato.
                        </p>
                    </div>
                </div>
            </section>

            {/* Грешка */}
            {error && (
                <div className="rounded-xl border border-[#A8552F]/30 bg-[#A8552F]/10 px-5 py-4 text-base text-[#A8552F]">
                    {error}
                </div>
            )}

            {/* Креирање на профилот */}
            <section className="rounded-2xl border border-[#22281F]/10 bg-white/40 p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                            <CheckCircle2 className="h-5 w-5 text-[#4B6355]" />
                        </div>

                        <div>
                            <p className="text-sm font-medium text-[#22281F]">
                                Подготвени сте за креирање на профилот?
                            </p>

                            <p className="mt-1 text-sm leading-5 text-[#22281F]/50">
                                По креирањето на профилот можете да додадете
                                лекови, членови на семејството и други
                                информации.
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="h-14 w-full shrink-0 rounded-full bg-[#4B6355] text-base font-medium text-[#F7F4EC] hover:bg-[#3B4F44] sm:w-auto sm:px-8"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Се креира...
                            </>
                        ) : (
                            "Креирај профил"
                        )}
                    </Button>
                </div>
            </section>
        </div>
    );
}
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MK_LOCATIONS } from "@/lib/mk-locations";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ElderRegisterForm() {
    const router = useRouter();
    const supabase = createClient();

    const [name, setName] = useState("");
    const [age, setAge] = useState("");
    const [location, setLocation] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [toneDescription, setToneDescription] = useState(
        "топол, трпелив и едноставен за разбирање"
    );
    const [firstMessagePrompt, setFirstMessagePrompt] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");

        if (!name.trim()) {
            setError("Внеси го твоето име.");
            return;
        }
        if (!username.trim()) {
            setError("Избери корисничко име.");
            return;
        }
        if (password.length < 6) {
            setError("Лозинката мора да има најмалку 6 знаци.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Лозинките не се совпаѓаат.");
            return;
        }

        const selectedLocation = MK_LOCATIONS.find(
            (item) => item.name === location
        );

        if (!selectedLocation) {
            setError("Избери го твоето место на живеење.");
            return;
        }

        setLoading(true);

        try {
            const normalizedUsername = username.trim().toLowerCase();
            const email = `${normalizedUsername}@elder.elato.local`;

            const { data: existingUsername } = await supabase
                .from("elders")
                .select("elder_id")
                .eq("username", normalizedUsername)
                .maybeSingle();

            if (existingUsername) {
                throw new Error(
                    "Тоа корисничко име веќе се користи. Избери друго."
                );
            }

            const { data: authData, error: authError } =
                await supabase.auth.signUp({ email, password });

            if (authError) {
                throw new Error(authError.message);
            }
            if (!authData.user) {
                throw new Error("Не успеавме да ја креираме сметката.");
            }

            const { error: elderError } = await supabase
                .from("elders")
                .insert({
                    name: name.trim(),
                    age: age ? Number(age) : null,
                    location_name: selectedLocation.name,
                    location_lat: selectedLocation.lat,
                    location_lon: selectedLocation.lon,
                    tone_description: toneDescription.trim(),
                    first_message_prompt: firstMessagePrompt.trim() || null,
                    language_code: "mk-MK",
                    is_self_managed: true,
                    username: normalizedUsername,
                    auth_user_id: authData.user.id,
                })
                .select("elder_id")
                .single();

            if (elderError) {
                throw new Error(elderError.message);
            }

            router.push(`/elder`);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Нешто тргна наопаку. Обиди се повторно."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5 rounded-2xl border border-[#22281F]/10 bg-white/40 p-6">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-medium text-[#22281F]">
                    За тебе
                </h2>

                <div className="space-y-2">
                    <Label htmlFor="name" className="text-[#22281F]/80">
                        Твоето име и презиме
                    </Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="на пр. Верка"
                        autoComplete="name"
                        className="h-12 rounded-xl border-[#22281F]/15 bg-white text-base focus-visible:ring-[#4B6355]"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="age" className="text-[#22281F]/80">
                        Твоите години{" "}
                        <span className="font-normal text-[#22281F]/40">
                            (незадолжително)
                        </span>
                    </Label>
                    <Input
                        id="age"
                        type="number"
                        min="1"
                        max="120"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="на пр. 72"
                        className="h-12 rounded-xl border-[#22281F]/15 bg-white text-base focus-visible:ring-[#4B6355]"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="location" className="text-[#22281F]/80">
                        Каде живееш?
                    </Label>
                    <select
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="h-12 w-full rounded-xl border border-[#22281F]/15 bg-white px-3 text-base text-[#22281F]"
                        required
                    >
                        <option value="" disabled>
                            Избери град или општина
                        </option>
                        {MK_LOCATIONS.map((item) => (
                            <option key={item.name} value={item.name}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                    <p className="text-sm text-[#22281F]/50">
                        Ова помага Elato да знае за времетето кај тебе.
                    </p>
                </div>
            </div>

            <div className="space-y-5 rounded-2xl border border-[#22281F]/10 bg-white/40 p-6">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-medium text-[#22281F]">
                    Твојата сметка
                </h2>

                <div className="space-y-2">
                    <Label htmlFor="username" className="text-[#22281F]/80">
                        Корисничко име
                    </Label>
                    <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Избери корисничко име"
                        autoComplete="username"
                        className="h-12 rounded-xl border-[#22281F]/15 bg-white text-base focus-visible:ring-[#4B6355]"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password" className="text-[#22281F]/80">
                        Лозинка
                    </Label>
                    <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Создади лозинка"
                        autoComplete="new-password"
                        className="h-12 rounded-xl border-[#22281F]/15 bg-white text-base focus-visible:ring-[#4B6355]"
                        required
                    />
                    <p className="text-sm text-[#22281F]/50">
                        Најмалку 6 знаци.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label
                        htmlFor="confirmPassword"
                        className="text-[#22281F]/80"
                    >
                        Потврди лозинка
                    </Label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Внеси ја лозинката повторно"
                        autoComplete="new-password"
                        className="h-12 rounded-xl border-[#22281F]/15 bg-white text-base focus-visible:ring-[#4B6355]"
                        required
                    />
                </div>
            </div>

            <div className="space-y-6 rounded-2xl border border-[#22281F]/10 bg-white/40 p-6">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-medium text-[#22281F]">
                    Направи го Elato твој
                </h2>

                <div className="space-y-2">
                    <Label
                        htmlFor="toneDescription"
                        className="text-[#22281F]/80"
                    >
                        Како сакаш Elato да разговара со тебе?
                    </Label>
                    <Textarea
                        id="toneDescription"
                        value={toneDescription}
                        onChange={(e) => setToneDescription(e.target.value)}
                        rows={3}
                        className="resize-none rounded-xl border-[#22281F]/15 bg-white text-base focus-visible:ring-[#4B6355]"
                    />
                </div>

                <div className="space-y-2">
                    <Label
                        htmlFor="firstMessagePrompt"
                        className="text-[#22281F]/80"
                    >
                        Кажи нешто за себе{" "}
                        <span className="font-normal text-[#22281F]/40">
                            (незадолжително)
                        </span>
                    </Label>
                    <Textarea
                        id="firstMessagePrompt"
                        value={firstMessagePrompt}
                        onChange={(e) =>
                            setFirstMessagePrompt(e.target.value)
                        }
                        placeholder="На пр. уживам во градинарство, стара музика и разговор за внуците."
                        rows={3}
                        className="resize-none rounded-xl border-[#22281F]/15 bg-white text-base focus-visible:ring-[#4B6355]"
                    />
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-[#A8552F]/30 bg-[#A8552F]/10 px-5 py-4 text-base text-[#A8552F]">
                    {error}
                </div>
            )}

            <Button
                type="submit"
                disabled={loading}
                className="h-14 w-full rounded-full bg-[#4B6355] text-base font-medium text-[#F7F4EC] hover:bg-[#3B4F44]"
            >
                {loading ? "Се создава твојот придружник..." : "Создади сметка"}
            </Button>
        </form>
    );
}
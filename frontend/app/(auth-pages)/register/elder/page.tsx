"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, ArrowLeft, Heart, LockKeyhole } from "lucide-react";

import { createClient } from "@/utils/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MK_LOCATIONS } from "@/lib/mk-locations";

export default function ElderRegisterPage() {
    const router = useRouter();
    const supabase = createClient();

    const [name, setName] = useState("");
    const [age, setAge] = useState("");
    const [location, setLocation] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [toneDescription, setToneDescription] = useState(
        "warm, patient, and simple to understand"
    );

    const [firstMessagePrompt, setFirstMessagePrompt] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        setError("");

        if (!name.trim()) {
            setError("Please enter your name.");
            return;
        }

        if (!username.trim()) {
            setError("Please choose a username.");
            return;
        }

        if (password.length < 6) {
            setError("Your password must be at least 6 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("The passwords do not match.");
            return;
        }

        setLoading(true);

        const selectedLocation = MK_LOCATIONS.find(
            (item) => item.name === location
        );

        if (!selectedLocation) {
            setError("Please select your town or municipality.");
            return;
        }

        try {
            const normalizedUsername = username.trim().toLowerCase();

            const email = `${normalizedUsername}@elder.elato.local`;

            /*
             * Check username before creating the Auth account.
             */
            const { data: existingUsername } = await supabase
                .from("elders")
                .select("elder_id")
                .eq("username", normalizedUsername)
                .maybeSingle();

            if (existingUsername) {
                throw new Error(
                    "That username is already being used. Please choose another one."
                );
            }

            /*
             * Create Supabase Auth account.
             */
            const {
                data: authData,
                error: authError,
            } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) {
                throw new Error(authError.message);
            }

            if (!authData.user) {
                throw new Error("We couldn't create your account.");
            }

            /*
             * Create elder profile.
             */
            const { data: elder, error: elderError } = await supabase
                .from("elders")
                .insert({
                    name: name.trim(),
                    age: age ? Number(age) : null,
                    location_name: selectedLocation.name,
                    location_lat: selectedLocation.lat,
                    location_lon: selectedLocation.lon,
                    tone_description: toneDescription.trim(),
                    first_message_prompt:
                        firstMessagePrompt.trim() || null,
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

            /*
             * Go directly to the main experience.
             */
            router.push(`/elder/${elder.elder_id}/chat`);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full max-w-2xl px-6 py-10 sm:py-14">
            {/* Back */}
            <Link
                href="/register"
                className="mb-8 inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-foreground"
            >
                <ArrowLeft className="h-5 w-5" />
                Back
            </Link>

            {/* Header */}
            <div className="mb-10 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                    <Heart className="h-10 w-10 text-primary" />
                </div>

                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Create your Elato companion
                </h1>

                <p className="mx-auto mt-3 max-w-lg text-base leading-7 text-muted-foreground">
                    Tell Elato a little about yourself so your conversations
                    can feel more personal and comfortable.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal information */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <User className="h-5 w-5 text-primary" />
                            </div>

                            <div>
                                <h2 className="text-lg font-semibold">
                                    About you
                                </h2>

                                <p className="text-sm text-muted-foreground">
                                    Just a few basic details.
                                </p>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <Label
                                htmlFor="name"
                                className="text-base"
                            >
                                Your name
                            </Label>

                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Verka"
                                autoComplete="name"
                                className="h-12 text-base"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="age"
                                className="text-base"
                            >
                                Your age{" "}
                                <span className="font-normal text-muted-foreground">
                                    (optional)
                                </span>
                            </Label>

                            <Input
                                id="age"
                                type="number"
                                min="1"
                                max="120"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                placeholder="e.g. 72"
                                className="h-12 text-base"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location" className="text-base">
                                Where do you live?
                            </Label>

                            <select
                                id="location"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="h-12 w-full rounded-md border border-input bg-background px-3 text-base"
                                required
                            >
                                <option value="" disabled>
                                    Select your town or municipality
                                </option>

                                {MK_LOCATIONS.map((item) => (
                                    <option key={item.name} value={item.name}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>

                            <p className="text-sm text-muted-foreground">
                                This helps Elato provide local information such as weather.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Account */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <LockKeyhole className="h-5 w-5 text-primary" />
                            </div>

                            <div>
                                <h2 className="text-lg font-semibold">
                                    Your account
                                </h2>

                                <p className="text-sm text-muted-foreground">
                                    You'll use these to sign in.
                                </p>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <Label
                                htmlFor="username"
                                className="text-base"
                            >
                                Username
                            </Label>

                            <Input
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Choose a username"
                                autoComplete="username"
                                className="h-12 text-base"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="password"
                                className="text-base"
                            >
                                Password
                            </Label>

                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Create a password"
                                autoComplete="new-password"
                                className="h-12 text-base"
                                required
                            />

                            <p className="text-sm text-muted-foreground">
                                At least 6 characters.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="confirmPassword"
                                className="text-base"
                            >
                                Confirm password
                            </Label>

                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                                placeholder="Enter your password again"
                                autoComplete="new-password"
                                className="h-12 text-base"
                                required
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Companion */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-4">
                        <div>
                            <h2 className="text-lg font-semibold">
                                Make Elato feel right for you
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                You can change these preferences later.
                            </p>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label
                                htmlFor="toneDescription"
                                className="text-base"
                            >
                                How would you like Elato to speak with you?
                            </Label>

                            <Textarea
                                id="toneDescription"
                                value={toneDescription}
                                onChange={(e) =>
                                    setToneDescription(e.target.value)
                                }
                                placeholder="e.g. warm, patient, and simple to understand"
                                rows={4}
                                className="resize-none text-base"
                            />

                            <p className="text-sm text-muted-foreground">
                                For example: warm, friendly, patient, or
                                simple.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="firstMessagePrompt"
                                className="text-base"
                            >
                                Tell Elato something about you{" "}
                                <span className="font-normal text-muted-foreground">
                                    (optional)
                                </span>
                            </Label>

                            <Textarea
                                id="firstMessagePrompt"
                                value={firstMessagePrompt}
                                onChange={(e) =>
                                    setFirstMessagePrompt(e.target.value)
                                }
                                placeholder="For example: I enjoy gardening, old music, and talking about my grandchildren."
                                rows={4}
                                className="resize-none text-base"
                            />

                            <p className="text-sm text-muted-foreground">
                                This can help Elato start conversations that
                                feel more personal.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Error */}
                {error && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-base text-destructive">
                        {error}
                    </div>
                )}

                {/* Create */}
                <Button
                    type="submit"
                    size="lg"
                    className="h-14 w-full text-base font-semibold"
                    disabled={loading}
                >
                    {loading
                        ? "Creating your companion..."
                        : "Create my Elato account"}
                </Button>

                <p className="text-center text-base text-muted-foreground">
                    Already have an account?{" "}
                    <Link
                        href="/login/elder"
                        className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80"
                    >
                        Sign in
                    </Link>
                </p>
            </form>
        </div>
    );
}
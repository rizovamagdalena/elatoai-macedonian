"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { createElder } from "@/db/elders";
import { createElderAuthAccount } from "@/app/actions";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
        "warm, patient, and simple to understand"
    );

    const [firstMessagePrompt, setFirstMessagePrompt] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setError(null);

        if (!name.trim()) {
            setError("Please enter a name.");
            return;
        }

        if (!username.trim()) {
            setError("Please enter a username.");
            return;
        }

        if (!password) {
            setError("Please enter a password.");
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

            // Create a Supabase Auth account for the elder
            const authResult = await createElderAuthAccount(
                username.trim(),
                password
            );

            if (!authResult.success) {
                setError(
                    authResult.error ??
                        "Failed to create elder account."
                );
                return;
            }

            // Create the elder profile and caregiver relationship
            const elder = await createElder(supabase, user.id, {
                name: name.trim(),
                age: age ? parseInt(age, 10) : null,
                tone_description: toneDescription.trim(),
                first_message_prompt:
                    firstMessagePrompt.trim() || null,
                language_code: "mk-MK",

                // This elder was created by a caregiver
                is_self_managed: false,

                username: username.trim(),

                // Connect the elder profile to the Auth account
                auth_user_id: authResult.userId,
            });

            if (elder) {
                router.push(`/elder/${elder.elder_id}`);
            }
        } catch (err) {
            console.error(err);

            setError(
                "Something went wrong creating the profile. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Basic information */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader>
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                            <UserRound className="h-5 w-5 text-primary" />
                        </div>

                        <div>
                            <CardTitle className="text-lg">
                                About the person
                            </CardTitle>

                            <CardDescription className="mt-1">
                                Start with some basic information about the
                                person who will use Elato.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="grid gap-5">
                    <div className="grid gap-2">
                        <Label htmlFor="name">
                            Name
                            <span className="ml-1 text-destructive">*</span>
                        </Label>

                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Verka"
                            className="h-11"
                        />

                        <p className="text-xs text-muted-foreground">
                            This is the name Elato will use when talking to
                            them.
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="age">Age</Label>

                        <Input
                            id="age"
                            type="number"
                            min="1"
                            max="120"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            placeholder="e.g. 78"
                            className="h-11"
                        />

                        <p className="text-xs text-muted-foreground">
                            Optional. You can add this later.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Account access */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader>
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                            <KeyRound className="h-5 w-5 text-primary" />
                        </div>

                        <div>
                            <CardTitle className="text-lg">
                                Account access
                            </CardTitle>

                            <CardDescription className="mt-1">
                                Create the credentials the elder will use to
                                access Elato from their own device.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="grid gap-5">
                    <div className="rounded-xl border bg-muted/40 px-4 py-3">
                        <p className="text-sm font-medium">
                            Elder login
                        </p>

                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Keep these credentials somewhere safe so the elder
                            can use them when signing in.
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="username">
                            Username
                            <span className="ml-1 text-destructive">*</span>
                        </Label>

                        <Input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) =>
                                setUsername(e.target.value)
                            }
                            placeholder="e.g. verka"
                            className="h-11"
                            autoComplete="off"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">
                            Password
                            <span className="ml-1 text-destructive">*</span>
                        </Label>

                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            placeholder="Create a password"
                            className="h-11"
                            autoComplete="new-password"
                        />

                        <p className="text-xs text-muted-foreground">
                            The elder will use this password together with
                            their username to sign in.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Companion preferences */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader>
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                            <MessageCircle className="h-5 w-5 text-primary" />
                        </div>

                        <div>
                            <CardTitle className="text-lg">
                                Companion preferences
                            </CardTitle>

                            <CardDescription className="mt-1">
                                Personalize how Elato communicates with them.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="grid gap-5">
                    <div className="grid gap-2">
                        <Label htmlFor="tone">
                            How should Elato sound?
                        </Label>

                        <Textarea
                            id="tone"
                            value={toneDescription}
                            onChange={(e) =>
                                setToneDescription(e.target.value)
                            }
                            rows={3}
                            placeholder="e.g. warm, patient, calm, and simple to understand"
                        />

                        <p className="text-xs text-muted-foreground">
                            Describe the tone and communication style that
                            would suit this person.
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="firstMessage">
                            First greeting
                        </Label>

                        <Textarea
                            id="firstMessage"
                            value={firstMessagePrompt}
                            onChange={(e) =>
                                setFirstMessagePrompt(e.target.value)
                            }
                            placeholder="e.g. Greet Verka warmly and ask how her morning is going."
                            rows={3}
                        />

                        <p className="text-xs text-muted-foreground">
                            Optional. Leave blank to use Elato's default
                            greeting.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Error */}
            {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {/* Final action */}
            <Card className="border-border/60 bg-muted/20 shadow-sm">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>

                        <div>
                            <p className="text-sm font-medium">
                                Ready to create the profile?
                            </p>

                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                You can manage medications, family members,
                                and other information after the profile is
                                created.
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={submitting}
                        size="lg"
                        className="w-full shrink-0 sm:w-auto"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            "Create elder profile"
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
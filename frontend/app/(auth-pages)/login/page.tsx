import Link from "next/link";
import { redirect } from "next/navigation";
import { User, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/server";

export default async function LoginPage() {
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Already logged in
    if (user) {
        redirect("/home");
    }

    return (
        <div className="w-full max-w-2xl px-6 py-12">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-semibold tracking-tight">
                    Welcome back
                </h1>

                <p className="mt-2 text-base text-muted-foreground">
                    How do you use Elato?
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Link href="/login/elder">
                    <Card className="h-full cursor-pointer border-border/60 transition-all hover:-translate-y-1 hover:shadow-md">
                        <CardContent className="flex h-full flex-col items-center p-8 text-center">
                            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                                <User className="h-7 w-7" />
                            </div>

                            <h2 className="text-lg font-semibold">
                                I'm an older adult
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                Sign in to talk with your Elato companion.
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/login/caregiver">
                    <Card className="h-full cursor-pointer border-border/60 transition-all hover:-translate-y-1 hover:shadow-md">
                        <CardContent className="flex h-full flex-col items-center p-8 text-center">
                            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                                <Users className="h-7 w-7" />
                            </div>

                            <h2 className="text-lg font-semibold">
                                I'm a caregiver
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                Sign in to manage Elato for your family member.
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                    href="/register"
                    className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                >
                    Create an account
                </Link>
            </p>
        </div>
    );
}
import Link from "next/link";
import { User, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function RegisterPage() {
    return (
        <div className="w-full max-w-2xl px-6 py-12">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-semibold tracking-tight">
                    Create your account
                </h1>

                <p className="mt-2 text-base text-muted-foreground">
                    How will you use Elato?
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Link href="/register/elder">
                    <Card className="h-full cursor-pointer border-border/60 transition-all hover:-translate-y-1 hover:shadow-md">
                        <CardContent className="flex h-full flex-col items-center p-8 text-center">
                            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                                <User className="h-7 w-7" />
                            </div>

                            <h2 className="text-lg font-semibold">
                                I'm an older adult
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                Use Elato as your personal voice companion.
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/register/caregiver">
                    <Card className="h-full cursor-pointer border-border/60 transition-all hover:-translate-y-1 hover:shadow-md">
                        <CardContent className="flex h-full flex-col items-center p-8 text-center">
                            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                                <Users className="h-7 w-7" />
                            </div>

                            <h2 className="text-lg font-semibold">
                                I'm a caregiver
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                Manage Elato for an older family member.
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                    href="/login"
                    className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                >
                    Sign in
                </Link>
            </p>
        </div>
    );
}
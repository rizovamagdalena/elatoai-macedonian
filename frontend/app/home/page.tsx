import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getMyElders } from "@/db/elders";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Plus,
    ArrowRight,
    Users,
    Heart,
    ChevronRight,
} from "lucide-react";
import { BRAND } from "@/lib/branding";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function ElderList() {
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const elders = await getMyElders(supabase, user.id);

    if (elders.length === 0) {
        return (
            <div className="w-full max-w-5xl mx-auto px-6 py-10">
                <div className="flex min-h-[70vh] items-center justify-center">
                    <Card className="w-full max-w-xl border-border/60 shadow-sm">
                        <CardContent className="flex flex-col items-center px-8 py-12 text-center">
                            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                                <Heart className="h-8 w-8 text-primary" />
                            </div>

                            <p className="mb-2 text-sm font-medium text-primary">
                                Welcome to {BRAND.name}
                            </p>

                            <h1 className="text-3xl font-semibold tracking-tight">
                                Set up your first companion
                            </h1>

                            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                                Create a profile for an older family member
                                and manage their {BRAND.name} companion,
                                medications, family information, and
                                preferences in one place.
                            </p>

                            <Link
                                href="/caregiver/elders/create"
                                className="mt-8"
                            >
                                <Button size="lg" className="gap-2">
                                    <Plus className="h-5 w-5" />
                                    Add your first companion
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto px-6 py-8 md:py-10">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>Caregiver dashboard</span>
                        </div>

                        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                            Your companions
                        </h1>

                        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
                            Keep track of the people you care about and manage
                            their {BRAND.name} companion from one place.
                        </p>
                    </div>

                    <Link href="/caregiver/elders/create">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add companion
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Overview */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card className="border-border/60">
                    <CardContent className="flex items-center gap-4 p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                            <Users className="h-5 w-5 text-primary" />
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground">
                                Managed companions
                            </p>

                            <p className="mt-1 text-2xl font-semibold">
                                {elders.length}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60">
                    <CardContent className="flex items-center gap-4 p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                            <Heart className="h-5 w-5 text-primary" />
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground">
                                Companion status
                            </p>

                            <p className="mt-1 text-sm font-medium">
                                All profiles are ready to manage
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Section heading */}
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">
                        People you manage
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Select a profile to view and update their information.
                    </p>
                </div>
            </div>

            {/* Elder cards */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {elders.map((elder) => {
                    const initials = elder.name
                        .split(" ")
                        .map((part) => part.charAt(0))
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();

                    return (
                        <Card
                            key={elder.elder_id}
                            className="group overflow-hidden border-border/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                        >
                            <CardHeader className="pb-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-14 w-14 border">
                                            <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div>
                                            <CardTitle className="text-xl">
                                                {elder.name}
                                            </CardTitle>

                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                                    {elder.is_self_managed
                                                        ? "Self-managed"
                                                        : "Family-managed"}
                                                </span>

                                                <span className="text-xs text-muted-foreground">
                                                    {elder.language_code}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="hidden rounded-full bg-muted/60 p-2 sm:flex">
                                        <Heart className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                <div className="mb-5 rounded-xl bg-muted/40 px-4 py-3">
                                    <p className="text-sm text-muted-foreground">
                                        Elato companion
                                    </p>

                                    <p className="mt-1 text-sm font-medium">
                                        Profile is ready to manage
                                    </p>
                                </div>

                                <Link
                                    href={`/elder/${elder.elder_id}`}
                                    className="block"
                                >
                                    <Button
                                        variant="outline"
                                        className="w-full justify-between gap-2"
                                    >
                                        <span>Manage profile</span>

                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    );
                })}

                {/* Add another companion */}
                <Link
                    href="/caregiver/elders/create"
                    className="group min-h-[260px]"
                >
                    <Card className="h-full border-dashed border-2 transition-all duration-200 hover:border-primary/40 hover:bg-muted/20">
                        <CardContent className="flex h-full flex-col items-center justify-center px-8 py-10 text-center">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border bg-background transition-colors group-hover:bg-primary/10">
                                <Plus className="h-5 w-5" />
                            </div>

                            <h3 className="font-semibold">
                                Add another companion
                            </h3>

                            <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                                Set up {BRAND.name} for another older family
                                member you care about.
                            </p>

                            <div className="mt-5 flex items-center gap-1 text-sm font-medium text-primary">
                                Create profile
                                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
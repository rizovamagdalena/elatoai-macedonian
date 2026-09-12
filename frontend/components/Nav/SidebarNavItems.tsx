"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { signOutAction } from "@/app/actions";

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
    items: SidebarNavItem[];
}

export function SidebarNav({
    className,
    items,
    ...props
}: SidebarNavProps) {
    const pathname = usePathname();

    return (
        <nav
            className={cn(
                "hidden md:flex w-full max-w-[220px] flex-col gap-2 px-4",
                className
            )}
            {...props}
        >
            {items.map((item) => {
                const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            buttonVariants({
                                variant: isActive ? "secondary" : "ghost",
                            }),
                            "w-full justify-start rounded-xl px-4 py-3 text-sm font-medium",
                            isActive && "bg-muted"
                        )}
                    >
                        <span className="mr-3">
                            {item.icon}
                        </span>

                        {item.title}
                    </Link>
                );
            })}

            <div className="my-3 h-px bg-border" />

            <form action={signOutAction}>
                <button
                    type="submit"
                    className={cn(
                        buttonVariants({ variant: "ghost" }),
                        "w-full justify-start rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                    )}
                >
                    Sign out
                </button>
            </form>
        </nav>
    );
}
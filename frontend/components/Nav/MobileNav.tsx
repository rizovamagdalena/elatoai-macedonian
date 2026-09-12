"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export function MobileNav({
    items,
}: {
    items: SidebarNavItem[];
}) {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur md:hidden">
            <div className="mx-auto flex h-16 max-w-md items-center justify-around px-6">
                {items.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex min-w-[80px] flex-col items-center justify-center gap-1"
                        >
                            <div
                                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground"
                                }`}
                            >
                                {item.icon}
                            </div>

                            <span
                                className={`text-xs ${
                                    isActive
                                        ? "font-medium text-foreground"
                                        : "text-muted-foreground"
                                }`}
                            >
                                {item.title}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
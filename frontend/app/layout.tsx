import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { Karla } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { BRAND } from "@/lib/branding";
import { Fraunces, Public_Sans } from "next/font/google";


const karla = Karla({
    subsets: ["latin"],
    variable: "--font-karla",
    display: "swap",
});

export const metadata: Metadata = {
    title: {
        default: BRAND.fullName,
        template: `%s | ${BRAND.fullName}`,
    },
    description:
        "Elato is a friendly voice companion designed to help older adults stay connected, supported, and independent.",
    applicationName: BRAND.name,
    robots: {
        index: false,
        follow: false,
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
};

const fraunces = Fraunces({
    subsets: ["latin", "latin-ext"],
    variable: "--font-display",
    display: "swap",
});

const publicSans = Public_Sans({
    subsets: ["latin", "latin-ext"],
    variable: "--font-sans",
    display: "swap",
});

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html
            lang="en"
            className={`${GeistSans.className} ${karla.variable}`}
            suppressHydrationWarning
        >
            <body className="min-h-screen bg-background text-foreground font-karla">
                {children}
                <Toaster />
            </body>
        </html>
    );
}
import { Metadata } from "next";
import { getOpenGraphMetadata } from "@/lib/utils";

export const metadata: Metadata = {
    title: "Elato",
    ...getOpenGraphMetadata("Elato"),
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <main className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md">
                {children}
            </div>
        </main>
    );
}
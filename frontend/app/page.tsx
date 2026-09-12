import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">
          Care companion powered by AI
        </h1>

        <p className="text-lg text-gray-600 mb-8">
           A friendly AI companion designed to talk, listen,
          and help older adults throughout their day.
        </p>

        <Link href="/login">
          <Button size="lg">
            Sign in
          </Button>
        </Link>
      </div>
    </main>
  );
}
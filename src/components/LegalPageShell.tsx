import Link from "next/link";
import { AngelIslandLogo } from "@/components/AngelIslandLogo";

type Props = {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
};

export function LegalPageShell({ title, lastUpdated, children }: Props) {
  return (
    <div className="relative min-h-screen bg-ethereal text-foreground">
      <main className="mx-auto max-w-2xl px-6 py-12 sm:px-8 sm:py-16">
        <Link href="/" className="inline-block">
          <AngelIslandLogo asLink={false} variant="mark" size="md" />
        </Link>
        <h1 className="font-serif text-3xl font-medium mt-8">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated: {lastUpdated}</p>
        <div className="legal-prose mt-8 space-y-8 text-sm leading-relaxed text-muted">
          {children}
        </div>
        <p className="mt-12 text-xs text-muted">
          <Link href="/" className="hover:text-foreground">
            Back to Angel Island
          </Link>
          {" · "}
          <Link href="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          {" · "}
          <Link href="/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
          {" · "}
          <Link href="/sign-in" className="hover:text-foreground">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}

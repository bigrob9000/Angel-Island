import Link from "next/link";
import { AngelIslandLogo } from "@/components/AngelIslandLogo";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ethereal text-foreground">
      <header className="sticky top-0 z-20 border-b border-foreground/10 bg-ethereal/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
          <AngelIslandLogo variant="mark" size="nav" className="shrink-0" />
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-muted hover:text-foreground">
              About
            </Link>
            <Link href="/sign-in" className="font-medium text-foreground hover:opacity-80">
              Sign in
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

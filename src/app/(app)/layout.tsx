"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { AngelIslandLogo } from "@/components/AngelIslandLogo";

const nav = [
  { href: "/home", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/search", label: "Search" },
  { href: "/rooms", label: "Rooms" },
  { href: "/messages", label: "Messages" },
  { href: "/profile", label: "Profile" },
] as const;

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/sign-in");
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-ethereal text-foreground">
      <header className="sticky top-0 z-20 border-b border-foreground/10 bg-ethereal/95 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6 sm:gap-8">
            <AngelIslandLogo variant="mark" size="nav" className="shrink-0" />
            <nav
              className="flex min-w-0 flex-1 flex-nowrap items-center justify-between overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Main"
            >
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`shrink-0 whitespace-nowrap text-sm font-medium transition-colors ${
                  pathname === href ? "text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            ))}
            <button
              type="button"
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                router.replace("/");
              }}
              className="shrink-0 whitespace-nowrap text-sm font-medium text-muted hover:text-foreground"
            >
              Sign out
            </button>
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}

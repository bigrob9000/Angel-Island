"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { AngelIslandLogo } from "@/components/AngelIslandLogo";
import { InboxProvider, useInbox } from "@/components/InboxProvider";

const nav = [
  { href: "/home", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/search", label: "Search" },
  { href: "/rooms", label: "Rooms" },
  { href: "/messages", label: "Messages" },
  { href: "/profile", label: "Profile" },
] as const;

function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { unreadCount } = useInbox();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/sign-in");
    });
  }, [router]);

  return (
    <header className="sticky top-0 z-20 border-b border-foreground/10 bg-ethereal/95 backdrop-blur-sm">
      <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6 sm:gap-8">
          <AngelIslandLogo variant="mark" size="nav" className="shrink-0" />
          <nav
            className="flex min-w-0 flex-1 flex-nowrap items-center justify-between overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Main"
          >
            {nav.map(({ href, label }) => {
              const isMessages = href === "/messages";
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative shrink-0 whitespace-nowrap text-sm font-medium transition-colors ${
                    active ? "text-foreground" : "text-muted hover:text-foreground"
                  }`}
                >
                  {label}
                  {isMessages && unreadCount > 0 && (
                    <span
                      className="absolute -right-2 top-0 h-2 w-2 rounded-full bg-foreground/80"
                      aria-label={`${unreadCount} unread conversation${unreadCount === 1 ? "" : "s"}`}
                    />
                  )}
                </Link>
              );
            })}
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
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <InboxProvider>
      <div className="min-h-screen bg-ethereal text-foreground">
        <AppNav />
        <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </InboxProvider>
  );
}

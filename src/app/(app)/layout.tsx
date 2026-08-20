"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { AngelIslandLogo } from "@/components/AngelIslandLogo";
import { SignOutButton } from "@/components/SignOutButton";
import { InboxProvider, useInbox } from "@/components/InboxProvider";
import { CollabProvider, useCollab } from "@/components/CollabProvider";
import { InboxMessageNotice } from "@/components/InboxMessageNotice";
import { InboxCollabNotice } from "@/components/InboxCollabNotice";
import { PushRegistration } from "@/components/PushRegistration";
import { PwaServiceWorkerRegistration } from "@/components/PwaServiceWorkerRegistration";

const nav = [
  { href: "/home", label: "Home", shortLabel: "Home" },
  { href: "/explore", label: "Explore", shortLabel: "Find" },
  { href: "/rooms", label: "Rooms", shortLabel: "Rooms" },
  { href: "/messages", label: "Messages", shortLabel: "Msgs" },
  { href: "/notifications", label: "Activity", shortLabel: "Act" },
  { href: "/collaborations", label: "Collabs", shortLabel: "Collab" },
  { href: "/profile", label: "Profile", shortLabel: "Me" },
] as const;

function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { unreadCount } = useInbox();
  const { unreadCount: collabUnreadCount } = useCollab();
  const activityUnreadCount = unreadCount + collabUnreadCount;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/sign-in");
    });
  }, [router]);

  return (
    <header className="sticky top-0 z-20 border-b border-foreground/10 bg-ethereal/95 backdrop-blur-sm">
      <div className="mx-auto w-full px-2 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <AngelIslandLogo variant="mark" size="compact" className="shrink-0" />
          <nav
            className="flex min-w-0 flex-1 items-center"
            aria-label="Main"
          >
            {nav.map(({ href, label, shortLabel }) => {
              const isMessages = href === "/messages";
              const isCollabs = href === "/collaborations";
              const isActivity = href === "/notifications";
              const active = pathname === href || pathname.startsWith(`${href}/`);
              const badgeCount = isMessages
                ? unreadCount
                : isCollabs
                  ? collabUnreadCount
                  : isActivity
                    ? activityUnreadCount
                    : 0;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  title={label}
                  className={`nav-pill nav-pill-header relative flex flex-1 items-center justify-center whitespace-nowrap text-[0.625rem] font-medium leading-none transition-colors sm:text-xs md:text-sm ${
                    active ? "nav-pill-active" : "text-muted hover:text-foreground"
                  }`}
                >
                  <span className="sm:hidden">{shortLabel}</span>
                  <span className="hidden sm:inline">{label}</span>
                  {badgeCount > 0 && (
                    <span
                      className="absolute -right-1 top-0 h-2 w-2 rounded-full bg-accent"
                      aria-label={`${badgeCount} unread ${isActivity ? "activity item" : isCollabs ? "collaboration" : "conversation"}${badgeCount === 1 ? "" : "s"}`}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
          <SignOutButton variant="header" className="shrink-0" />
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
      <CollabProvider>
        <div className="min-h-screen bg-ethereal text-foreground">
          <PushRegistration />
          <PwaServiceWorkerRegistration />
          <AppNav />
          <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">{children}</main>
          <InboxMessageNotice />
          <InboxCollabNotice />
        </div>
      </CollabProvider>
    </InboxProvider>
  );
}

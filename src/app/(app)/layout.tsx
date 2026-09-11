"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { NavCloudBackdrop } from "@/components/NavCloudBackdrop";

const navItems = [
  { href: "/home", key: "home" as const, shortKey: "homeShort" as const },
  { href: "/explore", key: "explore" as const, shortKey: "exploreShort" as const },
  { href: "/rooms", key: "rooms" as const, shortKey: "roomsShort" as const },
  { href: "/messages", key: "messages" as const, shortKey: "messagesShort" as const },
  { href: "/notifications", key: "activity" as const, shortKey: "activityShort" as const },
  { href: "/collaborations", key: "collaborations" as const, shortKey: "collaborationsShort" as const },
  { href: "/profile", key: "profile" as const, shortKey: "profileShort" as const },
] as const;

function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const { unreadCount } = useInbox();
  const { unreadCount: collabUnreadCount } = useCollab();
  const activityUnreadCount = unreadCount + collabUnreadCount;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/sign-in");
    });
  }, [router]);

  function unreadLabel(
    count: number,
    kind: "activity" | "collab" | "conversation",
  ): string {
    if (kind === "activity") {
      return count === 1 ? t("unreadActivity", { count }) : t("unreadActivityPlural", { count });
    }
    if (kind === "collab") {
      return count === 1 ? t("unreadCollab", { count }) : t("unreadCollabPlural", { count });
    }
    return count === 1 ? t("unreadConversation", { count }) : t("unreadConversationPlural", { count });
  }

  return (
    <header className="sticky top-0 z-20 border-b border-foreground/10 bg-ethereal/95 backdrop-blur-sm">
      <div className="mx-auto w-full px-2 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <AngelIslandLogo variant="mark" size="compact" className="relative z-[2] shrink-0" />
          <nav className="relative z-[1] flex min-w-0 flex-1 items-center overflow-visible" aria-label={t("main")}>
            {navItems.map(({ href, key, shortKey }) => {
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
              const label = t(key);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  title={label}
                  className={`nav-pill nav-pill-header relative flex flex-1 items-center justify-center overflow-visible whitespace-nowrap text-[0.625rem] font-medium leading-none transition-colors sm:text-xs md:text-sm ${
                    active ? "nav-pill-active" : "text-muted hover:text-foreground"
                  }`}
                >
                  {active && <NavCloudBackdrop />}
                  <span className="relative z-[1] sm:hidden">{t(shortKey)}</span>
                  <span className="relative z-[1] hidden sm:inline">{label}</span>
                  {badgeCount > 0 && (
                    <span
                      className="absolute -right-1 top-0 z-[2] h-2 w-2 rounded-full bg-accent"
                      aria-label={unreadLabel(
                        badgeCount,
                        isActivity ? "activity" : isCollabs ? "collab" : "conversation",
                      )}
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

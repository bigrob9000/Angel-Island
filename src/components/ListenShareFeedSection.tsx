"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ProfileAttribution } from "@/components/ProfileAttribution";
import { EmptyState } from "@/components/EmptyState";
import type { ListenShareFeedEntry } from "@/lib/listen-feed";
import { parseMediaEmbed } from "@/lib/media-embed";
import { listenShareHref, listenSharePreview } from "@/lib/profile-shares";
import { LISTEN_SLUG } from "@/lib/listen";

type Props = {
  entries: ListenShareFeedEntry[];
  loading?: boolean;
};

export function ListenShareFeedSection({ entries, loading = false }: Props) {
  const t = useTranslations("home.listenShare");
  const tc = useTranslations("common");

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="section-heading">{t("title")}</h2>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link href={`/rooms/${LISTEN_SLUG}`} className="text-sm text-muted hover:text-foreground">
            {t("visitRoom")}
          </Link>
          <Link
            href={`/rooms/${LISTEN_SLUG}?compose=share_work`}
            className="text-sm text-muted hover:text-foreground"
          >
            {t("shareYours")}
          </Link>
        </div>
      </div>
      <p className="section-copy">{t("copy")}</p>

      {loading ? (
        <p className="mt-4 text-sm text-muted">{tc("loading")}</p>
      ) : entries.length === 0 ? (
        <EmptyState className="mt-4" title={t("emptyTitle")} description={t("emptyDescription")}>
          <Link href={`/rooms/${LISTEN_SLUG}`} className="btn-secondary">
            {t("visitRoom")}
          </Link>
        </EmptyState>
      ) : (
        <ul className="mt-4 space-y-3">
          {entries.map(({ share, author }) => {
            const when = new Date(share.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });
            const media = share.media_url ? parseMediaEmbed(share.media_url) : null;

            return (
              <li key={share.id}>
                <Link href={listenShareHref(share.id)} className="surface-interactive block px-4 py-3">
                  <p className="font-medium text-foreground">{listenSharePreview(share)}</p>
                  <p className="mt-2 text-sm text-muted">
                    <ProfileAttribution profile={author} />
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {when}
                    {media ? ` · ${media.label}` : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

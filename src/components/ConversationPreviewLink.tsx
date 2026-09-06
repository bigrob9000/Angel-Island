"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { conversationStatusLabel } from "@/lib/i18n/labels";
import type { ConversationPreview } from "@/lib/conversations";

type Props = {
  conversation: ConversationPreview;
  className?: string;
};

export function ConversationPreviewLink({ conversation, className = "" }: Props) {
  const t = useTranslations("messages");
  const tStatus = useTranslations("status");
  const name =
    conversation.other?.first_name ?? conversation.other?.username ?? t("someone");
  const statusLabel = conversationStatusLabel(conversation.conversation_status, tStatus);
  const href = conversation.collaborationId
    ? `/collaborations/${conversation.collaborationId}`
    : `/messages/${conversation.id}`;

  return (
    <Link
      href={href}
      className={`surface-interactive flex items-start gap-3 px-4 py-3 text-foreground ${
        conversation.unread ? "ring-1 ring-accent/15" : ""
      } ${className}`.trim()}
    >
      {conversation.unread ? (
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent"
          aria-hidden
        />
      ) : (
        <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden />
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-foreground">
          {name}
          {conversation.unread && (
            <span className="sr-only">{t("unread")}</span>
          )}
          {statusLabel && (
            <span className="ml-2 text-xs font-normal text-muted">· {statusLabel}</span>
          )}
        </span>
        <span
          className={`mt-1 block text-sm leading-snug truncate ${
            conversation.unread ? "font-medium text-foreground" : "text-muted"
          }`}
        >
          {conversation.preview}
        </span>
      </span>
    </Link>
  );
}

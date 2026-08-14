import Link from "next/link";
import { conversationStatusLabel } from "@/lib/conversations";
import type { ConversationPreview } from "@/lib/conversations";

type Props = {
  conversation: ConversationPreview;
  className?: string;
};

export function ConversationPreviewLink({ conversation, className = "" }: Props) {
  const name =
    conversation.other?.first_name ?? conversation.other?.username ?? "Someone";
  const statusLabel = conversationStatusLabel(conversation.conversation_status);

  return (
    <Link
      href={`/messages/${conversation.id}`}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-foreground hover:bg-white/60 ${
        conversation.unread
          ? "border-foreground/20 bg-white/60"
          : "border-foreground/10 bg-white/40"
      } ${className}`.trim()}
    >
      {conversation.unread ? (
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-foreground/80"
          aria-hidden
        />
      ) : (
        <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden />
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-foreground">
          {name}
          {conversation.unread && (
            <span className="sr-only">, unread</span>
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

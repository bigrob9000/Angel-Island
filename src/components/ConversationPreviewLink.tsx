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

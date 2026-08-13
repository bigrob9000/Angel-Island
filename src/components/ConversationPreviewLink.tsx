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
      className={`block rounded-lg border border-foreground/10 bg-white/40 px-4 py-3 text-foreground hover:bg-white/60 ${className}`.trim()}
    >
      <span className="block font-medium text-foreground">
        {name}
        {statusLabel && (
          <span className="ml-2 text-xs font-normal text-muted">· {statusLabel}</span>
        )}
      </span>
      <span className="mt-1 block text-sm leading-snug text-muted truncate">
        {conversation.preview}
      </span>
    </Link>
  );
}

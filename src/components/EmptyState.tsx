import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, children, className = "" }: Props) {
  return (
    <div
      className={`rounded-lg border border-foreground/10 bg-white/40 px-4 py-8 text-center text-sm text-muted ${className}`}
    >
      <p className="text-foreground">{title}</p>
      {description && <p className="mt-2 leading-relaxed">{description}</p>}
      {children && <div className="mt-4 flex flex-wrap items-center justify-center gap-3">{children}</div>}
    </div>
  );
}

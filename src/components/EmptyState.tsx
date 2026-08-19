import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, children, className = "" }: Props) {
  return (
    <div className={`surface px-5 py-9 text-center text-sm text-muted ${className}`}>
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="mt-2 leading-relaxed">{description}</p>}
      {children && <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{children}</div>}
    </div>
  );
}

import Link from "next/link";

type Props = {
  title: string;
  description?: string;
  backHref: string;
  backLabel: string;
};

export function NotFoundPanel({ title, description, backHref, backLabel }: Props) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-white/50 px-5 py-8 text-center">
      <h1 className="font-serif text-xl font-medium text-foreground">{title}</h1>
      {description && <p className="mt-2 text-sm text-muted leading-relaxed">{description}</p>}
      <Link
        href={backHref}
        className="mt-6 inline-block text-sm text-foreground underline underline-offset-2 hover:no-underline"
      >
        {backLabel}
      </Link>
    </div>
  );
}

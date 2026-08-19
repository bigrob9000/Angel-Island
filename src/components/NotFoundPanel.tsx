import Link from "next/link";

type Props = {
  title: string;
  description?: string;
  backHref: string;
  backLabel: string;
};

export function NotFoundPanel({ title, description, backHref, backLabel }: Props) {
  return (
    <div className="surface px-5 py-9 text-center">
      <h1 className="font-serif text-xl font-medium text-foreground">{title}</h1>
      {description && <p className="mt-2 text-sm text-muted leading-relaxed">{description}</p>}
      <Link href={backHref} className="btn-secondary mt-6 inline-flex">
        {backLabel}
      </Link>
    </div>
  );
}

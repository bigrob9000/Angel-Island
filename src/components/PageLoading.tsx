type Props = {
  label?: string;
};

export function PageLoading({ label = "Loading…" }: Props) {
  return (
    <div className="py-12 text-center" role="status" aria-live="polite">
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

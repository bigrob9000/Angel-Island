"use client";

const inputClass =
  "mt-1 block w-full rounded-md border border-foreground/20 bg-white/80 px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function RoomSearch({ value, onChange }: Props) {
  return (
    <label className="block">
      <span className="section-heading text-base">Search this room</span>
      <p className="section-copy">Search conversations in this room.</p>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Keywords, phrases, or author names"
        className={inputClass}
      />
    </label>
  );
}

import { useState } from "react";

type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  max?: number;
};

export function TagInput({ tags, onChange, placeholder, max }: TagInputProps) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const value = raw.trim();
    if (!value) return;
    if (tags.includes(value)) return;
    if (max !== undefined && tags.length >= max) return;
    onChange([...tags, value]);
    setDraft("");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-foreground/20 bg-white/80 px-3 py-1 text-sm text-foreground"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="text-muted hover:text-foreground"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(draft);
            }
          }}
          placeholder={placeholder ?? "Type and press Enter"}
          disabled={max !== undefined && tags.length >= max}
          className="flex-1 rounded-md border border-foreground/20 bg-white px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => addTag(draft)}
          disabled={!draft.trim() || (max !== undefined && tags.length >= max)}
          className="rounded-md border border-foreground/30 px-3 py-2 text-sm text-foreground hover:bg-foreground/5 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SearchBarProps = {
  className?: string;
  defaultValue?: string;
};

export function SearchBar({ className = "", defaultValue = "" }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <label className="block">
        <span className="sr-only">Search Angel Island</span>
        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, rooms, or conversations"
            className="min-w-0 flex-1 rounded-md border border-foreground/20 bg-white/80 px-3 py-2 text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
          <button
            type="submit"
            disabled={!query.trim()}
            className="shrink-0 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            Search
          </button>
        </div>
      </label>
    </form>
  );
}

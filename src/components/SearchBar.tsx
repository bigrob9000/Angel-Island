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
        <div className="surface flex gap-2 p-1.5">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, rooms, conversations…"
            className="min-w-0 flex-1 rounded-full border-0 bg-transparent px-3 py-2 text-foreground placeholder:text-muted focus:outline-none"
          />
          <button type="submit" disabled={!query.trim()} className="btn-primary shrink-0 disabled:opacity-50">
            Search
          </button>
        </div>
      </label>
    </form>
  );
}

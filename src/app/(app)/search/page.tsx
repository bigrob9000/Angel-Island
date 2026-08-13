import { Suspense } from "react";
import SearchPageContent from "./SearchPageContent";

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <SearchPageContent />
    </Suspense>
  );
}

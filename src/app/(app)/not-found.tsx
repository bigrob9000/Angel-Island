import Link from "next/link";
import { NotFoundPanel } from "@/components/NotFoundPanel";

export default function AppNotFound() {
  return (
    <NotFoundPanel
      title="Page not found"
      description="That link doesn't match anything here. It may have moved or been removed."
      backHref="/home"
      backLabel="← Home"
    />
  );
}

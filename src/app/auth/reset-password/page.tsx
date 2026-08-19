import { Suspense } from "react";
import ResetPasswordPageContent from "./ResetPasswordPageContent";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen bg-ethereal text-foreground flex flex-col items-center justify-center px-6">
          <p className="text-muted text-sm">Loading…</p>
        </div>
      }
    >
      <ResetPasswordPageContent />
    </Suspense>
  );
}

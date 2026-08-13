import { Suspense } from "react";
import SignInPageContent from "./SignInPageContent";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen bg-ethereal text-foreground flex flex-col items-center justify-center px-6">
          <p className="text-muted">Loading…</p>
        </div>
      }
    >
      <SignInPageContent />
    </Suspense>
  );
}

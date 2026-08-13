"use client";

import { useEffect, useState } from "react";
import { blockUser, unblockUser } from "@/lib/blocks";
import { submitReport } from "@/lib/reports";
import type { ReportReason, ReportTargetType } from "@/lib/types";
import { REPORT_REASONS } from "@/lib/types";

export type SafetyDialog = "block" | "report" | null;

type Props = {
  currentUserId: string;
  reportedUserId: string;
  reportedUserName: string;
  targetType?: ReportTargetType;
  targetId?: string;
  showBlock?: boolean;
  blockedByMe?: boolean;
  /** Show Block / Report links or menu items. Set false when driving dialogs from the parent. */
  showTriggers?: boolean;
  variant?: "links" | "menu";
  /** Controlled dialog — use when triggers live in a menu that would otherwise unmount this component. */
  dialog?: SafetyDialog;
  onDialogChange?: (dialog: SafetyDialog) => void;
  onBlocked?: () => void;
  onUnblocked?: () => void;
};

export function UserSafetyActions({
  currentUserId,
  reportedUserId,
  reportedUserName,
  targetType = "user",
  targetId,
  showBlock = true,
  blockedByMe = false,
  showTriggers = true,
  variant = "links",
  dialog: controlledDialog,
  onDialogChange,
  onBlocked,
  onUnblocked,
}: Props) {
  const [internalDialog, setInternalDialog] = useState<SafetyDialog>(null);
  const [reason, setReason] = useState<ReportReason>("harassment");
  const [details, setDetails] = useState("");
  const [acting, setActing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isControlled = controlledDialog !== undefined;
  const activeDialog = isControlled ? controlledDialog : internalDialog;

  function setDialog(next: SafetyDialog) {
    setError(null);
    if (isControlled) {
      onDialogChange?.(next);
    } else {
      setInternalDialog(next);
    }
  }

  useEffect(() => {
    if (!activeDialog) setError(null);
  }, [activeDialog]);

  const resolvedTargetId = targetId ?? reportedUserId;

  async function handleBlock() {
    setActing(true);
    setError(null);
    const result = await blockUser(currentUserId, reportedUserId);
    setActing(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDialog(null);
    setFeedback(`${reportedUserName} has been blocked.`);
    setTimeout(() => setFeedback(null), 5000);
    onBlocked?.();
  }

  async function handleUnblock() {
    setActing(true);
    setError(null);
    const result = await unblockUser(currentUserId, reportedUserId);
    setActing(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setFeedback(`${reportedUserName} has been unblocked.`);
    setTimeout(() => setFeedback(null), 5000);
    onUnblocked?.();
  }

  async function handleReport(e: React.FormEvent) {
    e.preventDefault();
    setActing(true);
    setError(null);
    const result = await submitReport({
      reporterId: currentUserId,
      targetType,
      targetId: resolvedTargetId,
      reportedUserId,
      reason,
      details,
    });
    setActing(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDialog(null);
    setDetails("");
    setFeedback("Thanks — we'll review this.");
    setTimeout(() => setFeedback(null), 5000);
  }

  const trigger = showTriggers ? (
    variant === "menu" ? (
      <>
        {showBlock && !blockedByMe && (
          <button
            type="button"
            role="menuitem"
            onClick={() => setDialog("block")}
            className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-foreground/5"
          >
            Block {reportedUserName}
          </button>
        )}
        {!blockedByMe && (
          <button
            type="button"
            role="menuitem"
            onClick={() => setDialog("report")}
            className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-foreground/5"
          >
            Report
          </button>
        )}
      </>
    ) : (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {showBlock &&
          (blockedByMe ? (
            <button
              type="button"
              onClick={handleUnblock}
              disabled={acting}
              className="text-muted hover:text-foreground disabled:opacity-50"
            >
              {acting ? "Unblocking…" : "Unblock"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDialog("block")}
              className="text-muted hover:text-foreground underline-offset-2 hover:underline"
            >
              Block
            </button>
          ))}
        {!blockedByMe && (
          <button
            type="button"
            onClick={() => setDialog("report")}
            className="text-muted hover:text-foreground underline-offset-2 hover:underline"
          >
            Report
          </button>
        )}
      </div>
    )
  ) : null;

  return (
    <>
      {trigger}

      {feedback && (
        <p className="mt-2 text-sm text-accent" role="status">
          {feedback}
        </p>
      )}

      {error && !activeDialog && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {activeDialog === "block" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
          aria-modal="true"
          role="dialog"
        >
          <div className="bg-ethereal border border-foreground/10 rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="font-serif text-lg font-medium text-foreground">
              Block {reportedUserName}?
            </h2>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              They won&apos;t appear in search or Explore, and you won&apos;t be able to message
              each other. Any open conversation will be closed. No explanation is required.
            </p>
            {error && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleBlock}
                disabled={acting}
                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
              >
                {acting ? "Blocking…" : "Block"}
              </button>
              <button
                type="button"
                onClick={() => setDialog(null)}
                className="rounded-md border border-foreground/30 px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {activeDialog === "report" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
          aria-modal="true"
          role="dialog"
        >
          <div className="bg-ethereal border border-foreground/10 rounded-lg shadow-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-serif text-lg font-medium text-foreground">Report</h2>
            <p className="mt-2 text-sm text-muted">
              Tell us what happened. You don&apos;t need to explain further unless you want to.
            </p>
            <form onSubmit={handleReport} className="mt-4 space-y-4">
              <fieldset className="space-y-2">
                <legend className="text-sm text-muted">Reason</legend>
                {REPORT_REASONS.map((option) => (
                  <label key={option.value} className="flex items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name={`report-reason-${resolvedTargetId}`}
                      value={option.value}
                      checked={reason === option.value}
                      onChange={() => setReason(option.value)}
                      className="mt-0.5"
                    />
                    <span className="text-foreground">{option.label}</span>
                  </label>
                ))}
              </fieldset>
              <label className="block">
                <span className="text-sm text-muted">Anything else? (optional)</span>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-foreground/40 focus:outline-none"
                  placeholder="A sentence is enough, or leave blank."
                />
              </label>
              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={acting}
                  className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
                >
                  {acting ? "Sending…" : "Submit report"}
                </button>
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  className="rounded-md border border-foreground/30 px-4 py-2 text-sm text-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { adjustStockAction, setStockAction } from "@/actions/items";
import { formatQuantity } from "@/lib/format";

export function StockControls({
  itemId,
  quantity,
  unit,
  canStockTake = false,
  canQuickAdjust = false,
}: {
  itemId: string;
  quantity: number;
  unit: string;
  canStockTake?: boolean;
  canQuickAdjust?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingLabel, setPendingLabel] = useState("Saving…");

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 4000);
    return () => window.clearTimeout(timer);
  }, [success]);

  function run(
    action: (fd: FormData) => Promise<void>,
    formData: FormData,
    busyLabel: string,
    doneMessage: string,
  ) {
    setError(null);
    setSuccess(null);
    setPendingLabel(busyLabel);
    startTransition(async () => {
      try {
        await action(formData);
        setSuccess(doneMessage);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed");
      }
    });
  }

  if (!canStockTake && !canQuickAdjust) {
    return null;
  }

  return (
    <div className="stack-sm">
      {canStockTake ? (
        <form
          action={(fd) => {
            const nextQty = Number(fd.get("quantity"));
            const label = Number.isFinite(nextQty)
              ? `Stock updated to ${formatQuantity(nextQty, unit)}`
              : "Stock updated";
            run(setStockAction, fd, "Updating…", label);
          }}
          className="stack-sm"
        >
          <input type="hidden" name="id" value={itemId} />
          <div className="field-row">
            <div className="field">
              <label htmlFor="quantity">Stock take — set quantity ({unit})</label>
              <input
                key={`qty-${quantity}`}
                id="quantity"
                name="quantity"
                type="number"
                min={0}
                step="any"
                required
                defaultValue={quantity}
                disabled={pending}
              />
            </div>
            <div className="field">
              <label htmlFor="reason">Reason</label>
              <input
                id="reason"
                name="reason"
                defaultValue="Stock take"
                disabled={pending}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
            {pending ? pendingLabel : "Update stock"}
          </button>
        </form>
      ) : null}

      {canQuickAdjust ? (
        <form
          action={(fd) => {
            const delta = Number(fd.get("delta"));
            const label = Number.isFinite(delta)
              ? `Adjustment saved (${delta > 0 ? "+" : ""}${formatQuantity(delta, unit)})`
              : "Adjustment saved";
            run(adjustStockAction, fd, "Applying…", label);
          }}
          className="stack-sm"
        >
          <input type="hidden" name="id" value={itemId} />
          <div className="field-row">
            <div className="field">
              <label htmlFor="delta">Quick adjust (+ buy / − broken)</label>
              <input
                id="delta"
                name="delta"
                type="number"
                step="any"
                required
                placeholder="e.g. 10 or -2"
                disabled={pending}
              />
            </div>
            <div className="field">
              <label htmlFor="adj-reason">Reason</label>
              <input
                id="adj-reason"
                name="reason"
                required
                placeholder="Purchased / broken / discarded"
                disabled={pending}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-ghost btn-sm" disabled={pending}>
            {pending ? pendingLabel : "Apply adjustment"}
          </button>
        </form>
      ) : null}

      <div aria-live="polite">
        {pending ? (
          <p className="form-feedback form-feedback--pending" style={{ margin: 0 }}>
            {pendingLabel} Please wait.
          </p>
        ) : null}
        {success ? (
          <p className="form-feedback form-feedback--ok" style={{ margin: 0 }}>
            {success}
          </p>
        ) : null}
        {error ? (
          <p className="form-feedback form-feedback--error" style={{ margin: 0 }}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

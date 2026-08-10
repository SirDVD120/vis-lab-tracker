"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adjustStockAction, setStockAction } from "@/actions/items";

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

  function run(action: (fd: FormData) => Promise<void>, formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await action(formData);
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
        <form action={(fd) => run(setStockAction, fd)} className="stack-sm">
          <input type="hidden" name="id" value={itemId} />
          <div className="field-row">
            <div className="field">
              <label htmlFor="quantity">Stock take — set quantity ({unit})</label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min={0}
                step="any"
                required
                defaultValue={quantity}
              />
            </div>
            <div className="field">
              <label htmlFor="reason">Reason</label>
              <input id="reason" name="reason" defaultValue="Stock take" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
            Update stock
          </button>
        </form>
      ) : null}

      {canQuickAdjust ? (
        <form action={(fd) => run(adjustStockAction, fd)} className="stack-sm">
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
              />
            </div>
            <div className="field">
              <label htmlFor="adj-reason">Reason</label>
              <input
                id="adj-reason"
                name="reason"
                required
                placeholder="Purchased / broken / discarded"
              />
            </div>
          </div>
          <button type="submit" className="btn btn-ghost btn-sm" disabled={pending}>
            Apply adjustment
          </button>
        </form>
      ) : null}

      {error ? <p style={{ color: "var(--brand)", margin: 0 }}>{error}</p> : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { returnItemAction, signOutItemAction } from "@/actions/signOut";
import { formatQuantity } from "@/lib/format";

type SearchHit = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  kind: "EQUIPMENT" | "CONSUMABLE";
  locationName: string | null;
};

export function SignOutForm({ items }: { items: SearchHit[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");

  const selected = items.find((i) => i.id === selectedId) ?? items[0];

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await signOutItemAction(formData);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign-out failed");
      }
    });
  }

  if (items.length === 0) {
    return <div className="empty">No matching items. Try another SKU or name.</div>;
  }

  return (
    <form action={onSubmit} className="stack-sm">
      <div className="field">
        <label htmlFor="itemId">Item</label>
        <select
          id="itemId"
          name="itemId"
          value={selected?.id}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.sku} — {item.name} ({formatQuantity(item.quantity, item.unit)} available)
            </option>
          ))}
        </select>
      </div>

      {selected ? (
        <p className="muted" style={{ margin: 0 }}>
          {selected.kind === "EQUIPMENT" ? "Equipment" : "Consumable"}
          {selected.locationName ? ` · ${selected.locationName}` : ""} · available{" "}
          <strong>{formatQuantity(selected.quantity, selected.unit)}</strong>
        </p>
      ) : null}

      <div className="field-row">
        <div className="field">
          <label htmlFor="amountTaken">Amount taken</label>
          <input
            id="amountTaken"
            name="amountTaken"
            type="number"
            min={0.01}
            step="any"
            required
            defaultValue={1}
          />
        </div>
        <div className="field">
          <label htmlFor="notes">Notes</label>
          <input id="notes" name="notes" placeholder="Class / experiment (optional)" />
        </div>
      </div>

      {error ? <p style={{ color: "var(--brand)", margin: 0 }}>{error}</p> : null}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Signing out…" : "Sign out"}
      </button>
    </form>
  );
}

export function ReturnForm({
  signOutId,
  maxReturn,
  unit,
  kind,
}: {
  signOutId: string;
  maxReturn: number;
  unit: string;
  kind: "EQUIPMENT" | "CONSUMABLE";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isConsumable = kind === "CONSUMABLE";

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await returnItemAction(formData);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Return failed");
      }
    });
  }

  return (
    <form
      action={onSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
    >
      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
        <input type="hidden" name="signOutId" value={signOutId} />
        <input
          name="amountReturned"
          type="number"
          min={0}
          max={maxReturn}
          step="any"
          required
          defaultValue={isConsumable ? 0 : maxReturn}
          style={{
            width: "5.5rem",
            padding: "0.35rem 0.5rem",
            borderRadius: 10,
            border: "1px solid var(--line)",
          }}
          aria-label={`Return amount (${unit})`}
        />
        <button type="submit" className="btn btn-ghost btn-sm" disabled={pending}>
          {pending ? "…" : isConsumable ? "Return / used" : "Return"}
        </button>
      </div>
      {isConsumable ? (
        <span className="muted" style={{ fontSize: "0.78rem" }}>
          Leftover is marked used
        </span>
      ) : null}
      {error ? <span style={{ color: "var(--brand)", fontSize: "0.85rem" }}>{error}</span> : null}
    </form>
  );
}

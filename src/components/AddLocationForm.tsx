"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createLocationAction } from "@/actions/items";

export function AddLocationForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createLocationAction(formData);
        setName("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add location");
      }
    });
  }

  return (
    <div className="add-location">
      <p className="muted" style={{ margin: "0 0 0.5rem", fontSize: "0.9rem" }}>
        Add a new stockroom location
      </p>
      <form action={onSubmit} className="add-location__row">
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="new-location" style={{ position: "absolute", left: "-9999px" }}>
            New location
          </label>
          <input
            id="new-location"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Stockroom Rack 14"
            required
          />
        </div>
        <button type="submit" className="btn btn-ghost btn-sm" disabled={pending}>
          {pending ? "Adding…" : "Add location"}
        </button>
      </form>
      {error ? <p style={{ color: "var(--brand)", margin: "0.4rem 0 0" }}>{error}</p> : null}
    </div>
  );
}

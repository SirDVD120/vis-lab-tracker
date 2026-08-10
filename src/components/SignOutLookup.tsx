"use client";

import { BarcodeScannerButton } from "@/components/BarcodeScannerButton";

export function SignOutLookup({ defaultQuery = "" }: { defaultQuery?: string }) {
  return (
    <form className="toolbar" action="/sign-out" method="get">
      <div className="toolbar__grow field">
        <label htmlFor="q" style={{ position: "absolute", left: "-9999px" }}>
          SKU or name
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={defaultQuery}
          placeholder="e.g. 10012 or Beaker"
          autoComplete="off"
          enterKeyHint="search"
          inputMode="search"
        />
      </div>
      <div className="toolbar__actions">
        <button type="submit" className="btn btn-ghost">
          Find
        </button>
        <BarcodeScannerButton redirectTo="/sign-out" label="Scan barcode" />
      </div>
    </form>
  );
}

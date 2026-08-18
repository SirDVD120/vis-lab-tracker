"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createItemAction, updateItemAction } from "@/actions/items";
import { AddLocationForm } from "@/components/AddLocationForm";
import { BarcodeScannerButton } from "@/components/BarcodeScannerButton";
import type { Item, ItemBarcode, Location } from "@/generated/prisma/client";

const UNITS = ["count", "mL", "g", "L", "kg", "bottle", "box", "pack"];

type ItemWithBarcodes = Item & { barcodes?: ItemBarcode[] };

export function ItemForm({
  mode,
  item,
  locations,
  defaultKind = "EQUIPMENT",
  canManageLocations = false,
}: {
  mode: "create" | "edit";
  item?: ItemWithBarcodes;
  locations: Location[];
  defaultKind?: "EQUIPMENT" | "CONSUMABLE";
  canManageLocations?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sku, setSku] = useState(item?.sku ?? "");
  const [barcodes, setBarcodes] = useState<string[]>(() => {
    const existing = item?.barcodes?.map((b) => b.code) ?? [];
    return existing.length > 0 ? existing : [""];
  });
  const kind = item?.kind ?? defaultKind;
  const lockedIds = mode === "edit";

  function setBarcodeAt(index: number, value: string) {
    setBarcodes((prev) => prev.map((code, i) => (i === index ? value : code)));
  }

  function addBarcodeRow(initial = "") {
    setBarcodes((prev) => [...prev, initial]);
  }

  function removeBarcodeRow(index: number) {
    setBarcodes((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
  }

  function onScanInto(index: number, code: string) {
    setBarcodes((prev) => {
      const next = [...prev];
      if (!next[index]?.trim()) {
        next[index] = code;
        return next;
      }
      if (next.some((c) => c.trim().toLowerCase() === code.toLowerCase())) {
        return next;
      }
      return [...next, code];
    });
  }

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        if (mode === "create") {
          await createItemAction(formData);
          router.push(kind === "CONSUMABLE" ? "/consumables" : "/equipment");
          router.refresh();
        } else {
          await updateItemAction(formData);
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form action={onSubmit} className="stack-sm">
      {mode === "edit" && item ? <input type="hidden" name="id" value={item.id} /> : null}
      <input type="hidden" name="kind" value={kind} />

      <div className="field">
        <label htmlFor="sku">
          Lab SKU{" "}
          {mode === "create" ? (
            <span className="muted" style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>
              (optional)
            </span>
          ) : null}
        </label>
        <input
          id="sku"
          name={lockedIds ? undefined : "sku"}
          required={false}
          value={lockedIds ? item?.sku ?? "" : sku}
          onChange={lockedIds ? undefined : (e) => setSku(e.target.value)}
          readOnly={lockedIds}
          className={lockedIds ? "is-locked" : undefined}
          placeholder={
            mode === "create"
              ? kind === "CONSUMABLE"
                ? "Blank → next 2xxxx"
                : "Blank → next 1xxxx"
              : undefined
          }
        />
        {mode === "create" ? (
          <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
            Internal stockroom code. Leave blank to auto-assign.
          </p>
        ) : null}
      </div>

      <div className="field">
        <label>
          Product barcodes{" "}
          <span className="muted" style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>
            (optional — one per brand/package)
          </span>
        </label>
        <div className="barcode-list">
          {barcodes.map((code, index) => (
            <div key={index} className="sku-scan-row">
              <input
                name="barcodes"
                value={code}
                onChange={(e) => setBarcodeAt(index, e.target.value)}
                placeholder="Scan or paste EAN / UPC"
                aria-label={`Product barcode ${index + 1}`}
              />
              <BarcodeScannerButton
                label="Scan"
                className="btn btn-ghost"
                onScan={(scanned) => onScanInto(index, scanned)}
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => removeBarcodeRow(index)}
                aria-label={`Remove barcode ${index + 1}`}
                disabled={barcodes.length === 1 && !code.trim()}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="form-actions" style={{ marginTop: "0.5rem" }}>
          <button type="button" className="btn btn-ghost" onClick={() => addBarcodeRow()}>
            Add another barcode
          </button>
        </div>
        <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
          Add each package barcode you buy (different brands of the same item). Any of them
          will find this stock entry when signing out. Lab SKU still works for search too.
        </p>
      </div>

      <div className="field">
        <label htmlFor="name">Item name</label>
        <input id="name" name="name" required defaultValue={item?.name ?? ""} />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="unit">Unit</label>
          <select
            id="unit"
            name="unit"
            defaultValue={item?.unit ?? (kind === "CONSUMABLE" ? "mL" : "count")}
          >
            {UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
        {mode === "create" ? (
          <div className="field">
            <label htmlFor="quantity">Starting quantity</label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min={0}
              step="any"
              required
              defaultValue={0}
            />
          </div>
        ) : (
          <input type="hidden" name="quantity" value={item?.quantity ?? 0} />
        )}
        <div className="field">
          <label htmlFor="restockThreshold">Restock when below</label>
          <input
            id="restockThreshold"
            name="restockThreshold"
            type="number"
            min={0}
            step="any"
            required
            defaultValue={item?.restockThreshold ?? 0}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="locationId">Location</label>
        <select id="locationId" name="locationId" defaultValue={item?.locationId ?? ""}>
          <option value="">Unassigned</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      {canManageLocations ? <AddLocationForm /> : null}

      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={3} defaultValue={item?.notes ?? ""} />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="sdsFilename">SDS filename / link</label>
          <input
            id="sdsFilename"
            name="sdsFilename"
            defaultValue={item?.sdsFilename ?? ""}
            placeholder="Optional — visible on item detail"
          />
        </div>
        <div className="field">
          <label htmlFor="imageUrl">Image URL</label>
          <input
            id="imageUrl"
            name="imageUrl"
            defaultValue={item?.imageUrl ?? ""}
            placeholder="Optional — visible on item detail"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="purchaseLink">Purchase link</label>
        <input
          id="purchaseLink"
          name="purchaseLink"
          type="url"
          defaultValue={item?.purchaseLink ?? ""}
          placeholder="https://… where this was bought"
        />
      </div>

      <div className="field-row">
        <label className="checkbox-row">
          <input
            type="checkbox"
            name="excludeFromRestock"
            defaultChecked={item?.excludeFromRestock ?? false}
          />
          No reorder (exclude from restock alerts)
        </label>
        <label className="checkbox-row">
          <input type="checkbox" name="hidden" defaultChecked={item?.hidden ?? false} />
          Hidden from browse (kept in system)
        </label>
      </div>

      {error ? <p style={{ color: "var(--brand)", margin: 0 }}>{error}</p> : null}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create item" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

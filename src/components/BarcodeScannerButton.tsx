"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Html5Qrcode } from "html5-qrcode";

type Props = {
  /** Path to navigate to with ?q=code, default /sign-out */
  redirectTo?: string;
  label?: string;
};

export function BarcodeScannerButton({
  redirectTo = "/sign-out",
  label = "Scan barcode",
}: Props) {
  const router = useRouter();
  const scannerRegionId = useId().replace(/:/g, "");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    handledRef.current = false;
    setError(null);
    setStarting(true);

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode(scannerRegionId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const edge = Math.min(viewfinderWidth, viewfinderHeight) * 0.72;
              return { width: edge, height: Math.min(edge * 0.55, viewfinderHeight * 0.45) };
            },
            aspectRatio: 1.777,
          },
          (decodedText) => {
            if (handledRef.current || cancelled) return;
            handledRef.current = true;
            const code = decodedText.trim();
            void stopScanner().then(() => {
              setOpen(false);
              router.push(`${redirectTo}?q=${encodeURIComponent(code)}`);
            });
          },
          () => {
            // ignore frame-level "not found" noise
          },
        );
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Could not start the camera";
        if (/NotAllowedError|Permission/i.test(message)) {
          setError("Camera permission denied. Allow camera access and try again.");
        } else if (/NotFoundError|Requested device not found/i.test(message)) {
          setError("No camera found on this device.");
        } else {
          setError(message);
        }
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    void start();

    return () => {
      cancelled = true;
      void stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scannerRegionId, redirectTo, router]);

  async function stopScanner() {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      // already stopped
    }
  }

  function close() {
    void stopScanner().then(() => setOpen(false));
  }

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        {label}
      </button>

      {open ? (
        <div className="scanner-overlay" role="dialog" aria-modal="true" aria-label="Scan barcode">
          <div className="scanner-sheet">
            <div className="scanner-sheet__header">
              <h2>Scan barcode</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={close}>
                Close
              </button>
            </div>
            <p className="muted scanner-sheet__hint">
              Point the camera at the item barcode. Scanning works best in good light.
            </p>
            <div id={scannerRegionId} className="scanner-viewport" />
            {starting ? <p className="muted">Starting camera…</p> : null}
            {error ? <p className="scanner-error">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

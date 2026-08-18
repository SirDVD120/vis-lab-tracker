"use client";

import { useEffect } from "react";

/** Keep page scroll from accidentally changing focused number inputs. */
export function DisableNumberInputWheel() {
  useEffect(() => {
    function onWheel(event: WheelEvent) {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "number") return;
      if (document.activeElement !== target) return;
      event.preventDefault();
    }

    document.addEventListener("wheel", onWheel, { passive: false });
    return () => document.removeEventListener("wheel", onWheel);
  }, []);

  return null;
}

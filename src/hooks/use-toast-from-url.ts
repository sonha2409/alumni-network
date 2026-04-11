"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Reads `toast` and `toastType` search params from the URL, fires the
 * corresponding Sonner toast, then cleans the params from the address bar.
 *
 * This solves the race condition where `toast.success()` + `router.push()`
 * navigates before the toast renders. Instead, the toast message is passed
 * via URL and displayed on the destination page.
 */
export function useToastFromUrl() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;

    const params = new URLSearchParams(window.location.search);
    const message = params.get("toast");
    if (!message) return;

    fired.current = true;

    const type = params.get("toastType") ?? "success";
    if (type === "error") {
      toast.error(message);
    } else {
      toast.success(message);
    }

    // Clean the toast params from the URL without triggering a navigation
    params.delete("toast");
    params.delete("toastType");
    const remaining = params.toString();
    const cleanUrl =
      window.location.pathname + (remaining ? `?${remaining}` : "") + window.location.hash;
    window.history.replaceState(null, "", cleanUrl);
  }, []);
}

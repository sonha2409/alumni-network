"use client";

import { useEffect, useRef } from "react";
import { trackProfileView } from "./actions";

interface ViewTrackerProps {
  profileId: string;
}

/**
 * Invisible component that fires a profile view tracking action on mount.
 * Uses a ref to ensure it only fires once per page load.
 */
export function ViewTracker({ profileId }: ViewTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackProfileView(profileId);
  }, [profileId]);

  return null;
}

"use client";

import { useEffect, useRef, useState } from "react";

interface UseInViewOptions {
  /** Trigger only once (default: true) */
  once?: boolean;
  /** IntersectionObserver threshold (default: 0.1) */
  threshold?: number;
  /** Root margin (default: "0px 0px -40px 0px") — triggers slightly before element is fully in view */
  rootMargin?: string;
}

export function useInView<T extends HTMLElement = HTMLDivElement>({
  once = true,
  threshold = 0.1,
  rootMargin = "0px 0px -40px 0px",
}: UseInViewOptions = {}) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once, threshold, rootMargin]);

  return { ref, isVisible };
}

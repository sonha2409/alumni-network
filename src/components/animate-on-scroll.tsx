"use client";

import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

interface AnimateOnScrollProps {
  children: React.ReactNode;
  className?: string;
  /** Apply staggered animation to children instead of animating the wrapper */
  stagger?: boolean;
}

export function AnimateOnScroll({
  children,
  className,
  stagger = false,
}: AnimateOnScrollProps) {
  const { ref, isVisible } = useInView();

  return (
    <div
      ref={ref}
      className={cn(
        stagger ? "stagger-children" : "animate-on-scroll",
        isVisible && "is-visible",
        className
      )}
    >
      {children}
    </div>
  );
}

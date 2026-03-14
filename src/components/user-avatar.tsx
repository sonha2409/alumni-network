"use client";

import { useState } from "react";

interface UserAvatarProps {
  photoUrl: string | null;
  fullName: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-10 w-10 text-sm",
  xl: "h-24 w-24 text-2xl",
} as const;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserAvatar({
  photoUrl,
  fullName,
  size = "lg",
  className = "",
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = sizeClasses[size];

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={fullName}
        className={`${sizeClass} rounded-full object-cover ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`flex ${sizeClass} items-center justify-center rounded-full bg-primary font-medium text-primary-foreground ${className}`}
    >
      {getInitials(fullName)}
    </div>
  );
}

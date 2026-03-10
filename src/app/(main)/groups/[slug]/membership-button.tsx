"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { joinGroup, leaveGroup } from "../actions";

interface MembershipButtonProps {
  groupId: string;
  isMember: boolean;
}

export function MembershipButton({ groupId, isMember }: MembershipButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      if (isMember) {
        await leaveGroup(groupId);
      } else {
        await joinGroup(groupId);
      }
    });
  };

  return (
    <Button
      variant={isMember ? "outline" : "default"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending
        ? "..."
        : isMember
          ? "Leave group"
          : "Join group"}
    </Button>
  );
}

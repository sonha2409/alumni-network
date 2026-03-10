"use client";

import { useTransition } from "react";
import Link from "next/link";
import { UsersIcon, CalendarIcon, BriefcaseIcon, MapPinIcon, TagIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GroupWithMemberCount, GroupType } from "@/lib/types";
import { joinGroup, leaveGroup } from "./actions";

interface GroupsGridProps {
  groups: GroupWithMemberCount[];
  isVerified: boolean;
}

const typeConfig: Record<GroupType, { label: string; icon: typeof CalendarIcon; color: string }> = {
  year_based: { label: "Year", icon: CalendarIcon, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  field_based: { label: "Field", icon: BriefcaseIcon, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  location_based: { label: "Location", icon: MapPinIcon, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  custom: { label: "Custom", icon: TagIcon, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
};

export function GroupsGrid({ groups, isVerified }: GroupsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} isVerified={isVerified} />
      ))}
    </div>
  );
}

function GroupCard({
  group,
  isVerified,
}: {
  group: GroupWithMemberCount;
  isVerified: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const config = typeConfig[group.type];
  const TypeIcon = config.icon;

  const handleJoinLeave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      if (group.is_member) {
        await leaveGroup(group.id);
      } else {
        await joinGroup(group.id);
      }
    });
  };

  return (
    <Link
      href={`/groups/${group.slug}`}
      className="group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/20 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20"
    >
      {/* Type badge */}
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${config.color}`}>
          <TypeIcon className="h-3 w-3" />
          {config.label}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <UsersIcon className="h-3 w-3" />
          {group.member_count}
        </span>
      </div>

      {/* Name */}
      <h3 className="mt-3 truncate text-sm font-semibold leading-tight text-foreground group-hover:text-primary transition-colors">
        {group.name}
      </h3>

      {/* Description */}
      {group.description && (
        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
          {group.description}
        </p>
      )}

      {/* Spacer to push button to bottom */}
      <div className="flex-1" />

      {/* Join/Leave button */}
      {isVerified && (
        <div className="mt-4">
          <Button
            variant={group.is_member ? "outline" : "default"}
            size="sm"
            className="w-full text-xs"
            onClick={handleJoinLeave}
            disabled={isPending}
          >
            {isPending
              ? "..."
              : group.is_member
                ? "Leave group"
                : "Join group"}
          </Button>
        </div>
      )}

      {/* Hover indicator */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent transition-all group-hover:via-primary/30" />
    </Link>
  );
}

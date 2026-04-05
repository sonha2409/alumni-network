"use client";

import { useRouter } from "next/navigation";
import { SearchIcon, UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface DirectoryEmptyStateProps {
  hasFilters: boolean;
}

export function DirectoryEmptyState({ hasFilters }: DirectoryEmptyStateProps) {
  const t = useTranslations("directory");
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/15 bg-gradient-to-b from-primary/[0.02] to-transparent py-16 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
        {hasFilters ? (
          <SearchIcon className="h-5 w-5 text-primary/50" />
        ) : (
          <UsersIcon className="h-5 w-5 text-primary/50" />
        )}
      </div>

      <h3 className="mt-4 text-sm font-semibold">
        {hasFilters ? t("noAlumniFound") : t("noAlumniYet")}
      </h3>

      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? t("noAlumniFoundDesc")
          : t("noAlumniYetDesc")}
      </p>

      {hasFilters && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => router.push("/directory")}
        >
          {t("clearAllFilters")}
        </Button>
      )}
    </div>
  );
}

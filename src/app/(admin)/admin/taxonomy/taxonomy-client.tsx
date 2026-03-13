"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminIndustryRow, AdminSpecializationRow } from "@/lib/types";
import {
  getAdminTaxonomy,
  createIndustry,
  updateIndustry,
  toggleIndustryArchive,
  createSpecialization,
  updateSpecialization,
  toggleSpecializationArchive,
} from "./actions";
import { TaxonomyDialog } from "./taxonomy-dialog";

function StatusBadge({ isArchived }: { isArchived: boolean }) {
  if (isArchived) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        Archived
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
      Active
    </span>
  );
}

function UserCountBadge({ count }: { count: number }) {
  const tCommon = useTranslations("common");
  return (
    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
      {tCommon("users", { count })}
    </span>
  );
}

export function TaxonomyClient() {
  const t = useTranslations("admin.taxonomy");
  const tCommon = useTranslations("common");
  const [industries, setIndustries] = useState<AdminIndustryRow[]>([]);
  const [totalIndustries, setTotalIndustries] = useState(0);
  const [totalSpecializations, setTotalSpecializations] = useState(0);
  const [totalArchivedIndustries, setTotalArchivedIndustries] = useState(0);
  const [totalArchivedSpecializations, setTotalArchivedSpecializations] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [expandedIndustries, setExpandedIndustries] = useState<Set<string>>(new Set());

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogTarget, setDialogTarget] = useState<"industry" | "specialization">("industry");
  const [dialogInitialName, setDialogInitialName] = useState("");
  const [dialogItemId, setDialogItemId] = useState("");
  const [dialogIndustryId, setDialogIndustryId] = useState("");
  const [dialogLoading, setDialogLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const result = await getAdminTaxonomy();
    if (result.success) {
      setIndustries(result.data.industries);
      setTotalIndustries(result.data.totalIndustries);
      setTotalSpecializations(result.data.totalSpecializations);
      setTotalArchivedIndustries(result.data.totalArchivedIndustries);
      setTotalArchivedSpecializations(result.data.totalArchivedSpecializations);
    } else {
      toast.error(result.error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter industries by search
  const filteredIndustries = industries.filter((ind) => {
    // Filter by archived status
    if (!showArchived && ind.is_archived) return false;

    if (!search.trim()) return true;
    const term = search.toLowerCase();
    if (ind.name.toLowerCase().includes(term)) return true;
    // Also match if any specialization matches
    return ind.specializations.some((s) => s.name.toLowerCase().includes(term));
  });

  function toggleExpand(industryId: string) {
    setExpandedIndustries((prev) => {
      const next = new Set(prev);
      if (next.has(industryId)) {
        next.delete(industryId);
      } else {
        next.add(industryId);
      }
      return next;
    });
  }

  // Dialog handlers
  function openCreateIndustry() {
    setDialogMode("create");
    setDialogTarget("industry");
    setDialogInitialName("");
    setDialogItemId("");
    setDialogIndustryId("");
    setDialogOpen(true);
  }

  function openEditIndustry(industry: AdminIndustryRow) {
    setDialogMode("edit");
    setDialogTarget("industry");
    setDialogInitialName(industry.name);
    setDialogItemId(industry.id);
    setDialogIndustryId("");
    setDialogOpen(true);
  }

  function openCreateSpecialization(industryId: string) {
    setDialogMode("create");
    setDialogTarget("specialization");
    setDialogInitialName("");
    setDialogItemId("");
    setDialogIndustryId(industryId);
    setDialogOpen(true);
  }

  function openEditSpecialization(spec: AdminSpecializationRow) {
    setDialogMode("edit");
    setDialogTarget("specialization");
    setDialogInitialName(spec.name);
    setDialogItemId(spec.id);
    setDialogIndustryId("");
    setDialogOpen(true);
  }

  async function handleDialogSubmit(name: string) {
    setDialogLoading(true);

    let result;
    if (dialogTarget === "industry") {
      if (dialogMode === "create") {
        result = await createIndustry(name);
      } else {
        result = await updateIndustry(dialogItemId, name);
      }
    } else {
      if (dialogMode === "create") {
        result = await createSpecialization(dialogIndustryId, name);
      } else {
        result = await updateSpecialization(dialogItemId, name);
      }
    }

    setDialogLoading(false);

    if (result.success) {
      toast.success(
        t("createdToast", { type: dialogTarget === "industry" ? t("industries") : t("specializations") })
      );
      setDialogOpen(false);
      fetchData();
    } else {
      toast.error(result.error);
    }
  }

  async function handleArchiveIndustry(id: string, archive: boolean, name: string) {
    const result = await toggleIndustryArchive(id, archive);
    if (result.success) {
      toast.success(archive ? t("archivedToast", { name }) : t("restoredToast", { name }));
      fetchData();
    } else {
      toast.error(result.error);
    }
  }

  async function handleArchiveSpecialization(id: string, archive: boolean, name: string) {
    const result = await toggleSpecializationArchive(id, archive);
    if (result.success) {
      toast.success(archive ? t("archivedSpecToast", { name }) : t("restoredSpecToast", { name }));
      fetchData();
    } else {
      toast.error(result.error);
    }
  }

  // Filter specializations within an expanded industry
  function getVisibleSpecializations(specs: AdminSpecializationRow[]) {
    return specs.filter((s) => {
      if (!showArchived && s.is_archived) return false;
      if (!search.trim()) return true;
      return s.name.toLowerCase().includes(search.toLowerCase());
    });
  }

  return (
    <>
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{totalIndustries}</p>
            <p className="text-sm text-muted-foreground">{t("industries")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{totalSpecializations}</p>
            <p className="text-sm text-muted-foreground">{t("specializations")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{totalArchivedIndustries}</p>
            <p className="text-sm text-muted-foreground">{t("archivedIndustries")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{totalArchivedSpecializations}</p>
            <p className="text-sm text-muted-foreground">{t("archivedSpecs")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("industriesAndSpecs")}</span>
            <Button size="sm" onClick={openCreateIndustry}>
              {t("addIndustry")}
            </Button>
          </CardTitle>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              type="search"
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
              aria-label={t("searchAriaLabel")}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-input"
              />
              {t("showArchived")}
            </label>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredIndustries.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {search.trim()
                ? t("noMatch")
                : t("noIndustries")}
            </p>
          ) : (
            <div className="divide-y">
              {filteredIndustries.map((industry) => {
                const isExpanded = expandedIndustries.has(industry.id);
                const visibleSpecs = getVisibleSpecializations(industry.specializations);
                const totalSpecs = industry.specializations.filter(
                  (s) => !s.is_archived
                ).length;

                return (
                  <div key={industry.id}>
                    {/* Industry row */}
                    <div
                      className={`flex items-center gap-3 py-3 ${industry.is_archived ? "opacity-60" : ""}`}
                    >
                      {/* Expand toggle */}
                      <button
                        onClick={() => toggleExpand(industry.id)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted"
                        aria-label={isExpanded ? t("collapseSpecs") : t("expandSpecs")}
                      >
                        <svg
                          className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Name */}
                      <div className="min-w-0 flex-1">
                        <span className={`font-medium ${industry.is_archived ? "line-through" : ""}`}>
                          {industry.name}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {t("specsCount", { count: totalSpecs })}
                        </span>
                      </div>

                      {/* Badges */}
                      <UserCountBadge count={industry.user_count} />
                      <StatusBadge isArchived={industry.is_archived} />

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditIndustry(industry)}
                          className="h-8 px-2 text-xs"
                        >
                          {tCommon("edit")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleArchiveIndustry(
                              industry.id,
                              !industry.is_archived,
                              industry.name
                            )
                          }
                          className="h-8 px-2 text-xs"
                        >
                          {industry.is_archived ? t("restore") : t("archive")}
                        </Button>
                      </div>
                    </div>

                    {/* Specializations (expanded) */}
                    {isExpanded && (
                      <div className="mb-3 ml-9 border-l-2 border-muted pl-4">
                        {visibleSpecs.length === 0 ? (
                          <p className="py-2 text-sm text-muted-foreground">
                            {t("noActiveSpecs")}
                          </p>
                        ) : (
                          <div className="divide-y divide-dashed">
                            {visibleSpecs.map((spec) => (
                              <div
                                key={spec.id}
                                className={`flex items-center gap-3 py-2 ${spec.is_archived ? "opacity-60" : ""}`}
                              >
                                <div className="min-w-0 flex-1">
                                  <span className={`text-sm ${spec.is_archived ? "line-through" : ""}`}>
                                    {spec.name}
                                  </span>
                                </div>
                                <UserCountBadge count={spec.user_count} />
                                <StatusBadge isArchived={spec.is_archived} />
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditSpecialization(spec)}
                                    className="h-7 px-2 text-xs"
                                  >
                                    {tCommon("edit")}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleArchiveSpecialization(
                                        spec.id,
                                        !spec.is_archived,
                                        spec.name
                                      )
                                    }
                                    className="h-7 px-2 text-xs"
                                  >
                                    {spec.is_archived ? t("restore") : t("archive")}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add specialization button */}
                        {!industry.is_archived && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCreateSpecialization(industry.id)}
                            className="mt-2 h-7 text-xs"
                          >
                            {t("addSpec")}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <TaxonomyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        target={dialogTarget}
        initialName={dialogInitialName}
        isLoading={dialogLoading}
        onSubmit={handleDialogSubmit}
      />
    </>
  );
}

"use client";

import { useEffect } from "react";
import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import { XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { IndustryWithSpecializations } from "@/lib/types";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

interface MapFiltersProps {
  industries: IndustryWithSpecializations[];
  onFiltersChange: () => void;
}

export function MapFilters({ industries, onFiltersChange }: MapFiltersProps) {
  const [industryId, setIndustryId] = useQueryState(
    "industry",
    parseAsString.withDefault("").withOptions({ shallow: true })
  );
  const [specializationId, setSpecializationId] = useQueryState(
    "specialization",
    parseAsString.withDefault("").withOptions({ shallow: true })
  );
  const [yearMin, setYearMin] = useQueryState(
    "yearMin",
    parseAsInteger.withOptions({ shallow: true })
  );
  const [yearMax, setYearMax] = useQueryState(
    "yearMax",
    parseAsInteger.withOptions({ shallow: true })
  );

  const selectedIndustry = industries.find((i) => i.id === industryId);
  const specializations = selectedIndustry?.specializations ?? [];

  const hasFilters = !!(industryId || specializationId || yearMin || yearMax);

  // Notify parent when filters change
  useEffect(() => {
    onFiltersChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industryId, specializationId, yearMin, yearMax]);

  const clearAll = () => {
    setIndustryId(null);
    setSpecializationId(null);
    setYearMin(null);
    setYearMax(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Filters
        </p>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-6 gap-1 px-2 text-xs text-muted-foreground"
          >
            <XIcon className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Industry */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Industry</label>
        <select
          value={industryId}
          onChange={(e) => {
            setIndustryId(e.target.value || null);
            setSpecializationId(null);
          }}
          className={selectClass}
        >
          <option value="">All industries</option>
          {industries.map((ind) => (
            <option key={ind.id} value={ind.id}>
              {ind.name}
            </option>
          ))}
        </select>
      </div>

      {/* Specialization */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Specialization</label>
        <select
          value={specializationId}
          onChange={(e) => setSpecializationId(e.target.value || null)}
          disabled={!industryId}
          className={selectClass}
        >
          <option value="">
            {industryId ? "All specializations" : "Select industry first"}
          </option>
          {specializations.map((spec) => (
            <option key={spec.id} value={spec.id}>
              {spec.name}
            </option>
          ))}
        </select>
      </div>

      {/* Graduation year range */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Graduation year</label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="From"
            value={yearMin ?? ""}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value, 10) : null;
              setYearMin(val);
            }}
            min={1950}
            max={2100}
            className="h-8"
          />
          <span className="text-xs text-muted-foreground">&ndash;</span>
          <Input
            type="number"
            placeholder="To"
            value={yearMax ?? ""}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value, 10) : null;
              setYearMax(val);
            }}
            min={1950}
            max={2100}
            className="h-8"
          />
        </div>
      </div>
    </div>
  );
}

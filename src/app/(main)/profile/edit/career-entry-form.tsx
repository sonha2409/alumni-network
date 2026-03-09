"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addCareerEntry, updateCareerEntry } from "./career-actions";
import type {
  ActionResult,
  CareerEntry,
  IndustryWithSpecializations,
} from "@/lib/types";

interface CareerEntryFormProps {
  entry?: CareerEntry;
  industries: IndustryWithSpecializations[];
  onClose: () => void;
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function CareerEntryForm({
  entry,
  industries,
  onClose,
}: CareerEntryFormProps) {
  const isEditing = !!entry;
  const action = isEditing ? updateCareerEntry : addCareerEntry;

  const [state, formAction, isPending] = useActionState<
    ActionResult<{ id: string }> | ActionResult | null,
    FormData
  >(action as (state: ActionResult<{ id: string }> | ActionResult | null, formData: FormData) => Promise<ActionResult<{ id: string }> | ActionResult>, null);

  const [industryId, setIndustryId] = useState(entry?.industry_id ?? "");
  const [specId, setSpecId] = useState(entry?.specialization_id ?? "");

  const selectedIndustry = industries.find((i) => i.id === industryId);
  const specs = selectedIndustry?.specializations ?? [];

  useEffect(() => {
    if (state?.success) {
      toast.success(isEditing ? "Career entry updated." : "Career entry added.");
      onClose();
    }
  }, [state, isEditing, onClose]);

  function fieldError(field: string): string | undefined {
    if (state?.success === false && state.fieldErrors?.[field]) {
      return state.fieldErrors[field][0];
    }
    return undefined;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border p-4">
      {isEditing && <input type="hidden" name="entry_id" value={entry.id} />}

      {state?.success === false && !state.fieldErrors && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="career_job_title">Job title *</Label>
          <Input
            id="career_job_title"
            name="job_title"
            type="text"
            defaultValue={entry?.job_title ?? ""}
            required
            maxLength={200}
            placeholder="e.g. Software Engineer"
            aria-invalid={fieldError("job_title") ? true : undefined}
            aria-describedby={fieldError("job_title") ? "career_job_title-error" : undefined}
          />
          {fieldError("job_title") && (
            <p id="career_job_title-error" className="text-sm text-destructive">
              {fieldError("job_title")}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="career_company">Company *</Label>
          <Input
            id="career_company"
            name="company"
            type="text"
            defaultValue={entry?.company ?? ""}
            required
            maxLength={200}
            placeholder="e.g. Google"
            aria-invalid={fieldError("company") ? true : undefined}
            aria-describedby={fieldError("company") ? "career_company-error" : undefined}
          />
          {fieldError("company") && (
            <p id="career_company-error" className="text-sm text-destructive">
              {fieldError("company")}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="career_industry_id">Industry</Label>
          <select
            id="career_industry_id"
            name="industry_id"
            value={industryId}
            onChange={(e) => {
              setIndustryId(e.target.value);
              setSpecId("");
            }}
            className={selectClass}
          >
            <option value="">None</option>
            {industries.map((industry) => (
              <option key={industry.id} value={industry.id}>
                {industry.name}
              </option>
            ))}
          </select>
        </div>

        {specs.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="career_specialization_id">Specialization</Label>
            <select
              id="career_specialization_id"
              name="specialization_id"
              value={specId}
              onChange={(e) => setSpecId(e.target.value)}
              className={selectClass}
            >
              <option value="">None</option>
              {specs.map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {spec.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="career_start_date">Start date *</Label>
          <Input
            id="career_start_date"
            name="start_date"
            type="date"
            defaultValue={entry?.start_date ?? ""}
            required
            aria-invalid={fieldError("start_date") ? true : undefined}
            aria-describedby={fieldError("start_date") ? "career_start_date-error" : undefined}
          />
          {fieldError("start_date") && (
            <p id="career_start_date-error" className="text-sm text-destructive">
              {fieldError("start_date")}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="career_end_date">End date</Label>
          <Input
            id="career_end_date"
            name="end_date"
            type="date"
            defaultValue={entry?.end_date ?? ""}
            aria-invalid={fieldError("end_date") ? true : undefined}
            aria-describedby={fieldError("end_date") ? "career_end_date-error" : undefined}
          />
          {fieldError("end_date") && (
            <p id="career_end_date-error" className="text-sm text-destructive">
              {fieldError("end_date")}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Leave blank for current position</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="career_description">Description</Label>
        <Textarea
          id="career_description"
          name="description"
          defaultValue={entry?.description ?? ""}
          placeholder="Brief description of your role…"
          maxLength={500}
          rows={3}
        />
        {fieldError("description") && (
          <p className="text-sm text-destructive">{fieldError("description")}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="career_is_current"
          name="is_current"
          type="checkbox"
          defaultChecked={entry?.is_current ?? false}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="career_is_current" className="font-normal">
          This is my current position
        </Label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? "Saving…" : isEditing ? "Update" : "Add entry"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

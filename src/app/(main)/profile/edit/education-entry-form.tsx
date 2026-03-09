"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addEducationEntry, updateEducationEntry } from "./education-actions";
import type { ActionResult, EducationEntry } from "@/lib/types";

interface EducationEntryFormProps {
  entry?: EducationEntry;
  onClose: () => void;
}

export function EducationEntryForm({ entry, onClose }: EducationEntryFormProps) {
  const isEditing = !!entry;
  const action = isEditing ? updateEducationEntry : addEducationEntry;

  const [state, formAction, isPending] = useActionState<
    ActionResult<{ id: string }> | ActionResult | null,
    FormData
  >(action as (state: ActionResult<{ id: string }> | ActionResult | null, formData: FormData) => Promise<ActionResult<{ id: string }> | ActionResult>, null);

  useEffect(() => {
    if (state?.success) {
      toast.success(
        isEditing ? "Education entry updated." : "Education entry added."
      );
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="edu_institution">Institution *</Label>
        <Input
          id="edu_institution"
          name="institution"
          type="text"
          defaultValue={entry?.institution ?? ""}
          required
          maxLength={200}
          placeholder="e.g. Stanford University"
          aria-invalid={fieldError("institution") ? true : undefined}
          aria-describedby={
            fieldError("institution") ? "edu_institution-error" : undefined
          }
        />
        {fieldError("institution") && (
          <p id="edu_institution-error" className="text-sm text-destructive">
            {fieldError("institution")}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edu_degree">Degree</Label>
          <Input
            id="edu_degree"
            name="degree"
            type="text"
            defaultValue={entry?.degree ?? ""}
            maxLength={100}
            placeholder="e.g. B.S., M.A., Ph.D."
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="edu_field_of_study">Field of study</Label>
          <Input
            id="edu_field_of_study"
            name="field_of_study"
            type="text"
            defaultValue={entry?.field_of_study ?? ""}
            maxLength={200}
            placeholder="e.g. Computer Science"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edu_start_year">Start year</Label>
          <Input
            id="edu_start_year"
            name="start_year"
            type="number"
            defaultValue={entry?.start_year ?? ""}
            min={1950}
            max={2100}
            aria-invalid={fieldError("start_year") ? true : undefined}
            aria-describedby={
              fieldError("start_year") ? "edu_start_year-error" : undefined
            }
          />
          {fieldError("start_year") && (
            <p id="edu_start_year-error" className="text-sm text-destructive">
              {fieldError("start_year")}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="edu_end_year">End year</Label>
          <Input
            id="edu_end_year"
            name="end_year"
            type="number"
            defaultValue={entry?.end_year ?? ""}
            min={1950}
            max={2100}
            aria-invalid={fieldError("end_year") ? true : undefined}
            aria-describedby={
              fieldError("end_year") ? "edu_end_year-error" : undefined
            }
          />
          {fieldError("end_year") && (
            <p id="edu_end_year-error" className="text-sm text-destructive">
              {fieldError("end_year")}
            </p>
          )}
        </div>
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

"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { quickUpdateProfile } from "./actions";
import type { ActionResult, AvailabilityTagType } from "@/lib/types";

interface QuickUpdateFormProps {
  profileId: string;
  currentCareer: {
    id: string;
    job_title: string;
    company: string;
  } | null;
  country: string | null;
  stateProvince: string | null;
  city: string | null;
  tagTypes: AvailabilityTagType[];
  selectedTagIds: string[];
}

export function QuickUpdateForm({
  profileId,
  currentCareer,
  country,
  stateProvince,
  city,
  tagTypes,
  selectedTagIds,
}: QuickUpdateFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(quickUpdateProfile, null);

  useEffect(() => {
    if (state?.success) {
      toast.success("Profile updated successfully.");
      router.push("/dashboard");
    }
  }, [state, router]);

  function handleNoChanges() {
    // Submit with a hidden flag
    const form = document.getElementById("quick-update-form") as HTMLFormElement;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "no_changes";
    input.value = "true";
    form.appendChild(input);
    form.requestSubmit();
  }

  return (
    <form id="quick-update-form" action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="profile_id" value={profileId} />
      {currentCareer && (
        <input type="hidden" name="career_entry_id" value={currentCareer.id} />
      )}

      {state?.success === false && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      {/* Current Job */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Current Position
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="job_title">Job Title</Label>
            <Input
              id="job_title"
              name="job_title"
              defaultValue={currentCareer?.job_title ?? ""}
              placeholder="e.g. Software Engineer"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              name="company"
              defaultValue={currentCareer?.company ?? ""}
              placeholder="e.g. Google"
            />
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Location
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              name="country"
              defaultValue={country ?? ""}
              placeholder="e.g. Vietnam"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="state_province">State / Province</Label>
            <Input
              id="state_province"
              name="state_province"
              defaultValue={stateProvince ?? ""}
              placeholder="e.g. Ho Chi Minh City"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              name="city"
              defaultValue={city ?? ""}
              placeholder="e.g. District 1"
            />
          </div>
        </div>
      </section>

      {/* Availability Tags */}
      {tagTypes.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Availability
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {tagTypes.map((tagType) => (
              <div key={tagType.id} className="flex items-start gap-2">
                <input
                  id={`tag_${tagType.slug}`}
                  name="tag_type_ids"
                  type="checkbox"
                  value={tagType.id}
                  defaultChecked={selectedTagIds.includes(tagType.id)}
                  className="mt-0.5 h-4 w-4 rounded border-input"
                />
                <div className="flex flex-col">
                  <Label htmlFor={`tag_${tagType.slug}`} className="font-normal">
                    {tagType.name}
                  </Label>
                  {tagType.description && (
                    <p className="text-xs text-muted-foreground">
                      {tagType.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save & Confirm"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={handleNoChanges}
        >
          No Changes Needed
        </Button>
      </div>
    </form>
  );
}

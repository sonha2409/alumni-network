"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateAvailabilityTags } from "./availability-actions";
import type { ActionResult, AvailabilityTagType } from "@/lib/types";

interface AvailabilityTagsSectionProps {
  tagTypes: AvailabilityTagType[];
  selectedTagIds: string[];
}

export function AvailabilityTagsSection({
  tagTypes,
  selectedTagIds,
}: AvailabilityTagsSectionProps) {
  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(updateAvailabilityTags, null);

  useEffect(() => {
    if (state?.success) {
      toast.success("Availability updated.");
    }
  }, [state]);

  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold">Availability</h3>
      <p className="text-sm text-muted-foreground">
        Let other alumni know what you&apos;re open to.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        {state?.success === false && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {state.error}
          </div>
        )}

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

        <Button
          type="submit"
          disabled={isPending}
          size="sm"
          className="w-full sm:w-auto"
        >
          {isPending ? "Saving…" : "Save availability"}
        </Button>
      </form>
    </section>
  );
}

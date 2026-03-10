"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertContactDetails } from "./contact-details-actions";
import type { ActionResult, ProfileContactDetails } from "@/lib/types";

interface ContactDetailsSectionProps {
  contactDetails: ProfileContactDetails | null;
}

export function ContactDetailsSection({
  contactDetails,
}: ContactDetailsSectionProps) {
  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(upsertContactDetails, null);

  useEffect(() => {
    if (state?.success) {
      toast.success("Contact details saved.");
    }
  }, [state]);

  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold">Contact details</h3>
      <p className="text-sm text-muted-foreground">
        Contact details are only visible to your connections.
      </p>

      <form action={formAction} className="flex flex-col gap-4" key={contactDetails?.updated_at ?? "new"}>
        {state?.success === false && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {state.error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="personal_email">Personal email</Label>
          <Input
            id="personal_email"
            name="personal_email"
            type="email"
            defaultValue={contactDetails?.personal_email ?? ""}
            placeholder="you@example.com"
          />
          {state?.success === false && state.fieldErrors?.personal_email && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.personal_email[0]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={contactDetails?.phone ?? ""}
            placeholder="+1 555-0123"
          />
          {state?.success === false && state.fieldErrors?.phone && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.phone[0]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="linkedin_url">LinkedIn URL</Label>
          <Input
            id="linkedin_url"
            name="linkedin_url"
            type="url"
            defaultValue={contactDetails?.linkedin_url ?? ""}
            placeholder="https://linkedin.com/in/yourname"
          />
          {state?.success === false && state.fieldErrors?.linkedin_url && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.linkedin_url[0]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="github_url">GitHub URL</Label>
          <Input
            id="github_url"
            name="github_url"
            type="url"
            defaultValue={contactDetails?.github_url ?? ""}
            placeholder="https://github.com/yourname"
          />
          {state?.success === false && state.fieldErrors?.github_url && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.github_url[0]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="website_url">Website URL</Label>
          <Input
            id="website_url"
            name="website_url"
            type="url"
            defaultValue={contactDetails?.website_url ?? ""}
            placeholder="https://yoursite.com"
          />
          {state?.success === false && state.fieldErrors?.website_url && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.website_url[0]}
            </p>
          )}
        </div>

        <Button type="submit" disabled={isPending} className="self-start">
          {isPending ? "Saving..." : "Save contact details"}
        </Button>
      </form>
    </section>
  );
}

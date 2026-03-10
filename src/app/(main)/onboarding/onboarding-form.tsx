"use client";

import { useActionState, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProfile } from "./actions";
import type { ActionResult, IndustryWithSpecializations } from "@/lib/types";

interface OnboardingFormProps {
  industries: IndustryWithSpecializations[];
  minGraduationYear: number;
  maxGraduationYear: number;
}

export function OnboardingForm({ industries, minGraduationYear, maxGraduationYear }: OnboardingFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<
    ActionResult<{ profileId: string }> | null,
    FormData
  >(createProfile, null);

  const [selectedIndustryId, setSelectedIndustryId] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedIndustry = industries.find((i) => i.id === selectedIndustryId);
  const specializations = selectedIndustry?.specializations ?? [];

  useEffect(() => {
    if (state?.success) {
      toast.success("Profile created! Let's set up a few more things.");
      router.push("/onboarding/quiz");
    }
  }, [state, router]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.success === false && !state.fieldErrors && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      {/* Full Name */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="full_name">Full name *</Label>
        <Input
          id="full_name"
          name="full_name"
          type="text"
          placeholder="Your full name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          aria-invalid={
            state?.success === false && state.fieldErrors?.full_name
              ? true
              : undefined
          }
          aria-describedby={
            state?.success === false && state.fieldErrors?.full_name
              ? "full_name-error"
              : undefined
          }
        />
        {state?.success === false && state.fieldErrors?.full_name && (
          <p id="full_name-error" className="text-sm text-destructive">
            {state.fieldErrors.full_name[0]}
          </p>
        )}
      </div>

      {/* Graduation Year */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="graduation_year">Graduation year *</Label>
        <Input
          id="graduation_year"
          name="graduation_year"
          type="number"
          placeholder="e.g. 2020"
          min={minGraduationYear}
          max={maxGraduationYear}
          required
          aria-invalid={
            state?.success === false && state.fieldErrors?.graduation_year
              ? true
              : undefined
          }
          aria-describedby={
            state?.success === false && state.fieldErrors?.graduation_year
              ? "graduation_year-error"
              : undefined
          }
        />
        {state?.success === false && state.fieldErrors?.graduation_year && (
          <p id="graduation_year-error" className="text-sm text-destructive">
            {state.fieldErrors.graduation_year[0]}
          </p>
        )}
      </div>

      {/* Primary Industry */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="primary_industry_id">Career field *</Label>
        <select
          id="primary_industry_id"
          name="primary_industry_id"
          value={selectedIndustryId}
          onChange={(e) => setSelectedIndustryId(e.target.value)}
          required
          aria-invalid={
            state?.success === false &&
            state.fieldErrors?.primary_industry_id
              ? true
              : undefined
          }
          aria-describedby={
            state?.success === false &&
            state.fieldErrors?.primary_industry_id
              ? "primary_industry_id-error"
              : undefined
          }
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select your career field</option>
          {industries.map((industry) => (
            <option key={industry.id} value={industry.id}>
              {industry.name}
            </option>
          ))}
        </select>
        {state?.success === false &&
          state.fieldErrors?.primary_industry_id && (
            <p id="primary_industry_id-error" className="text-sm text-destructive">
              {state.fieldErrors.primary_industry_id[0]}
            </p>
          )}
      </div>

      {/* Primary Specialization (cascading) */}
      {specializations.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="primary_specialization_id">
            Specialization (optional)
          </Label>
          <select
            id="primary_specialization_id"
            name="primary_specialization_id"
            defaultValue=""
            key={selectedIndustryId}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select a specialization</option>
            {specializations.map((spec) => (
              <option key={spec.id} value={spec.id}>
                {spec.name}
              </option>
            ))}
          </select>
          {state?.success === false &&
            state.fieldErrors?.primary_specialization_id && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.primary_specialization_id[0]}
              </p>
            )}
        </div>
      )}

      {/* Photo Upload */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="photo">Profile photo (optional)</Label>
        <div className="flex items-center gap-4">
          {photoPreview && (
            <img
              src={photoPreview}
              alt="Photo preview"
              className="h-16 w-16 rounded-full object-cover"
            />
          )}
          <Input
            ref={fileInputRef}
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            className="max-w-xs"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, or WebP. Max 5 MB.
        </p>
        {state?.success === false && state.fieldErrors?.photo && (
          <p id="photo-error" className="text-sm text-destructive">
            {state.fieldErrors.photo[0]}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Creating profile…" : "Create profile"}
      </Button>
    </form>
  );
}

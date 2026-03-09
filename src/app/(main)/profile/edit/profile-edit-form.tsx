"use client";

import { useActionState, useEffect, useState, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { updateProfile } from "./actions";
import type {
  ActionResult,
  IndustryWithSpecializations,
  Profile,
} from "@/lib/types";

interface ProfileEditFormProps {
  profile: Profile;
  industries: IndustryWithSpecializations[];
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function ProfileEditForm({
  profile,
  industries,
}: ProfileEditFormProps) {
  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(updateProfile, null);

  const [primaryIndustryId, setPrimaryIndustryId] = useState(
    profile.primary_industry_id
  );
  const [primarySpecId, setPrimarySpecId] = useState(
    profile.primary_specialization_id ?? ""
  );
  const [secondaryIndustryId, setSecondaryIndustryId] = useState(
    profile.secondary_industry_id ?? ""
  );
  const [secondarySpecId, setSecondarySpecId] = useState(
    profile.secondary_specialization_id ?? ""
  );
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    profile.photo_url
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const primaryIndustry = industries.find((i) => i.id === primaryIndustryId);
  const primarySpecs = primaryIndustry?.specializations ?? [];

  const secondaryIndustry = industries.find(
    (i) => i.id === secondaryIndustryId
  );
  const secondarySpecs = secondaryIndustry?.specializations ?? [];

  useEffect(() => {
    if (state?.success) {
      toast.success("Profile updated successfully.");
    }
  }, [state]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
  }

  function fieldError(field: string): string | undefined {
    if (state?.success === false && state.fieldErrors?.[field]) {
      return state.fieldErrors[field][0];
    }
    return undefined;
  }

  return (
    <form action={formAction} className="flex flex-col gap-6" key={profile.updated_at}>
      {state?.success === false && !state.fieldErrors && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      {/* Profile Completeness */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Profile completeness</span>
          <span className="font-medium">{profile.profile_completeness}%</span>
        </div>
        <Progress value={profile.profile_completeness} />
      </div>

      <Separator />

      {/* Photo */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="photo">Profile photo</Label>
        <div className="flex items-center gap-4">
          {photoPreview && (
            <img
              src={photoPreview}
              alt="Profile photo"
              className="h-20 w-20 rounded-full object-cover"
            />
          )}
          <div className="flex flex-col gap-1">
            <Input
              ref={fileInputRef}
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, or WebP. Max 5 MB.
            </p>
          </div>
        </div>
        {fieldError("photo") && (
          <p id="photo-error" className="text-sm text-destructive">{fieldError("photo")}</p>
        )}
      </div>

      <Separator />

      {/* Basic Info */}
      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">Basic information</h3>

        <div className="flex flex-col gap-2">
          <Label htmlFor="full_name">Full name *</Label>
          <Input
            id="full_name"
            name="full_name"
            type="text"
            defaultValue={profile.full_name}
            required
            minLength={2}
            maxLength={100}
            aria-invalid={fieldError("full_name") ? true : undefined}
            aria-describedby={fieldError("full_name") ? "full_name-error" : undefined}
          />
          {fieldError("full_name") && (
            <p id="full_name-error" className="text-sm text-destructive">
              {fieldError("full_name")}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="graduation_year">Graduation year *</Label>
          <Input
            id="graduation_year"
            name="graduation_year"
            type="number"
            defaultValue={profile.graduation_year}
            min={1950}
            max={2100}
            required
            aria-invalid={fieldError("graduation_year") ? true : undefined}
            aria-describedby={fieldError("graduation_year") ? "graduation_year-error" : undefined}
          />
          {fieldError("graduation_year") && (
            <p id="graduation_year-error" className="text-sm text-destructive">
              {fieldError("graduation_year")}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            name="bio"
            defaultValue={profile.bio ?? ""}
            placeholder="Tell other alumni about yourself…"
            maxLength={1000}
            rows={4}
          />
          {fieldError("bio") && (
            <p id="bio-error" className="text-sm text-destructive">{fieldError("bio")}</p>
          )}
        </div>
      </section>

      <Separator />

      {/* Industry */}
      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">Career field</h3>

        <div className="flex flex-col gap-2">
          <Label htmlFor="primary_industry_id">Primary career field *</Label>
          <select
            id="primary_industry_id"
            name="primary_industry_id"
            value={primaryIndustryId}
            onChange={(e) => {
              setPrimaryIndustryId(e.target.value);
              setPrimarySpecId("");
            }}
            required
            aria-invalid={fieldError("primary_industry_id") ? true : undefined}
            aria-describedby={fieldError("primary_industry_id") ? "primary_industry_id-error" : undefined}
            className={selectClass}
          >
            <option value="">Select your career field</option>
            {industries.map((industry) => (
              <option key={industry.id} value={industry.id}>
                {industry.name}
              </option>
            ))}
          </select>
          {fieldError("primary_industry_id") && (
            <p id="primary_industry_id-error" className="text-sm text-destructive">
              {fieldError("primary_industry_id")}
            </p>
          )}
        </div>

        {primarySpecs.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="primary_specialization_id">
              Primary specialization
            </Label>
            <select
              id="primary_specialization_id"
              name="primary_specialization_id"
              value={primarySpecId}
              onChange={(e) => setPrimarySpecId(e.target.value)}
              className={selectClass}
            >
              <option value="">None</option>
              {primarySpecs.map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {spec.name}
                </option>
              ))}
            </select>
            {fieldError("primary_specialization_id") && (
              <p className="text-sm text-destructive">
                {fieldError("primary_specialization_id")}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="secondary_industry_id">
            Secondary career field (optional)
          </Label>
          <select
            id="secondary_industry_id"
            name="secondary_industry_id"
            value={secondaryIndustryId}
            onChange={(e) => {
              setSecondaryIndustryId(e.target.value);
              setSecondarySpecId("");
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

        {secondaryIndustryId && secondarySpecs.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="secondary_specialization_id">
              Secondary specialization
            </Label>
            <select
              id="secondary_specialization_id"
              name="secondary_specialization_id"
              value={secondarySpecId}
              onChange={(e) => setSecondarySpecId(e.target.value)}
              className={selectClass}
            >
              <option value="">None</option>
              {secondarySpecs.map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {spec.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <Separator />

      {/* Location */}
      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">Location</h3>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              name="country"
              type="text"
              defaultValue={profile.country ?? ""}
              placeholder="e.g. United States"
              maxLength={100}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="state_province">State / Province</Label>
            <Input
              id="state_province"
              name="state_province"
              type="text"
              defaultValue={profile.state_province ?? ""}
              placeholder="e.g. California"
              maxLength={100}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              name="city"
              type="text"
              defaultValue={profile.city ?? ""}
              placeholder="e.g. San Francisco"
              maxLength={100}
            />
          </div>
        </div>
      </section>

      <Separator />

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

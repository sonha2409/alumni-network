"use client";

import { useActionState, useEffect, useState, useRef } from "react";
import Image from "next/image";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const NONE_VALUE = "__none__";

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

  function handlePrimaryIndustryChange(value: string | null) {
    setPrimaryIndustryId(value ?? "");
    setPrimarySpecId("");
  }

  function handleSecondaryIndustryChange(value: string | null) {
    const resolved = !value || value === NONE_VALUE ? "" : value;
    setSecondaryIndustryId(resolved);
    setSecondarySpecId("");
  }

  function handleSecondarySpecChange(value: string | null) {
    setSecondarySpecId(!value || value === NONE_VALUE ? "" : value);
  }

  function handlePrimarySpecChange(value: string | null) {
    setPrimarySpecId(!value || value === NONE_VALUE ? "" : value);
  }

  function fieldError(field: string): string | undefined {
    if (state?.success === false && state.fieldErrors?.[field]) {
      return state.fieldErrors[field][0];
    }
    return undefined;
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
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
            <Image
              src={photoPreview}
              alt="Profile photo"
              width={80}
              height={80}
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
          <p className="text-sm text-destructive">{fieldError("photo")}</p>
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
          />
          {fieldError("full_name") && (
            <p className="text-sm text-destructive">
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
          />
          {fieldError("graduation_year") && (
            <p className="text-sm text-destructive">
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
            <p className="text-sm text-destructive">{fieldError("bio")}</p>
          )}
        </div>
      </section>

      <Separator />

      {/* Industry */}
      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">Career field</h3>

        <div className="flex flex-col gap-2">
          <Label htmlFor="primary_industry_id">Primary career field *</Label>
          <input
            type="hidden"
            name="primary_industry_id"
            value={primaryIndustryId}
          />
          <Select
            value={primaryIndustryId}
            onValueChange={handlePrimaryIndustryChange}
            required
          >
            <SelectTrigger
              id="primary_industry_id"
              aria-label="Primary career field"
            >
              <SelectValue placeholder="Select your career field" />
            </SelectTrigger>
            <SelectContent>
              {industries.map((industry) => (
                <SelectItem key={industry.id} value={industry.id}>
                  {industry.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldError("primary_industry_id") && (
            <p className="text-sm text-destructive">
              {fieldError("primary_industry_id")}
            </p>
          )}
        </div>

        {primarySpecs.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="primary_specialization_id">
              Primary specialization
            </Label>
            <input
              type="hidden"
              name="primary_specialization_id"
              value={primarySpecId}
            />
            <Select
              value={primarySpecId || NONE_VALUE}
              onValueChange={handlePrimarySpecChange}
            >
              <SelectTrigger
                id="primary_specialization_id"
                aria-label="Primary specialization"
              >
                <SelectValue placeholder="Select a specialization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>None</SelectItem>
                {primarySpecs.map((spec) => (
                  <SelectItem key={spec.id} value={spec.id}>
                    {spec.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <input
            type="hidden"
            name="secondary_industry_id"
            value={secondaryIndustryId}
          />
          <Select
            value={secondaryIndustryId || NONE_VALUE}
            onValueChange={handleSecondaryIndustryChange}
          >
            <SelectTrigger
              id="secondary_industry_id"
              aria-label="Secondary career field"
            >
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>None</SelectItem>
              {industries.map((industry) => (
                <SelectItem key={industry.id} value={industry.id}>
                  {industry.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {secondaryIndustryId && secondarySpecs.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="secondary_specialization_id">
              Secondary specialization
            </Label>
            <input
              type="hidden"
              name="secondary_specialization_id"
              value={secondarySpecId}
            />
            <Select
              value={secondarySpecId || NONE_VALUE}
              onValueChange={handleSecondarySpecChange}
            >
              <SelectTrigger
                id="secondary_specialization_id"
                aria-label="Secondary specialization"
              >
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>None</SelectItem>
                {secondarySpecs.map((spec) => (
                  <SelectItem key={spec.id} value={spec.id}>
                    {spec.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

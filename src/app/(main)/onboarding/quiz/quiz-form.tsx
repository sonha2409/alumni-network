"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MapPin, Briefcase, Heart, ChevronRight, ChevronLeft, SkipForward } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { completeOnboardingQuiz } from "./actions";
import type { ActionResult, AvailabilityTagType } from "@/lib/types";

interface QuizFormProps {
  availabilityTags: AvailabilityTagType[];
}

const STEPS = [
  { id: "location", title: "Where are you based?", icon: MapPin, description: "This helps us connect you with nearby alumni." },
  { id: "availability", title: "What are you looking for?", icon: Heart, description: "Let others know how they can connect with you." },
  { id: "about", title: "Tell us about yourself", icon: Briefcase, description: "A quick intro helps you stand out." },
] as const;

export function QuizForm({ availabilityTags }: QuizFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();

  // Form state (controlled for multi-step persistence)
  const [country, setCountry] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [city, setCity] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");

  function handleNext() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  function handleSkipAll() {
    router.push("/dashboard");
  }

  function toggleTag(tagId: string) {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  }

  function handleFinish() {
    const formData = new FormData();
    if (country) formData.set("country", country);
    if (stateProvince) formData.set("state_province", stateProvince);
    if (city) formData.set("city", city);
    if (bio) formData.set("bio", bio);
    if (jobTitle) formData.set("job_title", jobTitle);
    if (company) formData.set("company", company);
    for (const tagId of selectedTags) {
      formData.append("availability_tag_ids", tagId);
    }

    startTransition(async () => {
      const result = await completeOnboardingQuiz(null, formData);
      if (result?.success) {
        toast.success("Profile updated! Let's find you some connections.");
        router.push("/dashboard");
      } else if (result) {
        setError(result.error);
        setFieldErrors(result.fieldErrors);
      }
    });
  }

  const isLastStep = currentStep === STEPS.length - 1;
  const StepIcon = STEPS[currentStep].icon;

  return (
    <div className="flex flex-col gap-6">
      {/* Progress bar */}
      <div className="flex gap-2">
        {STEPS.map((step, i) => (
          <div
            key={step.id}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i <= currentStep ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Step header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <StepIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{STEPS[currentStep].title}</h2>
          <p className="text-sm text-muted-foreground">{STEPS[currentStep].description}</p>
        </div>
      </div>

      {error && !fieldErrors && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-5">
        {/* Step 1: Location */}
        {currentStep === 0 && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col gap-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Vietnam, United States"
                maxLength={100}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="state_province">State / Province</Label>
                <Input
                  id="state_province"
                  value={stateProvince}
                  onChange={(e) => setStateProvince(e.target.value)}
                  placeholder="e.g. California"
                  maxLength={100}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Ho Chi Minh City"
                  maxLength={100}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Availability tags */}
        {currentStep === 1 && (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {availabilityTags
                .filter((tag) => !tag.is_archived)
                .map((tag) => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary/5 text-foreground shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3 w-3"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{tag.name}</p>
                        {tag.description && (
                          <p className="text-xs text-muted-foreground">{tag.description}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* Step 3: About */}
        {currentStep === 2 && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col gap-2">
              <Label htmlFor="bio">Short bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A few words about what you do and what you're interested in..."
                maxLength={500}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length}/500
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="job_title">Current job title</Label>
                <Input
                  id="job_title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  maxLength={100}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Google"
                  maxLength={100}
                />
              </div>
            </div>
            {fieldErrors?.bio && (
              <p className="text-sm text-destructive">{fieldErrors.bio[0]}</p>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {currentStep > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={handleBack}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={handleSkipAll}>
                <SkipForward className="mr-1 h-4 w-4" />
                Skip all
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isLastStep && (
              <Button type="button" variant="ghost" size="sm" onClick={handleNext}>
                Skip
              </Button>
            )}
            {isLastStep ? (
              <Button type="button" disabled={submitting} onClick={handleFinish}>
                {submitting ? "Saving..." : "Finish"}
              </Button>
            ) : (
              <Button type="button" onClick={handleNext}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

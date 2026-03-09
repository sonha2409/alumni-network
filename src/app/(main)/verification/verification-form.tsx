"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { submitVerificationRequest } from "./actions";
import type { ActionResult } from "@/lib/types";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_FILES = 4;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ACCEPT_STRING = ".pdf,.jpg,.jpeg,.png,.webp";

interface VerificationFormProps {
  defaultGraduationYear: number;
  minGraduationYear: number;
  maxGraduationYear: number;
  schoolType: "high_school" | "university" | "college";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VerificationForm({ defaultGraduationYear, minGraduationYear, maxGraduationYear, schoolType }: VerificationFormProps) {
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    submitVerificationRequest,
    null
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.success) {
      toast.success("Verification request submitted! We'll review it shortly.");
    } else if (state && !state.success) {
      toast.error(state.error);
    }
  }, [state]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? []);
    setFileError(null);

    const combined = [...selectedFiles, ...newFiles];

    if (combined.length > MAX_FILES) {
      setFileError(`You can upload up to ${MAX_FILES} files.`);
      return;
    }

    for (const file of newFiles) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setFileError(`"${file.name}" is not supported. Use PDF, JPEG, PNG, or WebP.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`"${file.name}" is too large. Maximum is 2 MB per file.`);
        return;
      }
    }

    setSelectedFiles(combined);
    // Reset the input so the same file can be re-selected if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFileError(null);
  }

  // Intercept form submission to inject files into FormData
  function handleSubmit(formData: FormData) {
    // Remove the native file input entries (may be stale)
    formData.delete("documents");
    // Append our managed file list
    for (const file of selectedFiles) {
      formData.append("documents", file);
    }
    formAction(formData);
  }

  if (state?.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Request Submitted</CardTitle>
          <CardDescription>
            Your verification request has been submitted and is under review.
            You&apos;ll be notified once an admin has reviewed it.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const serverFileError = state && !state.success ? state.fieldErrors?.documents?.[0] : undefined;
  const displayFileError = fileError ?? serverFileError;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify Your Alumni Status</CardTitle>
        <CardDescription>
          Submit your details so we can confirm you&apos;re an alumnus. An admin
          will review your request.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="graduation_year">Graduation Year *</Label>
            <Input
              id="graduation_year"
              name="graduation_year"
              type="number"
              defaultValue={defaultGraduationYear}
              required
              min={minGraduationYear}
              max={maxGraduationYear}
              aria-describedby={
                state && !state.success && state.fieldErrors?.graduation_year
                  ? "graduation_year-error"
                  : undefined
              }
            />
            {state && !state.success && state.fieldErrors?.graduation_year && (
              <p id="graduation_year-error" className="text-sm text-destructive">
                {state.fieldErrors.graduation_year[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialization_name">
              {schoolType === "high_school" ? "Specialization (Chuyên ngành) *" : "Degree Program *"}
            </Label>
            <Input
              id="specialization_name"
              name="specialization_name"
              placeholder={
                schoolType === "high_school"
                  ? "e.g., Chuyên Toán, Chuyên Lý, Chuyên Tin"
                  : "e.g., Bachelor of Science in Computer Science"
              }
              required
              maxLength={200}
              aria-describedby={
                state && !state.success && state.fieldErrors?.specialization_name
                  ? "specialization_name-error"
                  : undefined
              }
            />
            {state && !state.success && state.fieldErrors?.specialization_name && (
              <p id="specialization_name-error" className="text-sm text-destructive">
                {state.fieldErrors.specialization_name[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="student_id">Student ID (optional)</Label>
            <Input
              id="student_id"
              name="student_id"
              placeholder="Your student ID number"
              maxLength={50}
              aria-describedby={
                state && !state.success && state.fieldErrors?.student_id
                  ? "student_id-error"
                  : undefined
              }
            />
            {state && !state.success && state.fieldErrors?.student_id && (
              <p id="student_id-error" className="text-sm text-destructive">
                {state.fieldErrors.student_id[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="supporting_info">
              Additional Information (optional)
            </Label>
            <Textarea
              id="supporting_info"
              name="supporting_info"
              placeholder="Any additional details that can help verify your alumni status (e.g., clubs, activities, faculty you worked with)"
              maxLength={1000}
              rows={4}
              aria-describedby={
                state && !state.success && state.fieldErrors?.supporting_info
                  ? "supporting_info-error"
                  : undefined
              }
            />
            {state && !state.success && state.fieldErrors?.supporting_info && (
              <p id="supporting_info-error" className="text-sm text-destructive">
                {state.fieldErrors.supporting_info[0]}
              </p>
            )}
          </div>

          {/* Document upload */}
          <div className="space-y-2">
            <Label htmlFor="documents">
              Supporting Documents (optional)
            </Label>
            <p className="text-sm text-muted-foreground">
              Upload transcripts, diplomas, or other proof. Up to {MAX_FILES} files, 2 MB each. PDF, JPEG, PNG, or WebP.
            </p>

            {selectedFiles.length < MAX_FILES && (
              <Input
                ref={fileInputRef}
                id="documents"
                type="file"
                accept={ACCEPT_STRING}
                multiple
                onChange={handleFileChange}
                className="cursor-pointer"
                aria-describedby={displayFileError ? "documents-error" : undefined}
              />
            )}

            {selectedFiles.length > 0 && (
              <ul className="space-y-2 mt-2">
                {selectedFiles.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground">
                        {file.type === "application/pdf" ? "PDF" : "IMG"}
                      </span>
                      <span className="truncate">{file.name}</span>
                      <span className="text-muted-foreground whitespace-nowrap">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="ml-2 h-auto px-2 py-1 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${file.name}`}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {displayFileError && (
              <p id="documents-error" className="text-sm text-destructive">
                {displayFileError}
              </p>
            )}
          </div>

          {state && !state.success && !state.fieldErrors && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Submitting..." : "Submit Verification Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

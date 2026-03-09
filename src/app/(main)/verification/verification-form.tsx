"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { submitVerificationRequest } from "./actions";
import type { ActionResult } from "@/lib/types";

interface VerificationFormProps {
  defaultGraduationYear: number;
}

export function VerificationForm({ defaultGraduationYear }: VerificationFormProps) {
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    submitVerificationRequest,
    null
  );

  useEffect(() => {
    if (state?.success) {
      toast.success("Verification request submitted! We'll review it shortly.");
    } else if (state && !state.success) {
      toast.error(state.error);
    }
  }, [state]);

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
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="graduation_year">Graduation Year *</Label>
            <Input
              id="graduation_year"
              name="graduation_year"
              type="number"
              defaultValue={defaultGraduationYear}
              required
              min={1950}
              max={2100}
            />
            {state && !state.success && state.fieldErrors?.graduation_year && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.graduation_year[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="degree_program">Degree Program *</Label>
            <Input
              id="degree_program"
              name="degree_program"
              placeholder="e.g., Bachelor of Science in Computer Science"
              required
              maxLength={200}
            />
            {state && !state.success && state.fieldErrors?.degree_program && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.degree_program[0]}
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
            />
            {state && !state.success && state.fieldErrors?.student_id && (
              <p className="text-sm text-destructive">
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
            />
            {state && !state.success && state.fieldErrors?.supporting_info && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.supporting_info[0]}
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

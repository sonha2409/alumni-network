"use client";

import { useState, useActionState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateStalenessThreshold } from "./actions";
import type { ActionResult } from "@/lib/types";

interface StalenessSettingsFormProps {
  currentMonths: number;
}

export function StalenessSettingsForm({
  currentMonths,
}: StalenessSettingsFormProps) {
  const t = useTranslations("admin.settings");
  const tCommon = useTranslations("common");
  const [value, setValue] = useState(String(currentMonths));
  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(updateStalenessThreshold, null);

  useEffect(() => {
    if (state?.success) {
      toast.success(t("stalenessUpdated"));
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("stalenessTitle")}</CardTitle>
        <CardDescription>
          {t("stalenessDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state?.success === false && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {state.error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staleness_months">{t("thresholdLabel")}</Label>
            <Input
              id="staleness_months"
              name="staleness_months"
              type="number"
              min={0}
              max={60}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="max-w-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              {t("thresholdHint")}
            </p>
          </div>

          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? tCommon("saving") : tCommon("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

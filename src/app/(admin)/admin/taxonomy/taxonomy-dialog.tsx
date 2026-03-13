"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TaxonomyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  target: "industry" | "specialization";
  initialName: string;
  isLoading: boolean;
  onSubmit: (name: string) => void;
}

export function TaxonomyDialog({
  open,
  onOpenChange,
  mode,
  target,
  initialName,
  isLoading,
  onSubmit,
}: TaxonomyDialogProps) {
  const t = useTranslations("admin.taxonomy");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName, open]);

  const title =
    mode === "create"
      ? (target === "industry" ? t("addIndustryDialog") : t("addSpecDialog"))
      : (target === "industry" ? t("editIndustryDialog") : t("editSpecDialog"));

  const description =
    mode === "create"
      ? (target === "industry" ? t("createIndustryDesc") : t("createSpecDesc"))
      : (target === "industry" ? t("editIndustryDesc") : t("editSpecDesc"));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    onSubmit(name.trim());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="my-4">
            <Label htmlFor="taxonomy-name">{t("nameLabel")}</Label>
            <Input
              id="taxonomy-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={target === "industry" ? t("namePlaceholderIndustry") : t("namePlaceholderSpec")}
              maxLength={100}
              autoFocus
              disabled={isLoading}
            />
            {name.trim().length > 0 && name.trim().length < 2 && (
              <p className="mt-1 text-sm text-destructive">
                {t("nameMinError")}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || name.trim().length < 2}
            >
              {isLoading
                ? mode === "create"
                  ? tCommon("creating")
                  : tCommon("saving")
                : mode === "create"
                  ? tCommon("create")
                  : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect } from "react";

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
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName, open]);

  const title =
    mode === "create"
      ? `Add ${target === "industry" ? "Industry" : "Specialization"}`
      : `Edit ${target === "industry" ? "Industry" : "Specialization"}`;

  const description =
    mode === "create"
      ? `Create a new ${target === "industry" ? "industry category" : "specialization"}.`
      : `Rename this ${target === "industry" ? "industry category" : "specialization"}.`;

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
            <Label htmlFor="taxonomy-name">Name</Label>
            <Input
              id="taxonomy-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g. ${target === "industry" ? "Technology" : "Software Engineering"}`}
              maxLength={100}
              autoFocus
              disabled={isLoading}
            />
            {name.trim().length > 0 && name.trim().length < 2 && (
              <p className="mt-1 text-sm text-destructive">
                Name must be at least 2 characters.
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
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || name.trim().length < 2}
            >
              {isLoading
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create"
                  : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useTransition } from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createGroup } from "./actions";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function CreateGroupDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await createGroup(formData);
      if (result.success) {
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <PlusIcon className="h-4 w-4" />
        Create group
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new group</DialogTitle>
          <DialogDescription>
            Groups help alumni connect around shared interests, graduating classes, or locations.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="group-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="group-name"
              name="name"
              placeholder="e.g. Class of 2020"
              required
              maxLength={100}
              className="h-9"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="group-type" className="text-sm font-medium">
              Type
            </label>
            <select
              id="group-type"
              name="type"
              required
              className={selectClass}
              defaultValue=""
            >
              <option value="" disabled>
                Select a type...
              </option>
              <option value="year_based">Year-based</option>
              <option value="field_based">Field-based</option>
              <option value="location_based">Location-based</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="group-description" className="text-sm font-medium">
              Description{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="group-description"
              name="description"
              placeholder="What is this group about?"
              maxLength={1000}
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Creating..." : "Create group"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

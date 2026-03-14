"use client";

import { useState } from "react";
import { SquarePen } from "lucide-react";
import { useTranslations } from "next-intl";
import { NewMessageDialog } from "./new-message-dialog";

export function NewMessageButton() {
  const t = useTranslations("messages");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={t("newMessage")}
      >
        <SquarePen className="h-5 w-5" />
      </button>
      <NewMessageDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

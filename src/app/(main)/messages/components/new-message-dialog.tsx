"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getOrCreateConversation } from "../actions";
import { fetchConnections } from "../actions";

interface ConnectionItem {
  user_id: string;
  full_name: string;
  photo_url: string | null;
}

export function NewMessageDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("messages");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchConnections().then((result) => {
        if (result.success) {
          setConnections(result.data);
        }
        setLoading(false);
      });
    } else {
      setSearch("");
    }
  }, [open]);

  const filtered = connections.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase())
  );

  function handleSelect(userId: string) {
    startTransition(async () => {
      const result = await getOrCreateConversation(userId);
      if (result.success) {
        onOpenChange(false);
        router.push(`/messages/${result.data.conversationId}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("newMessage")}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchConnections")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
        <div className="max-h-80 overflow-y-auto -mx-1">
          {loading ? (
            <div className="space-y-3 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              {search ? t("noConnectionsMatch") : t("noConnectionsToMessage")}
            </p>
          ) : (
            filtered.map((conn) => (
              <button
                key={conn.user_id}
                onClick={() => handleSelect(conn.user_id)}
                disabled={isPending}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
              >
                {conn.photo_url ? (
                  <img
                    src={conn.photo_url}
                    alt={conn.full_name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                    {conn.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium">{conn.full_name}</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnnouncementWithAuthor } from "@/lib/types";

import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  toggleAnnouncement,
  deleteAnnouncement,
} from "./actions";

export function AnnouncementsClient() {
  const [announcements, setAnnouncements] = useState<AnnouncementWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<AnnouncementWithAuthor | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const fetchAnnouncements = useCallback(async () => {
    const result = await getAnnouncements();
    if (result.success) {
      setAnnouncements(result.data);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  function resetForm() {
    setTitle("");
    setBody("");
    setLink("");
    setFieldErrors({});
  }

  function openCreate() {
    resetForm();
    setCreateOpen(true);
  }

  function openEdit(announcement: AnnouncementWithAuthor) {
    setSelected(announcement);
    setTitle(announcement.title);
    setBody(announcement.body);
    setLink(announcement.link ?? "");
    setFieldErrors({});
    setEditOpen(true);
  }

  function openDelete(announcement: AnnouncementWithAuthor) {
    setSelected(announcement);
    setDeleteOpen(true);
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createAnnouncement({ title, body, link: link || undefined });
      if (result.success) {
        toast.success("Announcement published and notifications sent.");
        setCreateOpen(false);
        resetForm();
        fetchAnnouncements();
      } else {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        toast.error(result.error);
      }
    });
  }

  function handleUpdate() {
    if (!selected) return;
    startTransition(async () => {
      const result = await updateAnnouncement(selected.id, {
        title,
        body,
        link: link || undefined,
      });
      if (result.success) {
        toast.success("Announcement updated.");
        setEditOpen(false);
        resetForm();
        setSelected(null);
        fetchAnnouncements();
      } else {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        toast.error(result.error);
      }
    });
  }

  function handleToggle(announcement: AnnouncementWithAuthor) {
    startTransition(async () => {
      const result = await toggleAnnouncement(announcement.id, !announcement.is_active);
      if (result.success) {
        toast.success(
          announcement.is_active ? "Announcement deactivated." : "Announcement activated."
        );
        fetchAnnouncements();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    if (!selected) return;
    startTransition(async () => {
      const result = await deleteAnnouncement(selected.id);
      if (result.success) {
        toast.success("Announcement deleted.");
        setDeleteOpen(false);
        setSelected(null);
        fetchAnnouncements();
      } else {
        toast.error(result.error);
      }
    });
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create button */}
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Announcement
        </Button>
      </div>

      {/* Announcements list */}
      {announcements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No announcements yet. Create one to notify all verified users.
            </p>
          </CardContent>
        </Card>
      ) : (
        announcements.map((announcement) => (
          <Card
            key={announcement.id}
            className={announcement.is_active ? "" : "opacity-60"}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Megaphone className="h-4 w-4 shrink-0 text-orange-500" />
                    <span className="truncate">{announcement.title}</span>
                    {!announcement.is_active && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </CardTitle>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleToggle(announcement)}
                    disabled={isPending}
                    title={announcement.is_active ? "Deactivate" : "Activate"}
                  >
                    {announcement.is_active ? (
                      <ToggleRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(announcement)}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => openDelete(announcement)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {announcement.body}
              </p>
              {announcement.link && (
                <a
                  href={announcement.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {announcement.link}
                </a>
              )}
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span>By {announcement.author_name ?? "Unknown"}</span>
                <span>&middot;</span>
                <span>Published {formatDate(announcement.published_at)}</span>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
          </DialogHeader>
          <AnnouncementForm
            title={title}
            body={body}
            link={link}
            fieldErrors={fieldErrors}
            onTitleChange={setTitle}
            onBodyChange={setBody}
            onLinkChange={setLink}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            resetForm();
            setSelected(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
          </DialogHeader>
          <AnnouncementForm
            title={title}
            body={body}
            link={link}
            fieldErrors={fieldErrors}
            onTitleChange={setTitle}
            onBodyChange={setBody}
            onLinkChange={setLink}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &ldquo;{selected?.title}&rdquo;? This action
            cannot be undone. Users who already received the notification will keep it.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// Shared form component
// =============================================================================

function AnnouncementForm({
  title,
  body,
  link,
  fieldErrors,
  onTitleChange,
  onBodyChange,
  onLinkChange,
}: {
  title: string;
  body: string;
  link: string;
  fieldErrors: Record<string, string[]>;
  onTitleChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onLinkChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="announcement-title">Title</Label>
        <Input
          id="announcement-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g. Platform maintenance this weekend"
          maxLength={200}
          aria-describedby={fieldErrors.title ? "title-error" : undefined}
        />
        {fieldErrors.title && (
          <p id="title-error" className="mt-1 text-sm text-destructive">
            {fieldErrors.title[0]}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="announcement-body">Body</Label>
        <Textarea
          id="announcement-body"
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="Write the announcement content..."
          rows={4}
          maxLength={2000}
          aria-describedby={fieldErrors.body ? "body-error" : undefined}
        />
        {fieldErrors.body && (
          <p id="body-error" className="mt-1 text-sm text-destructive">
            {fieldErrors.body[0]}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {body.length}/2000 characters
        </p>
      </div>
      <div>
        <Label htmlFor="announcement-link">Link (optional)</Label>
        <Input
          id="announcement-link"
          value={link}
          onChange={(e) => onLinkChange(e.target.value)}
          placeholder="https://..."
          maxLength={500}
          aria-describedby={fieldErrors.link ? "link-error" : undefined}
        />
        {fieldErrors.link && (
          <p id="link-error" className="mt-1 text-sm text-destructive">
            {fieldErrors.link[0]}
          </p>
        )}
      </div>
    </div>
  );
}

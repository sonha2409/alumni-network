"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getConversationAttachments } from "../actions";
import { createClient } from "@/lib/supabase/client";
import {
  formatFileSize,
  getFileTypeLabel,
  isImageType,
} from "@/lib/attachments";
import { ImageLightbox } from "./image-lightbox";
import type { AttachmentWithSender } from "@/lib/types";

type FilterTab = "all" | "media" | "files";

interface MediaPanelProps {
  conversationId: string;
  onClose: () => void;
}

export function MediaPanel({ conversationId, onClose }: MediaPanelProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [attachments, setAttachments] = useState<AttachmentWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const filterParam =
    activeTab === "media"
      ? "image"
      : activeTab === "files"
        ? "document"
        : null;

  const loadAttachments = useCallback(
    async (cursor?: string) => {
      const isInitial = !cursor;
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      const result = await getConversationAttachments(
        conversationId,
        filterParam as "image" | "document" | null,
        cursor ?? null,
        20
      );

      if (result.success) {
        if (isInitial) {
          setAttachments(result.data.attachments);
        } else {
          setAttachments((prev) => [...prev, ...result.data.attachments]);
        }
        setHasMore(result.data.hasMore);
      }

      if (isInitial) setLoading(false);
      else setLoadingMore(false);
    },
    [conversationId, filterParam]
  );

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  function handleLoadMore() {
    const lastItem = attachments[attachments.length - 1];
    if (lastItem) {
      loadAttachments(lastItem.created_at);
    }
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "media", label: "Media" },
    { key: "files", label: "Files" },
  ];

  return (
    <div className="flex h-full w-80 flex-shrink-0 flex-col border-l bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Shared Media & Files</h2>
        <button
          onClick={onClose}
          className="rounded-md p-1 hover:bg-muted"
          aria-label="Close media panel"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        ) : attachments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {activeTab === "media"
                ? "No shared images yet"
                : activeTab === "files"
                  ? "No shared files yet"
                  : "No shared media or files yet"}
            </p>
          </div>
        ) : activeTab === "media" ? (
          <MediaGrid attachments={attachments} />
        ) : activeTab === "files" ? (
          <FilesList attachments={attachments} />
        ) : (
          <MixedList attachments={attachments} />
        )}

        {hasMore && !loading && (
          <div className="mt-3 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading..." : "Load more"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function MediaGrid({
  attachments,
}: {
  attachments: AttachmentWithSender[];
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-3 gap-1">
        {attachments.map((att, idx) => (
          <button
            key={att.id}
            type="button"
            onClick={() => setLightboxIndex(idx)}
            className="aspect-square overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label={`View ${att.file_name}`}
          >
            {att.signed_url ? (
              <img
                src={att.signed_url}
                alt={att.file_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              </div>
            )}
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={attachments.map((a) => ({
            url: a.signed_url ?? "",
            alt: a.file_name,
          }))}
          initialIndex={lightboxIndex}
          open={true}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

function FilesList({
  attachments,
}: {
  attachments: AttachmentWithSender[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {attachments.map((att) => (
        <FileRow key={att.id} attachment={att} />
      ))}
    </div>
  );
}

function MixedList({
  attachments,
}: {
  attachments: AttachmentWithSender[];
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const images = attachments.filter((a) => a.attachment_type === "image");

  return (
    <>
      <div className="flex flex-col gap-1.5">
        {attachments.map((att, idx) =>
          att.attachment_type === "image" ? (
            <button
              key={att.id}
              type="button"
              onClick={() =>
                setLightboxIndex(images.findIndex((img) => img.id === att.id))
              }
              className="flex items-center gap-2 rounded-md p-2 text-left hover:bg-muted"
            >
              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded">
                {att.signed_url ? (
                  <img
                    src={att.signed_url}
                    alt={att.file_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-muted" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{att.file_name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {att.sender_name} &middot; {formatFileSize(att.file_size)}
                </p>
              </div>
            </button>
          ) : (
            <FileRow key={att.id} attachment={att} />
          )
        )}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={images.map((a) => ({
            url: a.signed_url ?? "",
            alt: a.file_name,
          }))}
          initialIndex={lightboxIndex}
          open={true}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

function FileRow({ attachment }: { attachment: AttachmentWithSender }) {
  function handleDownload() {
    if (attachment.signed_url) {
      const link = document.createElement("a");
      link.href = attachment.signed_url;
      link.download = attachment.file_name;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 rounded-md p-2 text-left hover:bg-muted"
      aria-label={`Download ${attachment.file_name}`}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-muted">
        <span className="text-[10px] font-semibold text-muted-foreground">
          {getFileTypeLabel(attachment.content_type)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{attachment.file_name}</p>
        <p className="text-[10px] text-muted-foreground">
          {attachment.sender_name} &middot; {formatFileSize(attachment.file_size)}
        </p>
      </div>
    </button>
  );
}

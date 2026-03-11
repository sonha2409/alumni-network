"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  formatFileSize,
  getFileTypeLabel,
  isImageType,
} from "@/lib/attachments";
import type { MessageAttachment } from "@/lib/types";
import { ImageLightbox } from "./image-lightbox";

interface AttachmentPreviewProps {
  attachments: MessageAttachment[];
  isOwn: boolean;
}

export function AttachmentPreview({
  attachments,
}: AttachmentPreviewProps) {
  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter((a) => a.attachment_type === "image");
  const docs = attachments.filter((a) => a.attachment_type === "document");

  return (
    <div className="mt-1 flex flex-col gap-1">
      {images.length > 0 && <ImageGrid images={images} />}
      {docs.length > 0 && (
        <div className="flex flex-col gap-1">
          {docs.map((doc) => (
            <DocumentRow key={doc.id} attachment={doc} />
          ))}
        </div>
      )}
    </div>
  );
}

function ImageGrid({ images }: { images: MessageAttachment[] }) {
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    async function fetchUrls() {
      const urlMap = new Map<string, string>();
      await Promise.all(
        images.map(async (img) => {
          const { data } = await supabase.storage
            .from("message-attachments")
            .createSignedUrl(img.file_path, 3600);
          if (data?.signedUrl && !cancelled) {
            urlMap.set(img.id, data.signedUrl);
          }
        })
      );
      if (!cancelled) setSignedUrls(urlMap);
    }

    fetchUrls();
    return () => {
      cancelled = true;
    };
  }, [images, supabase]);

  const handleImageError = useCallback(
    async (attachmentId: string, filePath: string) => {
      const { data } = await supabase.storage
        .from("message-attachments")
        .createSignedUrl(filePath, 3600);
      if (data?.signedUrl) {
        setSignedUrls((prev) => new Map(prev).set(attachmentId, data.signedUrl));
      }
    },
    [supabase]
  );

  const gridClass =
    images.length === 1
      ? "grid-cols-1"
      : images.length === 2
        ? "grid-cols-2"
        : images.length === 3
          ? "grid-cols-2"
          : "grid-cols-2";

  return (
    <>
      <div className={`grid ${gridClass} gap-1`}>
        {images.map((img, idx) => {
          const url = signedUrls.get(img.id);
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => setLightboxIndex(idx)}
              className="overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label={`View ${img.file_name}`}
            >
              {url ? (
                <img
                  src={url}
                  alt={img.file_name}
                  className="max-w-[300px] rounded-lg object-cover"
                  style={
                    img.width && img.height
                      ? { aspectRatio: `${img.width}/${img.height}` }
                      : undefined
                  }
                  onError={() => handleImageError(img.id, img.file_path)}
                />
              ) : (
                <div className="flex h-32 w-full items-center justify-center rounded-lg bg-muted">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={images.map((img) => ({
            url: signedUrls.get(img.id) ?? "",
            alt: img.file_name,
          }))}
          initialIndex={lightboxIndex}
          open={true}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

function DocumentRow({
  attachment,
}: {
  attachment: MessageAttachment;
}) {
  const [downloading, setDownloading] = useState(false);
  const supabase = createClient();

  async function handleDownload() {
    setDownloading(true);
    try {
      const { data } = await supabase.storage
        .from("message-attachments")
        .createSignedUrl(attachment.file_path, 60);

      if (data?.signedUrl) {
        const link = document.createElement("a");
        link.href = data.signedUrl;
        link.download = attachment.file_name;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      // Silently fail
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
      aria-label={`Download ${attachment.file_name}`}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
        <span className="text-[11px] font-bold text-muted-foreground">
          {getFileTypeLabel(attachment.content_type)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {attachment.file_name}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(attachment.file_size)}
        </p>
      </div>
      {downloading && (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      )}
    </button>
  );
}

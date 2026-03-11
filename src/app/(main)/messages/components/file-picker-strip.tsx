"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  formatFileSize,
  getFileTypeLabel,
  isImageType,
} from "@/lib/attachments";

export interface SelectedFile {
  id: string;
  file: File;
  previewUrl: string | null;
  status: "pending" | "uploading" | "uploaded" | "error";
  storagePath?: string;
  error?: string;
  progress?: number;
}

interface FilePickerStripProps {
  files: SelectedFile[];
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}

export function FilePickerStrip({
  files,
  onRemove,
  onRetry,
}: FilePickerStripProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto border-b bg-muted/30 px-4 py-2">
      {files.map((f) => (
        <FilePreviewCard
          key={f.id}
          file={f}
          onRemove={() => onRemove(f.id)}
          onRetry={() => onRetry(f.id)}
        />
      ))}
    </div>
  );
}

function FilePreviewCard({
  file,
  onRemove,
  onRetry,
}: {
  file: SelectedFile;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const isImage = isImageType(file.file.type);

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove();
    },
    [onRemove]
  );

  return (
    <div className="relative flex-shrink-0">
      <div className="relative h-16 w-16 overflow-hidden rounded-lg border bg-background">
        {isImage && file.previewUrl ? (
          <img
            src={file.previewUrl}
            alt={file.file.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 p-1">
            <DocIcon contentType={file.file.type} />
            <span className="max-w-full truncate text-[9px] text-muted-foreground">
              {getFileTypeLabel(file.file.type)}
            </span>
          </div>
        )}

        {/* Upload progress overlay */}
        {file.status === "uploading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {/* Error overlay */}
        {file.status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
            <button
              onClick={onRetry}
              className="rounded-full bg-background p-1 shadow-sm"
              aria-label={`Retry uploading ${file.file.name}`}
            >
              <svg
                className="h-3.5 w-3.5 text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={handleRemove}
        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background shadow-sm hover:bg-foreground/80"
        aria-label={`Remove ${file.file.name}`}
      >
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
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

      {/* File info tooltip */}
      <div className="mt-0.5 max-w-[64px] text-center">
        <p className="truncate text-[9px] text-muted-foreground" title={file.file.name}>
          {file.file.name}
        </p>
        <p className="text-[8px] text-muted-foreground/70">
          {formatFileSize(file.file.size)}
        </p>
      </div>
    </div>
  );
}

function DocIcon({ contentType }: { contentType: string }) {
  // Simple doc icon
  return (
    <svg
      className="h-6 w-6 text-muted-foreground"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  );
}

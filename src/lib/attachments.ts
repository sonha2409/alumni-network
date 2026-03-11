/**
 * Shared constants and helpers for message attachments.
 */

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
] as const;

export const ALLOWED_TYPES: string[] = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOC_TYPES,
];

/** Accept string for file input elements. */
export const FILE_INPUT_ACCEPT = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOC_TYPES,
].join(",");

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_FILES_PER_MESSAGE = 5;
export const STORAGE_QUOTA_BYTES = 25 * 1024 * 1024; // 25MB

/** Map of MIME type to human-readable file extension. */
export const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/plain": ".txt",
  "text/csv": ".csv",
};

/** Get short label for a MIME type. */
export function getFileTypeLabel(contentType: string): string {
  const ext = MIME_EXTENSIONS[contentType];
  if (ext) return ext.slice(1).toUpperCase();
  return "FILE";
}

/** Check if a MIME type is an image type. */
export function isImageType(contentType: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType);
}

/** Format bytes to human-readable string. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

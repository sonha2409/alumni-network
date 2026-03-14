"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { sendMessage, checkStorageQuota } from "../actions";
import { useMessages } from "./messages-provider";
import { FilePickerStrip, type SelectedFile } from "./file-picker-strip";
import { createClient } from "@/lib/supabase/client";
import {
  ALLOWED_TYPES,
  FILE_INPUT_ACCEPT,
  MAX_FILE_SIZE,
  MAX_FILES_PER_MESSAGE,
  isImageType,
  formatFileSize,
} from "@/lib/attachments";
import type { AttachmentInput, MessageWithSender } from "@/lib/types";

interface MessageInputProps {
  conversationId: string;
  currentUserId: string;
}

export function MessageInput({
  conversationId,
  currentUserId,
}: MessageInputProps) {
  const t = useTranslations("messages");
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addOptimisticMessage, updateConversation, broadcastTyping, broadcastStopTyping } = useMessages();
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasFiles = selectedFiles.length > 0;
  const isUploading = selectedFiles.some((f) => f.status === "uploading");
  const hasErrors = selectedFiles.some((f) => f.status === "error");
  const canSend =
    (content.trim() || hasFiles) && !isSending && !isUploading;

  function generateFileId(): string {
    return `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    setError(null);

    // Check total count
    const totalCount = selectedFiles.length + files.length;
    if (totalCount > MAX_FILES_PER_MESSAGE) {
      setError(t("maxFiles", { max: MAX_FILES_PER_MESSAGE }));
      return;
    }

    const newFiles: SelectedFile[] = [];
    for (const file of files) {
      // Validate type
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(t("fileNotSupported", { name: file.name }));
        continue;
      }
      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        setError(t("fileTooLarge", { name: file.name, size: formatFileSize(file.size) }));
        continue;
      }

      const previewUrl = isImageType(file.type)
        ? URL.createObjectURL(file)
        : null;

      newFiles.push({
        id: generateFileId(),
        file,
        previewUrl,
        status: "pending",
      });
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  }

  function handleRemoveFile(id: string) {
    setSelectedFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  }

  async function uploadFile(file: SelectedFile): Promise<SelectedFile> {
    const supabase = createClient();
    const ext = file.file.name.split(".").pop() ?? "bin";
    const fileId = crypto.randomUUID();
    const storagePath = `${currentUserId}/${conversationId}/${fileId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("message-attachments")
      .upload(storagePath, file.file, {
        contentType: file.file.type,
        upsert: false,
      });

    if (uploadError) {
      return { ...file, status: "error", error: uploadError.message };
    }

    return { ...file, status: "uploaded", storagePath };
  }

  async function handleRetryFile(id: string) {
    const file = selectedFiles.find((f) => f.id === id);
    if (!file || file.status !== "error") return;

    setSelectedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "uploading", error: undefined } : f))
    );

    const updated = await uploadFile(file);
    setSelectedFiles((prev) =>
      prev.map((f) => (f.id === id ? updated : f))
    );
  }

  async function getImageDimensions(
    file: File
  ): Promise<{ width: number; height: number } | null> {
    if (!isImageType(file.type)) return null;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
  }

  async function handleSend() {
    if (!canSend) return;

    setError(null);
    setIsSending(true);

    let attachmentInputs: AttachmentInput[] | undefined;

    // Upload files if any
    if (hasFiles) {
      // Check quota first
      const quotaResult = await checkStorageQuota();
      if (!quotaResult.success) {
        setError(quotaResult.error);
        setIsSending(false);
        return;
      }

      const totalNewSize = selectedFiles.reduce((sum, f) => sum + f.file.size, 0);
      if (totalNewSize > quotaResult.data.remainingBytes) {
        setError(
          t("notEnoughStorage", { remaining: formatFileSize(quotaResult.data.remainingBytes) })
        );
        setIsSending(false);
        return;
      }

      // Upload all pending files
      setSelectedFiles((prev) =>
        prev.map((f) =>
          f.status === "pending" ? { ...f, status: "uploading" } : f
        )
      );

      const uploadResults = await Promise.all(
        selectedFiles.map(async (f) => {
          if (f.status === "uploaded") return f;
          return uploadFile(f);
        })
      );

      setSelectedFiles(uploadResults);

      // Check if any failed
      const failed = uploadResults.filter((f) => f.status === "error");
      if (failed.length > 0) {
        setError(t("uploadFailed", { count: failed.length }));
        setIsSending(false);
        return;
      }

      // Build attachment inputs
      attachmentInputs = await Promise.all(
        uploadResults.map(async (f) => {
          const dims = await getImageDimensions(f.file);
          return {
            fileName: f.file.name,
            filePath: f.storagePath!,
            fileSize: f.file.size,
            contentType: f.file.type,
            attachmentType: isImageType(f.file.type)
              ? ("image" as const)
              : ("document" as const),
            ...(dims ?? {}),
          };
        })
      );
    }

    // Optimistic update
    const trimmed = content.trim();
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: MessageWithSender = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: trimmed,
      is_edited: false,
      edited_at: null,
      is_deleted: false,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: {
        user_id: currentUserId,
        full_name: "You",
        photo_url: null,
      },
      // Optimistic attachments from selected files
      attachments: selectedFiles.map((f) => ({
        id: `opt-att-${f.id}`,
        message_id: optimisticId,
        uploader_id: currentUserId,
        file_name: f.file.name,
        file_path: f.storagePath ?? "",
        file_size: f.file.size,
        content_type: f.file.type,
        attachment_type: isImageType(f.file.type)
          ? ("image" as const)
          : ("document" as const),
        width: null,
        height: null,
        is_deleted: false,
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
    };

    addOptimisticMessage(optimisticMessage);
    broadcastStopTyping();
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
      typingDebounceRef.current = null;
    }
    setContent("");
    // Revoke preview URLs
    for (const f of selectedFiles) {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    }
    setSelectedFiles([]);

    // Reset textarea height and keep focus
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }

    const result = await sendMessage(conversationId, trimmed, attachmentInputs);
    setIsSending(false);

    if (!result.success) {
      setError(result.error);
      setContent(trimmed);
    } else {
      // Update conversation preview
      let preview: string;
      if (trimmed) {
        preview = trimmed.length > 100 ? trimmed.slice(0, 100) + "..." : trimmed;
      } else if (attachmentInputs && attachmentInputs.length > 0) {
        const firstAtt = attachmentInputs[0];
        preview =
          firstAtt.attachmentType === "image"
            ? "\ud83d\udcf7 Photo"
            : `\ud83d\udcce ${firstAtt.fileName}`;
      } else {
        preview = trimmed;
      }

      updateConversation({
        id: conversationId,
        last_message_at: result.data.message.created_at,
        last_message_preview: preview,
      });

      // Show rate limit warning if getting close
      const { rateLimitInfo } = result.data;
      if (rateLimitInfo.remaining <= 5 && rateLimitInfo.remaining > 0) {
        setRateLimitWarning(
          t("remainingMessages", { count: rateLimitInfo.remaining })
        );
      } else if (rateLimitInfo.remaining === 0) {
        setRateLimitWarning(t("dailyLimitReached"));
      } else {
        setRateLimitWarning(null);
      }
    }

    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
    setError(null);

    // Broadcast typing indicator (debounced — send at most every 2s)
    if (e.target.value.trim()) {
      if (!typingDebounceRef.current) {
        broadcastTyping();
      }
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
      }
      typingDebounceRef.current = setTimeout(() => {
        typingDebounceRef.current = null;
      }, 2000);
    }

    // Auto-resize
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [selectedFiles.length]
  );

  return (
    <div
      className="border-t"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="flex items-center justify-center border-2 border-dashed border-primary bg-primary/5 px-4 py-6">
          <p className="text-sm text-primary">{t("dropFilesHere")}</p>
        </div>
      )}

      {/* File preview strip */}
      <FilePickerStrip
        files={selectedFiles}
        onRemove={handleRemoveFile}
        onRetry={handleRetryFile}
      />

      <div className="px-4 py-3">
        {rateLimitWarning && (
          <div className="mb-2 rounded-md bg-yellow-50 px-3 py-1.5 text-xs text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
            {rateLimitWarning}
          </div>
        )}
        {error && (
          <div
            className="mb-2 rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}
        <div className="flex items-end gap-2">
          {/* Attachment button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 flex-shrink-0 rounded-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={selectedFiles.length >= MAX_FILES_PER_MESSAGE}
            aria-label={t("attachFiles")}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
              />
            </svg>
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={FILE_INPUT_ACCEPT}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={t("typeMessage")}
            className="max-h-40 min-h-[40px] flex-1 resize-none rounded-xl border bg-muted/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            rows={1}
            maxLength={5000}
            aria-label="Message input"
            autoFocus
          />
          <Button
            onClick={handleSend}
            disabled={!canSend}
            size="icon"
            className="h-10 w-10 flex-shrink-0 rounded-full"
            aria-label={t("sendMessage")}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
              />
            </svg>
          </Button>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {t("enterToSend")}
        </p>
      </div>
    </div>
  );
}

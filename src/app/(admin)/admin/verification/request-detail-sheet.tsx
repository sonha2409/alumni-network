"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { VerificationRequestWithUser, VerificationDocument } from "@/lib/types";
import { approveRequest, rejectRequest, getRequestDocuments } from "./actions";

interface RequestDetailSheetProps {
  request: VerificationRequestWithUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionComplete: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function RequestDetailSheet({
  request,
  open,
  onOpenChange,
  onActionComplete,
}: RequestDetailSheetProps) {
  const t = useTranslations("admin.verification");
  const tCommon = useTranslations("common");
  const [rejectMessage, setRejectMessage] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [documents, setDocuments] = useState<(VerificationDocument & { signed_url: string })[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Fetch documents when the sheet opens with a request
  useEffect(() => {
    if (!open || !request) {
      setDocuments([]);
      return;
    }

    if (request.document_count === 0) {
      setDocuments([]);
      return;
    }

    setIsLoadingDocs(true);
    getRequestDocuments(request.id).then((result) => {
      setIsLoadingDocs(false);
      if (result.success) {
        setDocuments(result.data);
      }
    });
  }, [open, request]);

  if (!request) return null;

  async function handleApprove() {
    if (!request) return;
    setIsApproving(true);
    const result = await approveRequest(request.id);
    setIsApproving(false);

    if (result.success) {
      toast.success(t("verifiedToast", { name: request.user_full_name }));
      onOpenChange(false);
      onActionComplete();
    } else {
      toast.error(result.error);
    }
  }

  async function handleReject() {
    if (!request) return;
    setIsRejecting(true);
    const result = await rejectRequest(request.id, rejectMessage);
    setIsRejecting(false);

    if (result.success) {
      toast.success(t("rejectedToast", { name: request.user_full_name }));
      setRejectMessage("");
      setShowRejectForm(false);
      onOpenChange(false);
      onActionComplete();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("requestDetail")}</SheetTitle>
          <SheetDescription>
            {t("requestDetailDesc")}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4 px-4">
          <div className="flex items-center gap-3">
            {request.user_photo_url ? (
              <Image
                src={request.user_photo_url}
                alt={request.user_full_name}
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-medium">
                {request.user_full_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-medium">{request.user_full_name}</p>
              <p className="text-sm text-muted-foreground">{request.user_email}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("gradYearLabel")}</p>
              <p>{request.graduation_year}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("programLabel")}</p>
              <p>{request.specialization_name}</p>
            </div>
            {request.student_id && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("studentIdLabel")}</p>
                <p>{request.student_id}</p>
              </div>
            )}
            {request.supporting_info && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("additionalInfoLabel")}</p>
                <p className="whitespace-pre-wrap">{request.supporting_info}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("submittedLabel")}</p>
              <p>{new Date(request.created_at).toISOString().slice(0, 10)}</p>
            </div>
          </div>

          {/* Documents section */}
          {(request.document_count > 0 || isLoadingDocs) && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {t("docsLabel", { count: request.document_count })}
                </p>
                {isLoadingDocs ? (
                  <p className="text-sm text-muted-foreground">{t("loadingDocs")}</p>
                ) : (
                  <ul className="space-y-2">
                    {documents.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-muted-foreground font-medium">
                            {doc.content_type === "application/pdf" ? "PDF" : "IMG"}
                          </span>
                          <span className="truncate">{doc.file_name}</span>
                          <span className="text-muted-foreground whitespace-nowrap">
                            ({formatFileSize(doc.file_size)})
                          </span>
                        </div>
                        {doc.signed_url && (
                          <a
                            href={doc.signed_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 whitespace-nowrap text-sm font-medium text-primary hover:underline"
                          >
                            {tCommon("view")}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          <Separator />

          {!showRejectForm ? (
            <div className="flex gap-3">
              <Button
                onClick={handleApprove}
                disabled={isApproving}
                className="flex-1"
              >
                {isApproving ? t("approving") : t("approve")}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(true)}
                className="flex-1"
              >
                {t("rejectLabel")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="reject_message">{t("rejectionReason")}</Label>
                <Textarea
                  id="reject_message"
                  value={rejectMessage}
                  onChange={(e) => setRejectMessage(e.target.value)}
                  placeholder={t("rejectionPlaceholder")}
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isRejecting}
                  className="flex-1"
                >
                  {isRejecting ? t("rejecting") : t("confirmReject")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectMessage("");
                  }}
                  className="flex-1"
                >
                  {tCommon("cancel")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

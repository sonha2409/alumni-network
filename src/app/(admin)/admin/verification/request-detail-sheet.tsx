"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

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
      toast.success(`${request.user_full_name} has been verified.`);
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
      toast.success(`Request from ${request.user_full_name} has been rejected.`);
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
          <SheetTitle>Verification Request</SheetTitle>
          <SheetDescription>
            Review the details below and approve or reject this request.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4 px-4">
          <div className="flex items-center gap-3">
            {request.user_photo_url ? (
              <img
                src={request.user_photo_url}
                alt={request.user_full_name}
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
              <p className="text-sm font-medium text-muted-foreground">Graduation Year</p>
              <p>{request.graduation_year}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Program/Class</p>
              <p>{request.specialization_name}</p>
            </div>
            {request.student_id && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Student ID</p>
                <p>{request.student_id}</p>
              </div>
            )}
            {request.supporting_info && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Additional Information</p>
                <p className="whitespace-pre-wrap">{request.supporting_info}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Submitted</p>
              <p>{new Date(request.created_at).toISOString().slice(0, 10)}</p>
            </div>
          </div>

          {/* Documents section */}
          {(request.document_count > 0 || isLoadingDocs) && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Supporting Documents ({request.document_count})
                </p>
                {isLoadingDocs ? (
                  <p className="text-sm text-muted-foreground">Loading documents...</p>
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
                            View
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
                {isApproving ? "Approving..." : "Approve"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(true)}
                className="flex-1"
              >
                Reject
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="reject_message">Rejection Reason (optional)</Label>
                <Textarea
                  id="reject_message"
                  value={rejectMessage}
                  onChange={(e) => setRejectMessage(e.target.value)}
                  placeholder="Provide a reason for the rejection..."
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
                  {isRejecting ? "Rejecting..." : "Confirm Reject"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectMessage("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

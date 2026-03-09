"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { VerificationRequestWithUser } from "@/lib/types";
import { RequestDetailSheet } from "./request-detail-sheet";
import { bulkApproveRequests } from "./actions";

interface VerificationQueueProps {
  requests: VerificationRequestWithUser[];
}

export function VerificationQueue({ requests }: VerificationQueueProps) {
  const router = useRouter();
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequestWithUser | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === requests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(requests.map((r) => r.id)));
    }
  }

  async function handleBulkApprove() {
    if (selectedIds.size === 0) return;
    setIsBulkApproving(true);
    const result = await bulkApproveRequests(Array.from(selectedIds));
    setIsBulkApproving(false);

    if (result.success) {
      toast.success(
        `Approved ${result.data.approved} request${result.data.approved !== 1 ? "s" : ""}${
          result.data.failed > 0 ? `. ${result.data.failed} failed.` : "."
        }`
      );
      setSelectedIds(new Set());
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function handleActionComplete() {
    router.refresh();
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verification Queue</CardTitle>
          <CardDescription>No pending verification requests.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Verification Queue</CardTitle>
              <CardDescription>
                {requests.length} pending request{requests.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            {selectedIds.size > 0 && (
              <Button onClick={handleBulkApprove} disabled={isBulkApproving}>
                {isBulkApproving
                  ? "Approving..."
                  : `Approve Selected (${selectedIds.size})`}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Table header */}
          <div className="hidden sm:grid sm:grid-cols-[auto_1fr_1fr_1fr_auto_1fr_auto] sm:gap-4 sm:border-b sm:pb-3 sm:text-sm sm:font-medium sm:text-muted-foreground">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedIds.size === requests.length}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300"
                aria-label="Select all"
              />
            </div>
            <div>Name</div>
            <div>Program/Class</div>
            <div>Grad Year</div>
            <div>Docs</div>
            <div>Submitted</div>
            <div>Action</div>
          </div>

          {/* Table rows */}
          <div className="divide-y">
            {requests.map((request) => (
              <div
                key={request.id}
                className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[auto_1fr_1fr_1fr_auto_1fr_auto] sm:items-center sm:gap-4"
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(request.id)}
                    onChange={() => toggleSelect(request.id)}
                    className="h-4 w-4 rounded border-gray-300"
                    aria-label={`Select ${request.user_full_name}`}
                  />
                </div>

                <div className="flex items-center gap-2">
                  {request.user_photo_url ? (
                    <img
                      src={request.user_photo_url}
                      alt={request.user_full_name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {request.user_full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-sm">{request.user_full_name}</p>
                    <p className="text-xs text-muted-foreground">{request.user_email}</p>
                  </div>
                </div>

                <div className="text-sm">
                  <span className="sm:hidden text-muted-foreground">Program: </span>
                  {request.specialization_name}
                </div>

                <div className="text-sm">
                  <span className="sm:hidden text-muted-foreground">Grad Year: </span>
                  {request.graduation_year}
                </div>

                <div className="text-sm text-muted-foreground">
                  <span className="sm:hidden">Docs: </span>
                  {request.document_count > 0 ? `${request.document_count} file${request.document_count !== 1 ? "s" : ""}` : "—"}
                </div>

                <div className="text-sm text-muted-foreground">
                  {new Date(request.created_at).toISOString().slice(0, 10)}
                </div>

                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRequest(request);
                      setSheetOpen(true);
                    }}
                  >
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <RequestDetailSheet
        request={selectedRequest}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onActionComplete={handleActionComplete}
      />
    </>
  );
}

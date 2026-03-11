"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BulkInviteRow } from "@/lib/types";
import { processBulkInviteCSV, getInviteHistory, resendInvite } from "./actions";

// =============================================================================
// Status badge
// =============================================================================

function InviteStatusBadge({ status }: { status: BulkInviteRow["status"] }) {
  switch (status) {
    case "invited":
      return (
        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          Invited
        </span>
      );
    case "signed_up":
      return (
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          Signed Up
        </span>
      );
    case "verified":
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Verified
        </span>
      );
  }
}

// =============================================================================
// CSV Preview Row type
// =============================================================================

interface PreviewRow {
  email: string;
  name: string;
  graduation_year: string;
  errors: string[];
}

// =============================================================================
// Main client component
// =============================================================================

export function BulkInviteClient() {
  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History state
  const [invites, setInvites] = useState<BulkInviteRow[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Fetch invite history
  const fetchHistory = useCallback(async (page: number) => {
    setIsLoadingHistory(true);
    const result = await getInviteHistory(page);
    if (result.success) {
      setInvites(result.data.invites);
      setTotalPages(result.data.totalPages);
      setTotalCount(result.data.totalCount);
      setHistoryPage(result.data.page);
    } else {
      toast.error(result.error);
    }
    setIsLoadingHistory(false);
  }, []);

  useEffect(() => {
    fetchHistory(1);
  }, [fetchHistory]);

  // Parse CSV for preview
  function parseCSVPreview(text: string): PreviewRow[] {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
    const emailIdx = headers.indexOf("email");
    const nameIdx = headers.indexOf("name");
    const yearIdx = headers.indexOf("graduation_year");

    if (emailIdx === -1) return [];

    const rows: PreviewRow[] = [];
    const currentYear = new Date().getFullYear();

    for (let i = 1; i < lines.length && i <= 50; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
      const email = values[emailIdx] ?? "";
      const name = nameIdx >= 0 ? (values[nameIdx] ?? "") : "";
      const yearStr = yearIdx >= 0 ? (values[yearIdx] ?? "") : "";
      const errors: string[] = [];

      // Basic email validation
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push("Invalid email");
      }

      // Graduation year validation
      if (yearStr) {
        const year = parseInt(yearStr, 10);
        if (isNaN(year) || year < 1999 || year > currentYear + 3) {
          errors.push(`Invalid graduation year`);
        }
      }

      rows.push({ email, name, graduation_year: yearStr, errors });
    }

    return rows;
  }

  // Handle file selection
  function handleFileSelect(selectedFile: File | null) {
    if (!selectedFile) {
      setFile(null);
      setPreview([]);
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please select a .csv file.");
      return;
    }

    if (selectedFile.size > 2 * 1024 * 1024) {
      toast.error("File must be under 2MB.");
      return;
    }

    setFile(selectedFile);

    // Parse preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSVPreview(text);
      if (rows.length === 0) {
        toast.error("Could not parse CSV. Ensure it has an 'email' column header.");
        setFile(null);
        setPreview([]);
        return;
      }
      setPreview(rows);
    };
    reader.readAsText(selectedFile);
  }

  // Drag-and-drop handlers
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }

  // Submit
  async function handleSubmit() {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("csv", file);

    const result = await processBulkInviteCSV(formData);

    if (result.success) {
      const { sent, skipped, errors } = result.data;
      if (sent > 0) {
        toast.success(`${sent} invite${sent !== 1 ? "s" : ""} sent successfully.`);
      }
      if (skipped > 0) {
        toast.info(`${skipped} email${skipped !== 1 ? "s" : ""} skipped (already invited or registered).`);
      }
      if (errors.length > 0) {
        errors.slice(0, 5).forEach((err) => toast.warning(err));
      }

      // Reset upload state
      setFile(null);
      setPreview([]);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh history
      fetchHistory(1);
    } else {
      toast.error(result.error);
      if (result.fieldErrors?.csv) {
        result.fieldErrors.csv.forEach((err) => toast.warning(err));
      }
    }

    setIsUploading(false);
  }

  // Resend invite
  async function handleResend(inviteId: string) {
    setResendingId(inviteId);
    const result = await resendInvite(inviteId);
    if (result.success) {
      toast.success("Invite email resent.");
    } else {
      toast.error(result.error);
    }
    setResendingId(null);
  }

  // Clear file
  function handleClear() {
    setFile(null);
    setPreview([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const validPreviewCount = preview.filter((r) => r.errors.length === 0).length;
  const errorPreviewCount = preview.filter((r) => r.errors.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Format hint */}
          <div className="mb-4 rounded-md bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">
              CSV format: <code className="rounded bg-muted px-1 text-xs">email,name,graduation_year</code>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Only <code className="rounded bg-muted px-1">email</code> is required.{" "}
              <code className="rounded bg-muted px-1">name</code> and{" "}
              <code className="rounded bg-muted px-1">graduation_year</code> are optional. Max 500 rows.
            </p>
          </div>

          {/* Drop zone */}
          {!file && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              aria-label="Upload CSV file"
            >
              <svg
                className="mb-3 h-10 w-10 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              <p className="text-sm font-medium">
                Drop your CSV file here, or click to browse
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                .csv files up to 2MB
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            aria-label="Select CSV file"
          />

          {/* Preview */}
          {file && preview.length > 0 && (
            <div className="mt-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium">{file.name}</p>
                  <span className="text-xs text-muted-foreground">
                    {preview.length} row{preview.length !== 1 ? "s" : ""} parsed
                    {preview.length === 50 && " (showing first 50)"}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 text-xs">
                  Clear
                </Button>
              </div>

              {/* Summary */}
              <div className="mb-3 flex gap-4 text-sm">
                <span className="text-green-600 dark:text-green-400">
                  {validPreviewCount} valid
                </span>
                {errorPreviewCount > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    {errorPreviewCount} with errors
                  </span>
                )}
              </div>

              {/* Preview table */}
              <div className="max-h-64 overflow-auto rounded-md border">
                <div className="min-w-full">
                  {/* Header */}
                  <div className="sticky top-0 grid grid-cols-[1fr_1fr_auto_auto] gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span>Email</span>
                    <span>Name</span>
                    <span>Year</span>
                    <span>Status</span>
                  </div>
                  {/* Rows */}
                  {preview.map((row, idx) => (
                    <div
                      key={idx}
                      className={`grid grid-cols-[1fr_1fr_auto_auto] gap-2 border-b px-3 py-2 text-sm last:border-b-0 ${
                        row.errors.length > 0 ? "bg-red-50 dark:bg-red-950/20" : ""
                      }`}
                    >
                      <span className="truncate">{row.email}</span>
                      <span className="truncate text-muted-foreground">
                        {row.name || "—"}
                      </span>
                      <span className="min-w-[3rem] text-muted-foreground">
                        {row.graduation_year || "—"}
                      </span>
                      <span className="min-w-[5rem]">
                        {row.errors.length > 0 ? (
                          <span className="text-xs text-red-600 dark:text-red-400">
                            {row.errors.join(", ")}
                          </span>
                        ) : (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            Valid
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="mt-4 flex items-center gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={isUploading || validPreviewCount === 0}
                >
                  {isUploading
                    ? "Sending Invites..."
                    : `Send ${validPreviewCount} Invite${validPreviewCount !== 1 ? "s" : ""}`}
                </Button>
                {errorPreviewCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Rows with errors will be skipped.
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Invite History</span>
            {totalCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {totalCount} invite{totalCount !== 1 ? "s" : ""}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : invites.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No invites sent yet. Upload a CSV above to get started.
            </p>
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>Email</span>
                <span>Name</span>
                <span className="min-w-[3rem]">Year</span>
                <span className="min-w-[5rem]">Status</span>
                <span className="min-w-[4.5rem]">Actions</span>
              </div>

              {/* Rows */}
              <div className="divide-y">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="grid grid-cols-[1fr_1fr_auto_auto_auto] items-center gap-2 px-3 py-2 text-sm"
                  >
                    <span className="truncate">{invite.email}</span>
                    <span className="truncate text-muted-foreground">
                      {invite.name || "—"}
                    </span>
                    <span className="min-w-[3rem] text-muted-foreground">
                      {invite.graduation_year || "—"}
                    </span>
                    <span className="min-w-[5rem]">
                      <InviteStatusBadge status={invite.status} />
                    </span>
                    <span className="min-w-[4.5rem]">
                      {invite.status === "invited" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={resendingId === invite.id}
                          onClick={() => handleResend(invite.id)}
                        >
                          {resendingId === invite.id ? "Sending..." : "Resend"}
                        </Button>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={historyPage <= 1}
                    onClick={() => fetchHistory(historyPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {historyPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={historyPage >= totalPages}
                    onClick={() => fetchHistory(historyPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

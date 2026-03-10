"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminUserRow, AdminUserFilters } from "@/lib/types";
import { getAdminUsers } from "./actions";
import { UserDetailSheet } from "./user-detail-sheet";

interface UserManagementClientProps {
  currentAdminId: string;
}

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "user", label: "User" },
  { value: "moderator", label: "Moderator" },
  { value: "admin", label: "Admin" },
] as const;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "unverified", label: "Unverified" },
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
] as const;

const ACTIVE_OPTIONS = [
  { value: "", label: "All" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive/Banned" },
] as const;

function RoleBadge({ role }: { role: AdminUserRow["role"] }) {
  const styles: Record<string, string> = {
    admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    moderator: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    user: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[role]}`}>
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: AdminUserRow["verification_status"] }) {
  const styles: Record<string, string> = {
    verified: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    unverified: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

function ActiveIndicator({ isActive, suspendedUntil }: { isActive: boolean; suspendedUntil: string | null }) {
  if (!isActive) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Banned
      </span>
    );
  }

  if (suspendedUntil && new Date(suspendedUntil) > new Date()) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
        <span className="h-2 w-2 rounded-full bg-yellow-500" />
        Suspended
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
      <span className="h-2 w-2 rounded-full bg-green-500" />
      Active
    </span>
  );
}

export function UserManagementClient({ currentAdminId }: UserManagementClientProps) {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);

  // Sheet
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const filters: AdminUserFilters = { page, pageSize: 20 };
    if (search.trim()) filters.search = search.trim();
    if (roleFilter) filters.role = roleFilter as AdminUserFilters["role"];
    if (statusFilter) filters.verificationStatus = statusFilter as AdminUserFilters["verificationStatus"];
    if (activeFilter) filters.isActive = activeFilter === "true";

    const result = await getAdminUsers(filters);
    if (result.success) {
      setUsers(result.data.users);
      setTotalCount(result.data.totalCount);
      setTotalPages(result.data.totalPages);
    } else {
      toast.error(result.error);
    }
    setIsLoading(false);
  }, [search, roleFilter, statusFilter, activeFilter, page]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Fetch on filter/page change (non-search)
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, statusFilter, activeFilter, page]);

  function handleFilterChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(1);
    };
  }

  function handleActionComplete() {
    fetchUsers();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Users</span>
            <span className="text-sm font-normal text-muted-foreground">
              {totalCount} total
            </span>
          </CardTitle>

          {/* Filters */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              type="search"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
              aria-label="Search users"
            />
            <div className="flex flex-wrap gap-2">
              <select
                value={roleFilter}
                onChange={handleFilterChange(setRoleFilter)}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                aria-label="Filter by role"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={handleFilterChange(setStatusFilter)}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                aria-label="Filter by verification status"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={activeFilter}
                onChange={handleFilterChange(setActiveFilter)}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                aria-label="Filter by active status"
              >
                {ACTIVE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No users found matching your criteria.
            </p>
          ) : (
            <>
              {/* Table header */}
              <div className="hidden lg:grid lg:grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] lg:gap-4 lg:border-b lg:pb-3 lg:text-sm lg:font-medium lg:text-muted-foreground">
                <div>User</div>
                <div>Email</div>
                <div>Role</div>
                <div>Verification</div>
                <div>Status</div>
                <div>Joined</div>
                <div>Action</div>
              </div>

              {/* Table rows */}
              <div className="divide-y">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="grid grid-cols-1 gap-2 py-3 lg:grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] lg:items-center lg:gap-4"
                  >
                    {/* User info */}
                    <div className="flex items-center gap-2">
                      {user.photo_url ? (
                        <img
                          src={user.photo_url}
                          alt={user.full_name ?? ""}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                          {(user.full_name ?? user.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {user.full_name ?? "No profile"}
                        </p>
                        {user.graduation_year && (
                          <p className="text-xs text-muted-foreground">
                            Class of {user.graduation_year}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Email */}
                    <div className="min-w-0">
                      <p className="truncate text-sm text-muted-foreground">
                        <span className="lg:hidden font-medium text-foreground">Email: </span>
                        {user.email}
                      </p>
                    </div>

                    {/* Role */}
                    <div>
                      <span className="lg:hidden text-sm text-muted-foreground">Role: </span>
                      <RoleBadge role={user.role} />
                    </div>

                    {/* Verification */}
                    <div>
                      <span className="lg:hidden text-sm text-muted-foreground">Status: </span>
                      <StatusBadge status={user.verification_status} />
                    </div>

                    {/* Active status */}
                    <div>
                      <ActiveIndicator
                        isActive={user.is_active}
                        suspendedUntil={user.suspended_until}
                      />
                    </div>

                    {/* Joined date */}
                    <div className="text-sm text-muted-foreground">
                      <span className="lg:hidden font-medium text-foreground">Joined: </span>
                      {new Date(user.created_at).toISOString().slice(0, 10)}
                    </div>

                    {/* Action */}
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setSheetOpen(true);
                        }}
                      >
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <UserDetailSheet
        user={selectedUser}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onActionComplete={handleActionComplete}
        currentAdminId={currentAdminId}
      />
    </>
  );
}

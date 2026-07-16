import { useMemo, useState } from 'react';
import {
  useCreateUser,
  useResetPassword,
  useUpdateUser,
  useUsersQuery,
} from '../hooks/useUsers.js';
import { getCurrentUser } from '../api.ts';
import {
  UserFormModal,
  EditUserModal,
  ResetPasswordModal,
} from '../components/UserFormModal.jsx';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { KeyRound, Pencil, Plus, ShieldCheck } from 'lucide-react';

function userInitials(fullName) {
  if (!fullName) return '??';
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const second = parts[1]?.[0] || '';
  return (first + second).toUpperCase() || '??';
}

function roleBadge(role) {
  const name = typeof role === 'object' ? role?.name : role;
  if (name === 'super-admin') {
    return (
      <Badge className="border-chart-1/30 bg-chart-1/15 text-chart-1">Super Admin</Badge>
    );
  }
  return <Badge variant="secondary">Admin</Badge>;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function UsersPage({ showToast }) {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // user object
  const [resetTarget, setResetTarget] = useState(null); // { id, fullName }

  const { data, isLoading, isFetching } = useUsersQuery({
    page: 1,
    limit: 100,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  });
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const resetMutation = useResetPassword();

  const users = data?.users || [];

  // Identify the caller within the list (backend only hands us an email locally),
  // to mirror the server's authorization split in the UI.
  const myEmail = getCurrentUser().email.toLowerCase();
  const me = users.find((u) => (u.email || '').toLowerCase() === myEmail);
  const isSuperAdmin = (typeof me?.role === 'object' ? me?.role?.name : me?.role) === 'super-admin';
  const canEditRow = (user) => isSuperAdmin || user.id === me?.id;

  /* Client-side filtering (backend returns all admins in one call) */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q),
    );
  }, [users, search]);

  function handleCreate(payload) {
    createMutation.mutate(payload, {
      onSuccess: () => setCreateOpen(false),
    });
  }

  function handleUpdate(payload) {
    if (!editTarget) return;
    updateMutation.mutate(
      { id: editTarget.id, payload },
      { onSuccess: () => setEditTarget(null) },
    );
  }

  function handleResetPassword(newPassword) {
    if (!resetTarget) return;
    resetMutation.mutate(
      { id: resetTarget.id, newPassword },
      { onSuccess: () => setResetTarget(null) },
    );
  }

  return (
    <>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ShieldCheck className="h-6 w-6" />
            Admin Users
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {users.length} admin{users.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Admin
          </Button>
        )}
      </div>

      {/* ── Table Card ────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          {/* Search */}
          <div className="mb-4">
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : filtered.length === 0
                    ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="py-12 text-center text-muted-foreground"
                          >
                            {search.trim()
                              ? 'No admins match your search.'
                              : 'No admin users yet. Click "Add Admin" to create one.'}
                          </TableCell>
                        </TableRow>
                      )
                    : filtered.map((user) => (
                        <TableRow key={user.id} className={isFetching ? 'opacity-60' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-gradient-to-br from-[#b07cff] to-[#5b9dff] text-xs text-white">
                                  {userInitials(user.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{user.fullName || '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{user.email}</TableCell>
                          <TableCell>{roleBadge(user.role)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(user.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {canEditRow(user) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditTarget(user)}
                                >
                                  <Pencil className="mr-1.5 h-4 w-4" />
                                  Edit
                                </Button>
                              )}
                              {isSuperAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setResetTarget({ id: user.id, fullName: user.fullName })
                                  }
                                >
                                  <KeyRound className="mr-1.5 h-4 w-4" />
                                  Reset Password
                                </Button>
                              )}
                              {!canEditRow(user) && !isSuperAdmin && (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <UserFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleCreate}
        saving={createMutation.isPending}
      />

      <EditUserModal
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        user={editTarget}
        canEditAll={isSuperAdmin}
        onSave={handleUpdate}
        saving={updateMutation.isPending}
      />

      <ResetPasswordModal
        open={Boolean(resetTarget)}
        onOpenChange={(open) => {
          if (!open) setResetTarget(null);
        }}
        userName={resetTarget?.fullName || ''}
        onReset={handleResetPassword}
        resetting={resetMutation.isPending}
      />
    </>
  );
}

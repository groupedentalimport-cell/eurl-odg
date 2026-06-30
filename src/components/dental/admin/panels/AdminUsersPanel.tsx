"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  UserCog,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useTranslation } from "@/lib/i18n";
import { useAdminSession, type AdminRole } from "@/hooks/useAdminSession";

// ============================================================
// AdminUsersPanel — super_admin only (UI gating via can(user.role, "admin.users")).
// Backend re-validates via requireRole(request, []) in the API route.
// ============================================================

interface AdminUserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AdminRole;
  active: boolean | null;
  created_at?: string;
}

interface UserForm {
  id?: string;
  email: string;
  full_name: string;
  role: AdminRole;
  active: boolean;
  password: string; // empty = no change (edit), required (create)
}

const EMPTY_FORM: UserForm = {
  email: "",
  full_name: "",
  role: "commercial",
  active: true,
  password: "",
};

const ROLES: AdminRole[] = [
  "super_admin",
  "manager",
  "commercial",
  "technician",
  "editor",
  "accountant",
];

// Role badge classes (color-coded per spec).
function roleBadgeClass(role: AdminRole): string {
  switch (role) {
    case "super_admin":
      return "border-transparent bg-red-100 text-red-800";
    case "manager":
      return "border-transparent bg-blue-100 text-blue-800";
    case "commercial":
      return "border-transparent bg-teal-100 text-teal-800";
    case "technician":
      return "border-transparent bg-amber-100 text-amber-800";
    case "editor":
      return "border-transparent bg-slate-200 text-slate-800";
    case "accountant":
      return "border-transparent bg-emerald-100 text-emerald-800";
    default:
      return "border-transparent bg-slate-100 text-slate-700";
  }
}

function roleLabel(role: AdminRole, t: (k: any) => string): string {
  const map: Record<AdminRole, string> = {
    super_admin: t("roleSuperAdmin"),
    manager: t("roleManager"),
    commercial: t("roleCommercial"),
    technician: t("roleTechnician"),
    editor: t("roleEditor"),
    accountant: t("roleAccountant"),
  };
  return map[role] || role;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function AdminUsersPanel() {
  const { t } = useTranslation();
  const { user: currentUser } = useAdminSession();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setTableMissing(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/admin-users", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        if (data?.tableMissing) setTableMissing(true);
        setError(data?.error || `HTTP ${res.status}`);
        setUsers([]);
      } else {
        setUsers(Array.isArray(data.users) ? data.users : []);
      }
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (u: AdminUserRow) => {
    setForm({
      id: u.id,
      email: u.email || "",
      full_name: u.full_name || "",
      role: u.role,
      active: u.active !== false,
      password: "",
    });
    setDialogOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const isCreate = !form.id;
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Email invalide.");
      return;
    }
    if (isCreate && (!form.password || form.password.length < 6)) {
      toast.error(t("passwordRequired"));
      return;
    }
    if (form.password && form.password.length < 6) {
      toast.error("Mot de passe trop court (6 caractères minimum).");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        role: form.role,
        active: form.active,
      };
      if (form.password) body.password = form.password;
      if (form.id) body.id = form.id;

      const res = await fetch("/api/admin/admin-users", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }

      // Merge into local state.
      const saved: AdminUserRow = data.user;
      setUsers((prev) => {
        const idx = prev.findIndex((u) => u.id === saved.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [saved, ...prev];
      });
      setDialogOpen(false);
      toast.success(t("saved"));
    } catch (e: any) {
      toast.error(e?.message || t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u: AdminUserRow) => {
    if (currentUser && u.id === currentUser.id) {
      toast.error(t("cannotDeleteSelf"));
      return;
    }
    if (!window.confirm(t("confirmDelete"))) return;
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/admin-users?id=${encodeURIComponent(u.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || `HTTP ${res.status}`);
        return;
      }
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast.success(t("saved"));
    } catch (e: any) {
      toast.error(e?.message || t("saveFailed"));
    } finally {
      setBusyId(null);
    }
  };

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex animate-pulse gap-4">
                <div className="h-4 w-40 rounded bg-slate-200" />
                <div className="h-4 w-32 rounded bg-slate-100" />
                <div className="h-4 w-20 rounded bg-slate-100" />
                <div className="h-4 w-16 rounded bg-slate-100" />
              </div>
            </CardContent>
          </Card>
        ))}
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t("loading")}</span>
        </div>
      </div>
    );
  }

  if (tableMissing) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-900">{t("tableMissingNotice")}</p>
            <Button size="sm" variant="outline" onClick={refresh} className="mt-2">
              {t("retry")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-red-900">{error}</p>
            <Button size="sm" variant="outline" onClick={refresh} className="mt-2">
              {t("retry")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <UserCog className="h-5 w-5 text-brand-700" />
            {t("adminUsersPanel")}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">{t("adminUsersDesc")}</p>
        </div>
        <Button onClick={openCreate} size="sm" className="bg-brand-700 hover:bg-brand-800">
          <Plus className="h-4 w-4" />
          {t("newUser")}
        </Button>
      </div>

      {/* Empty state */}
      {users.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <UserCog className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">{t("noAdminUsers")}</p>
            <Button onClick={openCreate} size="sm" variant="outline">
              <Plus className="h-4 w-4" />
              {t("newUser")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-slate-200">
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("email")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("fullName")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("role")}</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">{t("active")}</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">{t("edit")}/{t("delete")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isSelf = !!currentUser && u.id === currentUser.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{u.email || "—"}</span>
                          {isSelf && (
                            <Badge variant="outline" className="border-brand-300 text-brand-700">
                              vous
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{u.full_name || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge className={roleBadgeClass(u.role)}>{roleLabel(u.role, t)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {u.active !== false ? (
                          <Badge variant="success" className="gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            {t("active")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <ShieldX className="h-3 w-3" />
                            {t("inactive")}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEdit(u)}
                            aria-label={t("edit")}
                            title={t("edit")}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => remove(u)}
                            disabled={busyId === u.id || isSelf}
                            aria-label={t("delete")}
                            title={isSelf ? t("cannotDeleteSelf") : t("delete")}
                          >
                            {busyId === u.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-slate-100 md:hidden">
            {users.map((u) => {
              const isSelf = !!currentUser && u.id === currentUser.id;
              return (
                <div key={u.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-slate-900">{u.email || "—"}</p>
                        {isSelf && (
                          <Badge variant="outline" className="border-brand-300 text-brand-700">
                            vous
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{u.full_name || "—"}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEdit(u)}
                        aria-label={t("edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-600 hover:bg-red-50"
                        onClick={() => remove(u)}
                        disabled={busyId === u.id || isSelf}
                        aria-label={t("delete")}
                      >
                        {busyId === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge className={roleBadgeClass(u.role)}>{roleLabel(u.role, t)}</Badge>
                    {u.active !== false ? (
                      <Badge variant="success">{t("active")}</Badge>
                    ) : (
                      <Badge variant="secondary">{t("inactive")}</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? t("editUser") : t("newUser")}</DialogTitle>
            <DialogDescription>
              {form.id ? t("editUser") : t("newUser")} — {t("adminUsersDesc")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="au-email">{t("email")}</Label>
              <Input
                id="au-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="prenom.nom@odg.dz"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="au-fullname">{t("fullName")}</Label>
              <Input
                id="au-fullname"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Prénom NOM"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="au-role">{t("role")}</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as AdminRole })}
              >
                <SelectTrigger id="au-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="au-password">
                {form.id ? t("newPassword") : t("password")}
              </Label>
              <Input
                id="au-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={form.id ? "••••••••" : "Min. 6 caractères"}
                autoComplete="new-password"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              <span className="text-sm font-medium text-slate-700">{t("active")}</span>
            </label>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("sending")}
                  </>
                ) : (
                  t("save")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminUsersPanel;

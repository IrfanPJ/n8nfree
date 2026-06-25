"use client";

import { useState, useTransition, useEffect } from "react";
import { User, Bell, Palette, Building2, Save, Users, ShieldCheck, ChevronDown, Lock, Trash2, Scissors, Plus, Eye, EyeOff, KeyRound, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { updateTeamMember, updateUserPermissions, updateUserBranches, deleteTeamMember, resetMemberPassword } from "@/actions/users";
import { addTeamMemberAction, changePasswordAction } from "@/actions/auth";
import { createBranch, deactivateBranch } from "@/actions/branches";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { updateBusinessSettings, type BusinessSettings } from "@/actions/business-settings";
import { addFabricHistoryEntry, deleteFabricHistoryEntry, type FabricHistoryEntry, type FabricHistoryType } from "@/actions/fabric-history";
import type { StaffPosition, UserRole, Branch } from "@/types";
import { PAGE_PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const POSITION_LABELS: Record<StaffPosition, string> = {
  SALES_STAFF: "Sales Staff",
  PURCHASE_STAFF: "Purchase Staff",
  PRODUCTION_IN_CHARGE: "Production In Charge",
  MASTER: "Master (Cutting)",
  TAILOR: "Tailor (Stitching)",
  QUALITY_CHECK: "Quality Check",
  LOGISTICS_COORDINATOR: "Logistics Coordinator",
  LEAD_MANAGEMENT_STAFF: "Lead Management Staff",
};

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  STAFF: "Staff",
};

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

type TeamMember = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  position: string | null;
  isActive: boolean;
  pagePermissions?: string[] | null;
  branches?: string[] | null;
};

interface SettingsClientProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    branches?: string[];
  };
  teamMembers?: TeamMember[];
  businessSettings?: BusinessSettings;
  fabricHistory?: {
    codes: FabricHistoryEntry[];
    compositions: FabricHistoryEntry[];
    prices: FabricHistoryEntry[];
    colors: FabricHistoryEntry[];
  };
  branches?: Branch[];
}

function MemberPermissionsRow({ member, onUpdate }: {
  member: TeamMember;
  onUpdate: (id: string, perms: string[] | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // null means unrestricted (all checked)
  const current = member.pagePermissions;
  const allKeys = PAGE_PERMISSIONS.map((p) => p.key);
  const isUnrestricted = current === null || current === undefined;

  const isChecked = (key: string) => isUnrestricted || current!.includes(key);

  async function handleToggle(key: string) {
    setSaving(true);
    let next: string[] | null;
    if (isUnrestricted) {
      // Turn off one page → save all others
      next = allKeys.filter((k) => k !== key);
    } else {
      const had = current!.includes(key);
      const updated = had
        ? current!.filter((k) => k !== key)
        : [...current!, key];
      // If all pages checked, save null (unrestricted)
      next = updated.length === allKeys.length ? null : updated;
    }
    const result = await updateUserPermissions(member.id, next);
    if (result.success) {
      onUpdate(member.id, next);
      toast.success("Page access updated");
    } else {
      toast.error(result.error ?? "Failed to update permissions");
    }
    setSaving(false);
  }

  async function handleGrantAll() {
    setSaving(true);
    const result = await updateUserPermissions(member.id, null);
    if (result.success) { onUpdate(member.id, null); toast.success("Full access granted"); }
    else toast.error(result.error ?? "Failed");
    setSaving(false);
  }

  async function handleRevokeAll() {
    setSaving(true);
    const result = await updateUserPermissions(member.id, []);
    if (result.success) { onUpdate(member.id, []); toast.success("All access revoked"); }
    else toast.error(result.error ?? "Failed");
    setSaving(false);
  }

  const checkedCount = isUnrestricted ? allKeys.length : (current?.length ?? 0);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-secondary/20 hover:bg-secondary/40 transition-colors text-xs"
      >
        <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
        <span className="font-medium text-muted-foreground">Page Access</span>
        <span className={cn(
          "ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
          isUnrestricted ? "bg-green-500/15 text-green-400" : checkedCount === 0 ? "bg-red-500/15 text-red-400" : "bg-[#D4AF37]/15 text-[#D4AF37]"
        )}>
          {isUnrestricted ? "Full Access" : `${checkedCount}/${allKeys.length} pages`}
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 ml-auto text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="p-3 space-y-3 border-t border-border">
          <div className="flex items-center gap-2 pb-1">
            <button type="button" onClick={handleGrantAll} disabled={saving} className="text-[10px] text-green-400 hover:text-green-300 font-medium">
              Grant All
            </button>
            <span className="text-muted-foreground text-[10px]">·</span>
            <button type="button" onClick={handleRevokeAll} disabled={saving} className="text-[10px] text-red-400 hover:text-red-300 font-medium">
              Revoke All
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {PAGE_PERMISSIONS.map((page) => (
              <label key={page.key} className={cn("flex items-center gap-2 cursor-pointer select-none", saving && "opacity-50 pointer-events-none")}>
                <input
                  type="checkbox"
                  checked={isChecked(page.key)}
                  onChange={() => handleToggle(page.key)}
                  className="w-3.5 h-3.5 rounded accent-[#D4AF37]"
                />
                <span className="text-xs text-muted-foreground">{page.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


function MemberBranchesRow({ member, branches, editable, onUpdate }: {
  member: TeamMember;
  branches: Branch[];
  editable: boolean;
  onUpdate: (id: string, branchIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const current = member.branches ?? [];

  async function handleToggle(branchId: string) {
    const next = current.includes(branchId)
      ? current.filter((b) => b !== branchId)
      : [...current, branchId];
    if (next.length === 0) {
      toast.error("At least one branch must be assigned");
      return;
    }
    setSaving(true);
    const result = await updateUserBranches(member.id, next);
    if (result.success) {
      onUpdate(member.id, next);
      toast.success("Branch assignment updated");
    } else {
      toast.error(result.error ?? "Failed to update branches");
    }
    setSaving(false);
  }

  const names = current.map((id) => branches.find((b) => b.id === id)?.name ?? id);

  if (!editable) {
    return (
      <div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
        <MapPin className="w-3 h-3" />
        {names.length > 0 ? names.join(", ") : "No branch assigned"}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-secondary/20 hover:bg-secondary/40 transition-colors text-xs"
      >
        <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
        <span className="font-medium text-muted-foreground">Branches</span>
        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-[#D4AF37]/15 text-[#D4AF37]">
          {names.length > 0 ? names.join(", ") : "None"}
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 ml-auto text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className={cn("p-3 grid grid-cols-2 gap-2 border-t border-border", saving && "opacity-50 pointer-events-none")}>
          {branches.map((b) => (
            <label key={b.id} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={current.includes(b.id)}
                onChange={() => handleToggle(b.id)}
                className="w-3.5 h-3.5 rounded accent-[#D4AF37]"
              />
              <span className="text-xs text-muted-foreground">{b.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function BranchesTab({ initialBranches }: { initialBranches: Branch[] }) {
  const [branches, setBranches] = useState(initialBranches);

  // Sync local state whenever the server re-fetches.
  useEffect(() => {
    setBranches(initialBranches);
  }, [initialBranches]);

  const [form, setForm] = useState({ name: "", code: "", address: "" });
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    setSaving(true);
    const result = await createBranch({ name: form.name.trim(), code: form.code.trim(), address: form.address.trim() || undefined });
    setSaving(false);
    if (!result.success || !result.data) {
      toast.error(result.error ?? "Failed to create branch");
      return;
    }
    setBranches((prev) => [...prev, result.data!]);
    setForm({ name: "", code: "", address: "" });
    toast.success("Branch created");
  }

  async function handleDeactivate(id: string, name: string) {
    if (!confirm(`Deactivate "${name}"? Staff assigned only to this branch will lose access until reassigned.`)) return;
    const result = await deactivateBranch(id);
    if (result.success) {
      setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, isActive: false } : b)));
      toast.success("Branch deactivated");
    } else {
      toast.error(result.error ?? "Failed to deactivate branch");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="w-4 h-4 text-primary" />
          Branches
        </CardTitle>
        <CardDescription>Manage the physical branches your business operates. Visible only to Super Admins.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input placeholder="Branch name (e.g. Abu Dhabi)" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="h-9 text-sm" />
          <Input placeholder="Short code (e.g. AD)" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} className="h-9 text-sm" />
          <div className="flex gap-2">
            <Input placeholder="Address (optional)" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} className="h-9 text-sm" />
            <Button size="sm" className="h-9 px-3 flex-shrink-0" disabled={saving} onClick={handleAdd}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <Separator />
        <div className="space-y-2">
          {branches.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No branches yet</p>}
          {branches.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium">{b.name} <span className="text-xs text-muted-foreground">({b.code})</span></p>
                {b.address && <p className="text-xs text-muted-foreground">{b.address}</p>}
              </div>
              <div className="flex items-center gap-2">
                {!b.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                {b.isActive && b.id !== "business-bay" && (
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDeactivate(b.id, b.name)} className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const FABRIC_SECTIONS: { key: keyof NonNullable<SettingsClientProps["fabricHistory"]>; type: FabricHistoryType; label: string; placeholder: string }[] = [
  { key: "codes",        type: "code",        label: "Fabric Codes",        placeholder: "e.g. WL-001" },
  { key: "compositions", type: "composition", label: "Fabric Compositions", placeholder: "e.g. 100% Wool" },
  { key: "prices",       type: "price",       label: "Fabric Prices (AED)", placeholder: "e.g. 250" },
  { key: "colors",       type: "color",       label: "Fabric Colors",       placeholder: "e.g. Navy Blue" },
];

function FabricHistoryTab({ initialHistory }: { initialHistory?: SettingsClientProps["fabricHistory"] }) {
  const [history, setHistory] = useState<NonNullable<SettingsClientProps["fabricHistory"]>>(
    initialHistory ?? { codes: [], compositions: [], prices: [], colors: [] }
  );
  const [inputs, setInputs] = useState<Record<string, string>>({ code: "", composition: "", price: "", color: "" });
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const handleAdd = async (type: FabricHistoryType, key: string) => {
    const value = inputs[type]?.trim();
    if (!value) return;
    setSaving((p) => ({ ...p, [type]: true }));
    const entry = await addFabricHistoryEntry(type, value);
    if (entry) {
      setHistory((prev) => ({ ...prev, [key]: [entry, ...prev[key as keyof typeof prev]] }));
      setInputs((p) => ({ ...p, [type]: "" }));
    }
    setSaving((p) => ({ ...p, [type]: false }));
  };

  const handleDelete = async (type: FabricHistoryType, key: string, id: string) => {
    await deleteFabricHistoryEntry(id);
    setHistory((prev) => ({ ...prev, [key]: (prev[key as keyof typeof prev] as FabricHistoryEntry[]).filter((e) => e.id !== id) }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Scissors className="w-4 h-4 text-primary" />
          Fabric History
        </CardTitle>
        <CardDescription>Manage the dropdown suggestions shown in the order form. Add or delete entries freely.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {FABRIC_SECTIONS.map(({ key, type, label, placeholder }) => {
          const entries = history[key] as FabricHistoryEntry[];
          return (
            <div key={key}>
              <p className="text-sm font-semibold mb-2">{label}</p>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder={placeholder}
                  value={inputs[type] ?? ""}
                  onChange={(e) => setInputs((p) => ({ ...p, [type]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(type, key); } }}
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 flex-shrink-0"
                  disabled={saving[type] || !inputs[type]?.trim()}
                  onClick={() => handleAdd(type, key)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              </div>
              {entries.length === 0 ? (
                <p className="text-xs text-muted-foreground">No entries yet. Add one above.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {entries.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-1.5 bg-secondary/60 border border-border/40 rounded-full px-3 py-1 text-xs">
                      <span>{entry.value}</span>
                      <button
                        onClick={() => handleDelete(type, key, entry.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Separator className="mt-4" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ResetPasswordDialog({ memberId, memberName, open, onClose }: {
  memberId: string;
  memberName: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(v: boolean) {
    if (!v) { setPassword(""); setConfirm(""); setError(null); onClose(); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    setError(null);
    const result = await resetMemberPassword(memberId, password);
    setLoading(false);
    if (!result.success) { setError(result.error ?? "Failed to reset password"); return; }
    toast.success(`Password reset for ${memberName ?? "member"}`);
    setPassword(""); setConfirm("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset Password — {memberName ?? "Member"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="rp-password">New password</Label>
            <div className="relative">
              <Input
                id="rp-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="Min. 8 characters"
                className="pr-10"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rp-confirm">Confirm password</Label>
            <Input
              id="rp-confirm"
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(null); }}
              placeholder="Repeat password"
              required
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" variant="gold" loading={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddMemberDialog({ open, onClose, onAdded, branches, isSuperAdmin, ownBranches }: {
  open: boolean;
  onClose: () => void;
  onAdded: (member: TeamMember) => void;
  branches: Branch[];
  isSuperAdmin: boolean;
  ownBranches: string[];
}) {
  const assignableBranches = isSuperAdmin ? branches : branches.filter((b) => ownBranches.includes(b.id));
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STAFF" as UserRole, position: "", branchIds: [] as string[] });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  function toggleBranch(branchId: string) {
    setForm((prev) => ({
      ...prev,
      branchIds: prev.branchIds.includes(branchId)
        ? prev.branchIds.filter((b) => b !== branchId)
        : [...prev.branchIds, branchId],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.role !== "SUPER_ADMIN" && form.branchIds.length === 0) {
      setError("Select at least one branch");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await addTeamMemberAction({
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
      position: form.position || null,
      branchIds: form.branchIds,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Failed to add member");
      return;
    }
    toast.success(`${form.name} added to the team`);
    onAdded({
      id: crypto.randomUUID(),
      name: form.name,
      email: form.email,
      role: form.role,
      position: form.position || null,
      isActive: true,
      pagePermissions: null,
      branches: form.branchIds,
    });
    setForm({ name: "", email: "", password: "", role: "STAFF", position: "", branchIds: [] });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="am-name">Full name</Label>
            <Input id="am-name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Jane Smith" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="am-email">Email address</Label>
            <Input id="am-email" type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="jane@example.com" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="am-password">Temporary password</Label>
            <div className="relative">
              <Input
                id="am-password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="Min. 8 characters"
                className="pr-10"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => handleChange("role", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as UserRole[])
                    .filter((r) => r !== "SUPER_ADMIN" || isSuperAdmin)
                    .map((r) => (
                      <SelectItem key={r} value={r} className="text-sm">{ROLE_LABELS[r]}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Position</Label>
              <Select value={form.position || "NONE"} onValueChange={(v) => handleChange("position", v === "NONE" ? "" : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="No position" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE" className="text-sm text-muted-foreground">No position</SelectItem>
                  {(Object.keys(POSITION_LABELS) as StaffPosition[]).map((pos) => (
                    <SelectItem key={pos} value={pos} className="text-sm">{POSITION_LABELS[pos]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.role !== "SUPER_ADMIN" && (
            <div className="space-y-1.5">
              <Label>Branches</Label>
              <div className="grid grid-cols-2 gap-2 p-2 rounded-lg border border-border">
                {assignableBranches.length === 0 && (
                  <p className="text-xs text-muted-foreground col-span-2">No branches available</p>
                )}
                {assignableBranches.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.branchIds.includes(b.id)}
                      onChange={() => toggleBranch(b.id)}
                      className="w-3.5 h-3.5 rounded accent-[#D4AF37]"
                    />
                    <span className="text-xs text-muted-foreground">{b.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" variant="gold" loading={loading}>
              {loading ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TeamTab({ teamMembers, currentUserId, branches, isSuperAdmin, ownBranches }: {
  teamMembers: TeamMember[];
  currentUserId: string;
  branches: Branch[];
  isSuperAdmin: boolean;
  ownBranches: string[];
}) {
  const [members, setMembers] = useState(teamMembers);

  // Sync local state whenever the server re-fetches.
  useEffect(() => {
    setMembers(teamMembers);
  }, [teamMembers]);

  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string | null } | null>(null);

  function handleBranchesUpdate(memberId: string, branchIds: string[]) {
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, branches: branchIds } : m)));
  }

  function handlePositionChange(memberId: string, position: StaffPosition | "NONE") {
    const newPos = position === "NONE" ? null : position;
    startTransition(async () => {
      const result = await updateTeamMember(memberId, { position: newPos });
      if (result.success) {
        setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, position: newPos } : m)));
        toast.success("Position updated");
      } else {
        toast.error(result.error ?? "Failed to update position");
      }
    });
  }

  function handleRoleChange(memberId: string, role: UserRole) {
    startTransition(async () => {
      const result = await updateTeamMember(memberId, { role });
      if (result.success) {
        setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)));
        toast.success("Role updated");
      } else {
        toast.error(result.error ?? "Failed to update role");
      }
    });
  }

  function handlePermissionsUpdate(memberId: string, perms: string[] | null) {
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, pagePermissions: perms } : m)));
  }

  function handleDelete(memberId: string, memberName: string | null) {
    if (!confirm(`Remove ${memberName ?? "this member"} from the team? They will lose all access.`)) return;
    startTransition(async () => {
      const result = await deleteTeamMember(memberId);
      if (result.success) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        toast.success("Member removed");
      } else {
        toast.error(result.error ?? "Failed to remove member");
      }
    });
  }

  return (
    <>
    <AddMemberDialog
      open={addOpen}
      onClose={() => setAddOpen(false)}
      onAdded={(m) => setMembers((prev) => [...prev, m])}
      branches={branches}
      isSuperAdmin={isSuperAdmin}
      ownBranches={ownBranches}
    />
    {resetTarget && (
      <ResetPasswordDialog
        memberId={resetTarget.id}
        memberName={resetTarget.name}
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
      />
    )}
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4 text-primary" />
              Team Management
            </CardTitle>
            <CardDescription className="mt-1">
              Assign roles, positions and page access to your staff members
            </CardDescription>
          </div>
          <Button variant="gold" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Member
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No team members yet</p>
        )}
        {members.map((member) => {
          const isSelf = member.id === currentUserId;
          // Only a SUPER_ADMIN may view/edit another SUPER_ADMIN's role,
          // position, branches, password, or delete them — matches the
          // server-side check in actions/users.ts. Show read-only instead
          // of controls that would just fail with "Unauthorized".
          const isProtected = member.role === "SUPER_ADMIN" && !isSuperAdmin;
          return (
            <div key={member.id} className="space-y-2 p-3 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {getInitials(member.name ?? member.email ?? "U")}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>

                {isSelf ? (
                  <Badge variant="gold" className="text-xs shrink-0">You</Badge>
                ) : isProtected ? (
                  <Badge variant="outline" className="text-xs shrink-0 gap-1">
                    <Lock className="w-3 h-3" />
                    Super Admin
                  </Badge>
                ) : (
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Select
                      defaultValue={member.role as UserRole}
                      onValueChange={(v) => handleRoleChange(member.id, v as UserRole)}
                      disabled={pending}
                    >
                      <SelectTrigger className="h-8 w-[110px] text-xs">
                        <ShieldCheck className="w-3 h-3 mr-1 text-muted-foreground" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ROLE_LABELS) as UserRole[])
                          .filter((r) => r !== "SUPER_ADMIN" || isSuperAdmin)
                          .map((r) => (
                            <SelectItem key={r} value={r} className="text-xs">{ROLE_LABELS[r]}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    <Select
                      defaultValue={member.position ?? "NONE"}
                      onValueChange={(v) => handlePositionChange(member.id, v as StaffPosition | "NONE")}
                      disabled={pending}
                    >
                      <SelectTrigger className="h-8 w-[180px] text-xs">
                        <SelectValue placeholder="No position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE" className="text-xs text-muted-foreground">No position</SelectItem>
                        {(Object.keys(POSITION_LABELS) as StaffPosition[]).map((pos) => (
                          <SelectItem key={pos} value={pos} className="text-xs">{POSITION_LABELS[pos]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending}
                      onClick={() => setResetTarget({ id: member.id, name: member.name })}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                      title="Reset password"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending}
                      onClick={() => handleDelete(member.id, member.name)}
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {!isSelf && !isProtected && (
                <MemberBranchesRow
                  member={member}
                  branches={branches}
                  editable={isSuperAdmin}
                  onUpdate={handleBranchesUpdate}
                />
              )}

              {/* Page access — only for non-self, non-admin members */}
              {!isSelf && !ADMIN_ROLES.includes(member.role) && (
                <MemberPermissionsRow
                  member={member}
                  onUpdate={handlePermissionsUpdate}
                />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
    </>
  );
}

export function SettingsClient({ user, teamMembers = [], businessSettings, fabricHistory, branches = [] }: SettingsClientProps) {
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    appointments: true,
    payments: true,
    followUps: true,
    systemAlerts: false,
  });

  const [bizInfo, setBizInfo] = useState<BusinessSettings>({
    name: businessSettings?.name ?? "",
    gst: businessSettings?.gst ?? "",
    phone: businessSettings?.phone ?? "",
    email: businessSettings?.email ?? "",
    address: businessSettings?.address ?? "",
  });
  const [savingBiz, setSavingBiz] = useState(false);

  const isAdmin = ADMIN_ROLES.includes(user.role ?? "");
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const handleChangePassword = async () => {
    if (pwForm.next !== pwForm.confirm) { toast.error("New passwords do not match"); return; }
    if (pwForm.next.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    setPwLoading(true);
    const result = await changePasswordAction({ currentPassword: pwForm.current, newPassword: pwForm.next });
    setPwLoading(false);
    if (!result.success) { toast.error(result.error ?? "Failed to update password"); return; }
    toast.success("Password updated");
    setPwForm({ current: "", next: "", confirm: "" });
  };

  const handleSaveBiz = async () => {
    setSavingBiz(true);
    const result = await updateBusinessSettings(bizInfo);
    if (result.success) toast.success("Business info saved");
    else toast.error(result.error ?? "Failed to save");
    setSavingBiz(false);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and application preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-secondary">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="fabric">Fabric History</TabsTrigger>
          {isAdmin && <TabsTrigger value="team">Team</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="branches">Branches</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-4 h-4 text-primary" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.image ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                    {getInitials(user.name ?? user.email ?? "U")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user.name ?? "User"}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <Badge variant="gold" className="mt-1 text-xs">{user.role}</Badge>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input defaultValue={user.name ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input defaultValue={user.email ?? ""} type="email" />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Change Password</Label>
                <div className="grid grid-cols-1 gap-3">
                  <div className="relative">
                    <Input
                      type={showCurrentPw ? "text" : "password"}
                      placeholder="Current password"
                      value={pwForm.current}
                      onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showNewPw ? "text" : "password"}
                      placeholder="New password (min. 8 characters)"
                      value={pwForm.next}
                      onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  loading={pwLoading}
                  onClick={handleChangePassword}
                  disabled={!pwForm.current || !pwForm.next || !pwForm.confirm}
                >
                  <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                  {pwLoading ? "Updating..." : "Update Password"}
                </Button>
              </div>

              <Button variant="gold" onClick={() => toast.success("Saved")}>
                <Save className="w-4 h-4 mr-2" />
                Save Profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="w-4 h-4 text-primary" />
                Business Information
              </CardTitle>
              <CardDescription>
                Appears on invoices and printed documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Business Name</Label>
                  <Input
                    placeholder="e.g. House of Tailors"
                    value={bizInfo.name}
                    onChange={(e) => setBizInfo((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>TRN / GST Number</Label>
                  <Input
                    placeholder="e.g. 100123456789"
                    value={bizInfo.gst}
                    onChange={(e) => setBizInfo((p) => ({ ...p, gst: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    placeholder="+971 50 123 4567"
                    value={bizInfo.phone}
                    onChange={(e) => setBizInfo((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="info@yourbusiness.com"
                    value={bizInfo.email}
                    onChange={(e) => setBizInfo((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Textarea
                  placeholder="Shop address..."
                  rows={2}
                  value={bizInfo.address}
                  onChange={(e) => setBizInfo((p) => ({ ...p, address: e.target.value }))}
                  className="resize-none"
                />
              </div>
              <Button variant="gold" onClick={handleSaveBiz} disabled={savingBiz}>
                <Save className="w-4 h-4 mr-2" />
                {savingBiz ? "Saving…" : "Save Business Info"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="w-4 h-4 text-primary" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(notifications).map(([key, value]) => {
                const labels: Record<string, { title: string; desc: string }> = {
                  orderUpdates: { title: "Order Updates", desc: "Status changes and order progress" },
                  appointments: { title: "Appointments", desc: "Reminders for upcoming appointments" },
                  payments: { title: "Payment Alerts", desc: "Invoice payments and due reminders" },
                  followUps: { title: "Follow-up Reminders", desc: "Pending follow-up alerts" },
                  systemAlerts: { title: "System Alerts", desc: "System maintenance and updates" },
                };
                return (
                  <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">{labels[key].title}</p>
                      <p className="text-xs text-muted-foreground">{labels[key].desc}</p>
                    </div>
                    <Switch
                      checked={value}
                      onCheckedChange={(v) => setNotifications((prev) => ({ ...prev, [key]: v }))}
                    />
                  </div>
                );
              })}
              <Button variant="gold" onClick={() => toast.success("Saved")}>
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="w-4 h-4 text-primary" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">Theme</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTheme("dark")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      theme === "dark"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="w-full h-12 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] mb-2" />
                    <p className="text-sm font-medium">Dark Mode</p>
                    <p className="text-xs text-muted-foreground">Luxury black aesthetic</p>
                    {theme === "dark" && <Badge variant="gold" className="mt-1 text-[10px]">Active</Badge>}
                  </button>
                  <button
                    onClick={() => setTheme("light")}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      theme === "light"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="w-full h-12 rounded-lg bg-white border border-gray-200 mb-2" />
                    <p className="text-sm font-medium">Light Mode</p>
                    <p className="text-xs text-muted-foreground">Clean minimal look</p>
                    {theme === "light" && <Badge variant="gold" className="mt-1 text-[10px]">Active</Badge>}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fabric" className="mt-6">
          <FabricHistoryTab initialHistory={fabricHistory} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="team" className="mt-6">
            <TeamTab
              teamMembers={teamMembers}
              currentUserId={user.id}
              branches={branches}
              isSuperAdmin={isSuperAdmin}
              ownBranches={user.branches ?? []}
            />
          </TabsContent>
        )}

        {isSuperAdmin && (
          <TabsContent value="branches" className="mt-6">
            <BranchesTab initialBranches={branches} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

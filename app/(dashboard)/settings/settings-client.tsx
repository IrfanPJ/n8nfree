"use client";

import { useState, useTransition } from "react";
import { User, Bell, Palette, Building2, Save, Users, ShieldCheck } from "lucide-react";
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
import { updateTeamMember } from "@/actions/users";
import type { StaffPosition, UserRole } from "@/types";

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
  ADMIN: "Admin",
  MANAGER: "Manager",
  STAFF: "Staff",
};

type TeamMember = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  position: string | null;
  isActive: boolean;
};

interface SettingsClientProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
  teamMembers?: TeamMember[];
}

function TeamTab({ teamMembers, currentUserId }: { teamMembers: TeamMember[]; currentUserId: string }) {
  const [members, setMembers] = useState(teamMembers);
  const [pending, startTransition] = useTransition();

  function handlePositionChange(memberId: string, position: StaffPosition | "NONE") {
    const newPos = position === "NONE" ? null : position;
    startTransition(async () => {
      const result = await updateTeamMember(memberId, { position: newPos });
      if (result.success) {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, position: newPos } : m))
        );
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
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role } : m))
        );
        toast.success("Role updated");
      } else {
        toast.error(result.error ?? "Failed to update role");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-4 h-4 text-primary" />
          Team Management
        </CardTitle>
        <CardDescription>
          Assign positions and access roles to your staff members
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No team members yet</p>
        )}
        {members.map((member) => {
          const isSelf = member.id === currentUserId;
          return (
            <div
              key={member.id}
              className="flex items-center gap-4 p-3 rounded-lg border border-border"
            >
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
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  {/* Access role */}
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
                      {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                        <SelectItem key={r} value={r} className="text-xs">
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Position */}
                  <Select
                    defaultValue={member.position ?? "NONE"}
                    onValueChange={(v) => handlePositionChange(member.id, v as StaffPosition | "NONE")}
                    disabled={pending}
                  >
                    <SelectTrigger className="h-8 w-[200px] text-xs">
                      <SelectValue placeholder="No position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE" className="text-xs text-muted-foreground">
                        No position assigned
                      </SelectItem>
                      {(Object.keys(POSITION_LABELS) as StaffPosition[]).map((pos) => (
                        <SelectItem key={pos} value={pos} className="text-xs">
                          {POSITION_LABELS[pos]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function SettingsClient({ user, teamMembers = [] }: SettingsClientProps) {
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    appointments: true,
    payments: true,
    followUps: true,
    systemAlerts: false,
  });

  const [businessInfo] = useState({
    name: "House of Tailors",
    gst: "22AAAAA0000A1Z5",
    phone: "+91 98765 43210",
    email: "info@houseoftailors.com",
    address: "Shop No. 12, Fashion Street, Mumbai - 400001",
  });

  const isAdmin = user.role === "ADMIN";

  const handleSave = () => {
    toast.success("Settings saved successfully");
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
          {isAdmin && <TabsTrigger value="team">Team</TabsTrigger>}
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
                  <Input type="password" placeholder="Current password" />
                  <Input type="password" placeholder="New password" />
                  <Input type="password" placeholder="Confirm new password" />
                </div>
              </div>

              <Button variant="gold" onClick={handleSave}>
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
                This information appears on invoices and documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Business Name</Label>
                  <Input defaultValue={businessInfo.name} />
                </div>
                <div className="space-y-1.5">
                  <Label>GST Number</Label>
                  <Input defaultValue={businessInfo.gst} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input defaultValue={businessInfo.phone} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input defaultValue={businessInfo.email} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Textarea defaultValue={businessInfo.address} rows={2} />
              </div>
              <Button variant="gold" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Business Info
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
              <Button variant="gold" onClick={handleSave}>
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

        {isAdmin && (
          <TabsContent value="team" className="mt-6">
            <TeamTab teamMembers={teamMembers} currentUserId={user.id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

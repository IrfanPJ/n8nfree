"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Phone, Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteFollowUp, updateFollowUp } from "@/actions/followups";
import type { FollowUpWithRelations, PaginatedResult } from "@/types";
import { formatDate, PRIORITY_CONFIG } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { FollowUpForm } from "./followup-form";

interface FollowUpsClientProps {
  initialData: PaginatedResult<FollowUpWithRelations>;
}

const STATUS_ICONS = {
  PENDING: Clock,
  IN_PROGRESS: AlertCircle,
  COMPLETED: CheckCircle2,
  CANCELLED: AlertCircle,
};

const STATUS_STYLES = {
  PENDING: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  IN_PROGRESS: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  COMPLETED: "text-green-400 bg-green-400/10 border-green-400/20",
  CANCELLED: "text-gray-400 bg-gray-400/10 border-gray-400/20",
};

export function FollowUpsClient({ initialData }: FollowUpsClientProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [createOpen, setCreateOpen] = useState(false);
  const [editFollowUp, setEditFollowUp] = useState<FollowUpWithRelations | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this follow-up?")) return;
    const result = await deleteFollowUp(id);
    if (result.success) {
      toast.success("Follow-up deleted");
      setData((prev) => ({ ...prev, data: prev.data.filter((f) => f.id !== id) }));
    } else {
      toast.error(result.error);
    }
  };

  const handleStatusChange = async (id: string, status: string, original: FollowUpWithRelations) => {
    const result = await updateFollowUp(id, { ...original, status, customerId: original.customerId });
    if (result.success) {
      toast.success("Status updated");
      setData((prev) => ({
        ...prev,
        data: prev.data.map((f) => (f.id === id ? { ...f, status: status as FollowUpWithRelations["status"] } : f)),
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Follow-ups</h1>
          <p className="text-sm text-muted-foreground">{data.total} total follow-ups</p>
        </div>
        <Button variant="gold" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Follow-up
        </Button>
      </div>

      {data.data.length === 0 ? (
        <div className="text-center py-20">
          <Phone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No follow-ups found</p>
          <Button variant="gold" className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Create Follow-up
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.data.map((followUp, i) => {
            const StatusIcon = STATUS_ICONS[followUp.status];
            const priorityConfig = PRIORITY_CONFIG[followUp.priority];
            const isOverdue = followUp.dueDate && new Date(followUp.dueDate) < new Date() && followUp.status === "PENDING";

            return (
              <motion.div
                key={followUp.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className={cn("border", isOverdue && "border-red-500/30 bg-red-500/5")}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <StatusIcon className={cn(
                        "w-5 h-5 mt-0.5 flex-shrink-0",
                        followUp.status === "COMPLETED" ? "text-green-400" :
                        followUp.status === "CANCELLED" ? "text-gray-400" :
                        isOverdue ? "text-red-400" : "text-yellow-400"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{followUp.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {followUp.customer.name} · {followUp.customer.phone}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={cn("text-xs font-medium", priorityConfig.color)}>
                              {priorityConfig.label}
                            </span>
                            <Select
                              value={followUp.status}
                              onValueChange={(v) => handleStatusChange(followUp.id, v, followUp)}
                            >
                              <SelectTrigger className={cn("h-7 text-xs border rounded-full px-2", STATUS_STYLES[followUp.status])}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                <SelectItem value="COMPLETED">Completed</SelectItem>
                                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {followUp.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{followUp.description}</p>
                        )}

                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {followUp.dueDate && (
                              <span className={cn(isOverdue && "text-red-400 font-medium")}>
                                Due: {formatDate(followUp.dueDate)}
                              </span>
                            )}
                            {followUp.staff && (
                              <span>Assigned: {followUp.staff.name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => setEditFollowUp(followUp)}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDelete(followUp.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {data.page} of {data.totalPages}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" disabled={data.page <= 1}
              onClick={() => router.push(`/followups?page=${data.page - 1}`)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon-sm" disabled={data.page >= data.totalPages}
              onClick={() => router.push(`/followups?page=${data.page + 1}`)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Follow-up</DialogTitle>
          </DialogHeader>
          <FollowUpForm onSuccess={() => { setCreateOpen(false); router.refresh(); }} onCancel={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editFollowUp} onOpenChange={() => setEditFollowUp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Follow-up</DialogTitle>
          </DialogHeader>
          {editFollowUp && (
            <FollowUpForm
              followUp={editFollowUp}
              onSuccess={() => { setEditFollowUp(null); router.refresh(); }}
              onCancel={() => setEditFollowUp(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

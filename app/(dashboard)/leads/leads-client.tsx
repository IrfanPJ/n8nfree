"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus, Edit2, Trash2, Phone, Mail, DollarSign,
  TrendingUp, X, GripVertical, Target, Star
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createLead, updateLead, updateLeadStage, deleteLead } from "@/actions/leads";
import {
  leadSchema, type LeadFormData, LEAD_STAGES, LEAD_STAGE_LABELS,
} from "@/validators/lead";
import type { Lead, LeadStage } from "@/types";
import { cn } from "@/lib/utils";

interface LeadsClientProps {
  initialLeads: Lead[];
}

const STAGE_CONFIG: Record<LeadStage, { color: string; bg: string; border: string; dot: string }> = {
  ENQUIRY:    { color: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/30",   dot: "bg-blue-400" },
  INTERESTED: { color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30", dot: "bg-purple-400" },
  QUOTED:     { color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", dot: "bg-yellow-400" },
  CLOSED_WON: { color: "text-green-400",  bg: "bg-green-400/10",  border: "border-green-400/30",  dot: "bg-green-400" },
  CLOSED_LOST:{ color: "text-red-400",    bg: "bg-red-400/10",    border: "border-red-400/30",    dot: "bg-red-400" },
};

function LeadCard({
  lead,
  onEdit,
  onDelete,
  onDragStart,
}: {
  lead: Lead;
  onEdit: (l: Lead) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) {
  const cfg = STAGE_CONFIG[lead.stage];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      draggable
      onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, lead.id)}
      className="group bg-card border border-border/50 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-border hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <GripVertical className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
          <p className="font-medium text-sm truncate">{lead.name}</p>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => onEdit(lead)}>
            <Edit2 className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onDelete(lead.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {lead.interest && (
        <p className="text-xs text-muted-foreground mb-2 truncate">{lead.interest}</p>
      )}

      <div className="space-y-1">
        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="w-3 h-3" />
            {lead.phone}
          </a>
        )}
        {lead.email && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
            <Mail className="w-3 h-3 flex-shrink-0" />
            {lead.email}
          </p>
        )}
      </div>

      {lead.value > 0 && (
        <div className="mt-3 pt-2 border-t border-border/40 flex items-center gap-1 text-xs font-medium text-[#D4AF37]">
          <DollarSign className="w-3 h-3" />
          {lead.value.toLocaleString("en-AE")}
        </div>
      )}

      {lead.notes && (
        <p className="mt-2 text-xs text-muted-foreground/70 line-clamp-2">{lead.notes}</p>
      )}
    </motion.div>
  );
}

function LeadForm({
  lead,
  onSuccess,
  onCancel,
}: {
  lead?: Lead;
  onSuccess: (l: Lead) => void;
  onCancel: () => void;
}) {
  const isEditing = !!lead;
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema) as any,
    defaultValues: {
      name: lead?.name ?? "",
      phone: lead?.phone ?? "",
      email: lead?.email ?? "",
      interest: lead?.interest ?? "",
      stage: lead?.stage ?? "ENQUIRY",
      notes: lead?.notes ?? "",
      value: lead?.value ?? 0,
      source: lead?.source ?? "",
    },
  });

  const onSubmit = async (data: LeadFormData) => {
    const result = isEditing
      ? await updateLead(lead.id, data)
      : await createLead(data);
    if (result.success && result.data) {
      toast.success(result.message ?? "Lead saved");
      onSuccess(result.data);
    } else {
      toast.error(result.error ?? "Something went wrong");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label>Name *</Label>
          <Input placeholder="Contact name" {...register("name")} className={errors.name ? "border-destructive" : ""} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input placeholder="+91 98765 43210" {...register("phone")} />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" placeholder="email@example.com" {...register("email")} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Service Interest</Label>
          <Input placeholder="e.g. Wedding sherwani, Bespoke suit" {...register("interest")} />
        </div>
        <div className="space-y-1.5">
          <Label>Stage</Label>
          <Controller name="stage" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{LEAD_STAGE_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
        </div>
        <div className="space-y-1.5">
          <Label>Potential Value (AED)</Label>
          <Input type="number" min="0" step="100" {...register("value")} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Source</Label>
          <Input placeholder="e.g. Walk-in, Instagram, Referral" {...register("source")} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Notes</Label>
          <Textarea rows={3} placeholder="Any details about this lead..." {...register("notes")} className="resize-none" />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" variant="gold" loading={isSubmitting} className="flex-1">
          {isEditing ? "Update Lead" : "Add Lead"}
        </Button>
      </div>
    </form>
  );
}

export function LeadsClient({ initialLeads }: LeadsClientProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [modalOpen, setModalOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [defaultStage, setDefaultStage] = useState<LeadStage>("ENQUIRY");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<LeadStage | null>(null);

  const byStage = useMemo(() => {
    const map: Record<LeadStage, Lead[]> = {
      ENQUIRY: [], INTERESTED: [], QUOTED: [], CLOSED_WON: [], CLOSED_LOST: [],
    };
    for (const lead of leads) map[lead.stage].push(lead);
    return map;
  }, [leads]);

  const totalValue = useMemo(
    () => leads.filter((l) => l.stage === "CLOSED_WON").reduce((s, l) => s + l.value, 0),
    [leads]
  );

  const pipelineValue = useMemo(
    () => leads.filter((l) => !["CLOSED_WON", "CLOSED_LOST"].includes(l.stage)).reduce((s, l) => s + l.value, 0),
    [leads]
  );

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (stage: LeadStage) => {
    if (!dragId || dragId === "") return;
    const lead = leads.find((l) => l.id === dragId);
    if (!lead || lead.stage === stage) { setDragId(null); setDragOver(null); return; }

    setLeads((prev) => prev.map((l) => (l.id === dragId ? { ...l, stage } : l)));
    setDragId(null);
    setDragOver(null);

    const result = await updateLeadStage(dragId, stage);
    if (!result.success) {
      toast.error("Failed to move lead");
      setLeads((prev) => prev.map((l) => (l.id === dragId ? { ...l, stage: lead.stage } : l)));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    const result = await deleteLead(id);
    if (!result.success) {
      toast.error("Failed to delete");
    }
  };

  const handleSuccess = (lead: Lead) => {
    if (editLead) {
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? lead : l)));
    } else {
      setLeads((prev) => [lead, ...prev]);
    }
    setModalOpen(false);
    setEditLead(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {leads.length} leads · Pipeline: AED {pipelineValue.toLocaleString("en-AE")} · Won: AED {totalValue.toLocaleString("en-AE")}
          </p>
        </div>
        <Button variant="gold" onClick={() => { setEditLead(null); setDefaultStage("ENQUIRY"); setModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Pipeline summary */}
      <div className="grid grid-cols-5 gap-3">
        {LEAD_STAGES.map((stage) => {
          const cfg = STAGE_CONFIG[stage];
          const count = byStage[stage].length;
          const val = byStage[stage].reduce((s, l) => s + l.value, 0);
          return (
            <Card key={stage} className={cn("border", cfg.border, cfg.bg)}>
              <CardContent className="p-3">
                <p className={cn("text-xs font-semibold", cfg.color)}>{LEAD_STAGE_LABELS[stage]}</p>
                <p className="text-xl font-bold mt-1">{count}</p>
                {val > 0 && <p className="text-xs text-muted-foreground">AED {val.toLocaleString("en-AE")}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {LEAD_STAGES.map((stage) => {
          const cfg = STAGE_CONFIG[stage];
          const stageLeads = byStage[stage];
          const isDragTarget = dragOver === stage;

          return (
            <div
              key={stage}
              className={cn(
                "flex-shrink-0 w-72 rounded-xl border transition-all",
                isDragTarget ? "border-primary/50 bg-primary/5 scale-[1.01]" : "border-border/50 bg-secondary/20"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(stage); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(stage)}
            >
              {/* Column header */}
              <div className={cn("flex items-center justify-between px-4 py-3 border-b", "border-border/40")}>
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                  <span className="text-sm font-semibold">{LEAD_STAGE_LABELS[stage]}</span>
                  <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", cfg.bg, cfg.color)}>
                    {stageLeads.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6"
                  onClick={() => { setDefaultStage(stage); setEditLead(null); setModalOpen(true); }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-[300px]">
                <AnimatePresence>
                  {stageLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onEdit={(l) => { setEditLead(l); setModalOpen(true); }}
                      onDelete={handleDelete}
                      onDragStart={handleDragStart}
                    />
                  ))}
                </AnimatePresence>
                {stageLeads.length === 0 && !isDragTarget && (
                  <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/40">
                    Drop leads here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) setEditLead(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[#D4AF37]" />
              {editLead ? "Edit Lead" : "Add Lead"}
            </DialogTitle>
          </DialogHeader>
          <LeadForm
            lead={editLead ?? undefined}
            onSuccess={handleSuccess}
            onCancel={() => { setModalOpen(false); setEditLead(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus, Edit2, Trash2, Phone, Mail,
  TrendingUp, X, GripVertical, Target, Star,
  List, Calendar, ChevronLeft, ChevronRight, Download, Upload,
  AlertCircle, CheckCircle2, FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isToday, isSameMonth,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createLead, updateLead, updateLeadStage, deleteLead, bulkCreateLeads } from "@/actions/leads";
import { createCustomerFromLead } from "@/actions/customers";
import { createAppointment } from "@/actions/appointments";
import {
  leadSchema, type LeadFormData, LEAD_STAGES, LEAD_STAGE_LABELS,
  LEAD_SOURCES, LEAD_CATEGORIES, PIPELINE_STAGES,
} from "@/validators/lead";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import type { Lead, LeadStage, Customer } from "@/types";
import { cn } from "@/lib/utils";

interface LeadsClientProps {
  initialLeads: Lead[];
  customers: Customer[];
}

type ViewMode = "kanban" | "month" | "week" | "day";

const STAGE_CONFIG: Record<LeadStage, { color: string; bg: string; border: string; dot: string }> = {
  ENQUIRY:               { color: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/30",   dot: "bg-blue-400" },
  INTERESTED:            { color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30", dot: "bg-purple-400" },
  QUOTED:                { color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", dot: "bg-yellow-400" },
  APPOINTMENT_CONFIRMED: { color: "text-cyan-400",   bg: "bg-cyan-400/10",   border: "border-cyan-400/30",   dot: "bg-cyan-400" },
  CLOSED_WON:            { color: "text-green-400",  bg: "bg-green-400/10",  border: "border-green-400/30",  dot: "bg-green-400" },
  CLOSED_LOST:           { color: "text-red-400",    bg: "bg-red-400/10",    border: "border-red-400/30",    dot: "bg-red-400" },
  IRRELEVANT:            { color: "text-muted-foreground", bg: "bg-secondary/40", border: "border-border/40", dot: "bg-muted-foreground/40" },
  NO_REPLY:              { color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30", dot: "bg-orange-400" },
};

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function LeadCard({
  lead, onEdit, onDelete, onDragStart,
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

      {lead.source && (
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium mb-2 inline-block", cfg.bg, cfg.color)}>
          {lead.source}
        </span>
      )}

      <div className="space-y-1">
        {lead.phone && (
          <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()}>
            <Phone className="w-3 h-3" />{lead.phone}
          </a>
        )}
        {lead.email && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
            <Mail className="w-3 h-3 flex-shrink-0" />{lead.email}
          </p>
        )}
      </div>

      {lead.value > 0 && (
        <div className="mt-3 pt-2 border-t border-border/40 flex items-center gap-1 text-xs font-medium text-[#D4AF37]">
          AED {lead.value.toLocaleString("en-AE")}
        </div>
      )}

      {lead.notes && (
        <p className="mt-2 text-xs text-muted-foreground/70 line-clamp-2">{lead.notes}</p>
      )}
    </motion.div>
  );
}

function LeadForm({
  lead, onSuccess, onCancel,
}: {
  lead?: Lead;
  onSuccess: (l: Lead) => void;
  onCancel: () => void;
}) {
  const isEditing = !!lead;

  // If editing a lead with a custom source not in the preset list, pre-populate "Others" + custom text
  const existingSource = lead?.source ?? "";
  const isCustomSource = existingSource !== "" && !(LEAD_SOURCES as readonly string[]).includes(existingSource);
  const [sourceOther, setSourceOther] = useState(isCustomSource ? existingSource : "");

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema) as any,
    defaultValues: {
      name:          lead?.name ?? "",
      phone:         lead?.phone ?? "",
      email:         lead?.email ?? "",
      interest:      lead?.interest ?? "",
      stage:         lead?.stage ?? "ENQUIRY",
      notes:         lead?.notes ?? "",
      value:         lead?.value ?? 0,
      source:        isCustomSource ? "Others" : existingSource,
      category:      (lead?.category as any) ?? undefined,
      handler:       lead?.handler ?? "",
      transferredTo: lead?.transferredTo ?? "",
      visited:       lead?.visited ?? false,
      followup:      lead?.followup ?? false,
      leadDate:      lead?.leadDate ?? format(new Date(), "yyyy-MM-dd"),
    },
  });

  const selectedSource = useWatch({ control, name: "source" });

  const onSubmit = async (data: LeadFormData) => {
    const submitData = {
      ...data,
      source: data.source === "Others" ? (sourceOther.trim() || "") : data.source,
    };
    const result = isEditing
      ? await updateLead(lead.id, submitData)
      : await createLead(submitData);
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
          <Input placeholder="+971 50 123 4567" {...register("phone")} />
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
          <Label>Source</Label>
          <Controller name="source" control={control} render={({ field }) => (
            <Select value={field.value || ""} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder="How did they find us?" /></SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
        </div>
        {selectedSource === "Others" && (
          <div className="space-y-1.5">
            <Label>Please specify *</Label>
            <Input
              placeholder="e.g. LinkedIn, Exhibition, Newspaper..."
              value={sourceOther}
              onChange={(e) => setSourceOther(e.target.value)}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Potential Value (AED)</Label>
          <Input type="text" inputMode="decimal" {...register("value")} />
        </div>
        <div className="space-y-1.5">
          <Label>Lead Date</Label>
          <Input type="date" {...register("leadDate")} />
        </div>
        {/* Category */}
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Controller name="category" control={control} render={({ field }) => (
            <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
              <SelectTrigger><SelectValue placeholder="A / B / C / D" /></SelectTrigger>
              <SelectContent>
                {LEAD_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
        </div>
        {/* Handler */}
        <div className="space-y-1.5">
          <Label>Handler</Label>
          <Input placeholder="Staff handling this lead" {...register("handler")} />
        </div>
        {/* Transferred To */}
        <div className="space-y-1.5">
          <Label>Transferred To</Label>
          <Input placeholder="e.g. Business Bay" {...register("transferredTo")} />
        </div>
        {/* Visited + Followup */}
        <div className="space-y-1.5">
          <Label>Visited</Label>
          <Controller name="visited" control={control} render={({ field }) => (
            <Select value={field.value ? "YES" : "NO"} onValueChange={(v) => field.onChange(v === "YES")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NO">No</SelectItem>
                <SelectItem value="YES">Yes</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </div>
        <div className="space-y-1.5">
          <Label>Follow-up Required</Label>
          <Controller name="followup" control={control} render={({ field }) => (
            <Select value={field.value ? "YES" : "NO"} onValueChange={(v) => field.onChange(v === "YES")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NO">No</SelectItem>
                <SelectItem value="YES">Yes</SelectItem>
              </SelectContent>
            </Select>
          )} />
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

function exportLeadsCSV(leads: Lead[]) {
  const headers = [
    "DATE", "HANDLER", "SOURCE", "NAME", "EMAIL ID", "PHONE",
    "INTEREST", "NOTES", "FOLLOWUP", "CATEGORY", "STAGE",
    "TRANSFERRED TO", "VISITED", "INVOICE NUMBER IF CLOSED", "INVOICE VALUE",
  ];
  const rows = leads.map((l) => [
    format(new Date(l.leadDate ?? l.createdAt), "dd/MM/yyyy"),
    l.handler ?? "",
    l.source ?? "",
    l.name,
    l.email ?? "",
    l.phone ?? "",
    l.interest ?? "",
    (l.notes ?? "").replace(/\n/g, " "),
    l.followup ? "YES" : "NO",
    l.category ?? "",
    LEAD_STAGE_LABELS[l.stage] ?? l.stage,
    l.transferredTo ?? "",
    l.visited ? "YES" : "NO",
    "",  // INVOICE NUMBER — would need a join, left blank
    l.value > 0 ? l.value : "",
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function LeadsClient({ initialLeads, customers }: LeadsClientProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [modalOpen, setModalOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [defaultStage, setDefaultStage] = useState<LeadStage>("ENQUIRY");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<LeadStage | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  // Appointment popup triggered when lead → APPOINTMENT_CONFIRMED
  const [apptLead, setApptLead] = useState<Lead | null>(null);
  const [apptCustomerId, setApptCustomerId] = useState<string>("");

  // Export date filter
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");

  // Import Excel/CSV
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const byStage = useMemo(() => {
    const map = {} as Record<LeadStage, Lead[]>;
    for (const s of LEAD_STAGES) map[s] = [];
    for (const lead of leads) map[lead.stage].push(lead);
    return map;
  }, [leads]);

  const totalValue = useMemo(
    () => leads.filter((l) => l.stage === "CLOSED_WON").reduce((s, l) => s + l.value, 0),
    [leads]
  );
  const pipelineValue = useMemo(
    () => leads.filter((l) => !["CLOSED_WON", "CLOSED_LOST", "IRRELEVANT"].includes(l.stage)).reduce((s, l) => s + l.value, 0),
    [leads]
  );

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const weekDays = useMemo(
    () => eachDayOfInterval({ start: currentWeekStart, end: addDays(currentWeekStart, 6) }),
    [currentWeekStart]
  );

  const getLeadsForDay = (day: Date) =>
    leads.filter((l) => isSameDay(new Date(l.leadDate ?? l.createdAt), day));

  const navigate = (dir: -1 | 1) => {
    if (viewMode === "month") setCurrentMonth((d) => dir === 1 ? addMonths(d, 1) : subMonths(d, 1));
    else if (viewMode === "week") setCurrentWeekStart((d) => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1));
    else if (viewMode === "day") setSelectedDay((d) => dir === 1 ? addDays(d, 1) : subDays(d, 1));
  };

  const periodLabel = () => {
    if (viewMode === "month") return format(currentMonth, "MMMM yyyy");
    if (viewMode === "week") return `${format(currentWeekStart, "dd MMM")} – ${format(addDays(currentWeekStart, 6), "dd MMM yyyy")}`;
    if (viewMode === "day") return format(selectedDay, "EEEE, dd MMMM yyyy");
    return "";
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (stage: LeadStage) => {
    if (!dragId) return;
    const lead = leads.find((l) => l.id === dragId);
    if (!lead || lead.stage === stage) { setDragId(null); setDragOver(null); return; }

    setLeads((prev) => prev.map((l) => (l.id === dragId ? { ...l, stage } : l)));
    setDragId(null);
    setDragOver(null);

    const result = await updateLeadStage(dragId, stage);
    if (!result.success) {
      toast.error("Failed to move lead");
      setLeads((prev) => prev.map((l) => (l.id === dragId ? { ...l, stage: lead.stage } : l)));
      return;
    }

    // Auto-add to client book when moved to Closed Won
    if (stage === "CLOSED_WON") {
      const { customerName, isNew } = await createCustomerFromLead(lead.id);
      if (isNew) toast.success(`${customerName} added to Client Book`);
    }

    // Auto-open appointment form when moved to Appointment Confirmed
    if (stage === "APPOINTMENT_CONFIRMED") {
      // Auto-create (or find) a customer from the lead data so the appointment form works
      const { customerId, customerName, isNew } = await createCustomerFromLead(lead.id);
      if (customerId) {
        setApptCustomerId(customerId);
        // Add to local customers list so the select displays the name correctly
        if (isNew) {
          const stub = { id: customerId, name: customerName, phone: lead.phone ?? "", email: lead.email ?? "" } as any;
          // Only add if not already present (prevents duplicates on re-render)
          customers.push(stub);
        }
        if (isNew) toast.info(`Customer record created for ${customerName}`);
      } else {
        setApptCustomerId("");
      }
      setApptLead({ ...lead, stage });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    const result = await deleteLead(id);
    if (!result.success) toast.error("Failed to delete");
  };

  const handleSuccess = (lead: Lead) => {
    if (editLead) {
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? lead : l)));
      if (lead.stage === "CLOSED_WON" && editLead.stage !== "CLOSED_WON") {
        createCustomerFromLead(lead.id).then(({ customerName, isNew }) => {
          if (isNew) toast.success(`${customerName} added to Client Book`);
        });
      }
    } else {
      setLeads((prev) => [lead, ...prev]);
      if (lead.stage === "CLOSED_WON") {
        createCustomerFromLead(lead.id).then(({ customerName, isNew }) => {
          if (isNew) toast.success(`${customerName} added to Client Book`);
        });
      }
    }
    setModalOpen(false);
    setEditLead(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    setImportRows(raw);
    setImportErrors([]);
    setImportOpen(true);
  };

  const normaliseStage = (v: string): string => {
    const map: Record<string, string> = {
      enquiry: "ENQUIRY", interested: "INTERESTED", quoted: "QUOTED",
      "appointment confirmed": "APPOINTMENT_CONFIRMED", appointment_confirmed: "APPOINTMENT_CONFIRMED",
      "closed won": "CLOSED_WON", closed_won: "CLOSED_WON",
      "closed lost": "CLOSED_LOST", closed_lost: "CLOSED_LOST",
      irrelevant: "IRRELEVANT",
      "no reply": "NO_REPLY", no_reply: "NO_REPLY",
    };
    return map[v.toLowerCase().trim()] ?? "ENQUIRY";
  };

  const normaliseCategory = (v: string): string | undefined => {
    const upper = v.toUpperCase().trim();
    return ["A", "B", "C", "D"].includes(upper) ? upper : undefined;
  };

  const handleImportSubmit = async () => {
    setImporting(true);
    const mapped = importRows.map((row) => {
      const get = (...keys: string[]) => {
        for (const k of keys) {
          const found = Object.keys(row).find((r) => r.toLowerCase().trim() === k.toLowerCase().trim());
          if (found) return String(row[found]).trim();
        }
        return "";
      };
      const followupRaw = get("followup", "follow up", "follow-up");
      const visitedRaw = get("visited");
      return {
        name:          get("name", "full name", "contact name"),
        phone:         get("phone", "mobile", "phone number"),
        email:         get("email id", "email", "email address"),
        interest:      get("interest", "service", "service interest"),
        stage:         normaliseStage(get("stage") || "enquiry"),
        notes:         get("notes", "note", "remarks"),
        value:         parseFloat(get("invoice value", "value", "amount") || "0") || 0,
        source:        get("source", "lead source"),
        category:      normaliseCategory(get("category")),
        handler:       get("handler"),
        transferredTo: get("transferred to", "transferredto"),
        visited:       ["yes", "y", "true", "1"].includes(visitedRaw.toLowerCase()),
        followup:      ["yes", "y", "true", "1"].includes(followupRaw.toLowerCase()),
      };
    });

    const result = await bulkCreateLeads(mapped);
    setImporting(false);

    if (result.success && result.data) {
      toast.success(`Imported ${result.data.imported} leads`);
      if (result.data.errors.length) setImportErrors(result.data.errors);
      else { setImportOpen(false); setImportRows([]); }
      // reload leads by refreshing page state
      window.location.reload();
    } else {
      toast.error(result.error ?? "Import failed");
    }
  };

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      // Row 1: Headers (exact match to CSV format)
      ["DATE", "HANDLER", "SOURCE", "NAME", "EMAIL ID", "PHONE", "INTEREST", "NOTES", "FOLLOWUP", "CATEGORY", "STAGE", "TRANSFERRED TO", "VISITED", "INVOICE NUMBER IF CLOSED", "INVOICE VALUE"],
      // Row 2: Sample data
      ["01/06/2026", "Ahmed", "WhatsApp", "John Smith", "john@email.com", "+971501234567", "Wedding sherwani", "Interested in bespoke", "YES", "A", "Enquiry", "Business Bay", "NO", "", "5000"],
      // Row 3: Notes on valid values
      ["", "WHO IS HANDLING THE LEAD", "WhatsApp / Instagram / Google / Meta Ads / Referral / Walk-in / Others", "", "", "", "", "", "YES or NO", "A, B, C or D", "Enquiry / Interested / Quoted / Appointment Confirmed / Closed Won / Closed Lost", "WHICH STORE", "YES or NO", "", ""],
    ]);
    // Style the header row
    ws["!cols"] = [
      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 22 }, { wch: 16 },
      { wch: 20 }, { wch: 24 }, { wch: 10 }, { wch: 10 }, { wch: 22 }, { wch: 16 },
      { wch: 10 }, { wch: 24 }, { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "leads-import-template.xlsx");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Sales Pipeline</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {leads.length} leads · Pipeline: AED {pipelineValue.toLocaleString("en-AE")} · Won: AED {totalValue.toLocaleString("en-AE")}
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
            {(["kanban", "month", "week", "day"] as ViewMode[]).map((v) => (
              <Button
                key={v}
                variant="ghost"
                size="sm"
                className={cn("h-7 px-2 sm:px-3 text-xs capitalize", viewMode === v && "bg-background shadow-sm text-foreground")}
                onClick={() => setViewMode(v)}
              >
                {v === "kanban" ? <List className="w-3.5 h-3.5" /> : v === "month" ? <Calendar className="w-3.5 h-3.5" /> : null}
                <span className={cn("hidden sm:inline", (v === "kanban" || v === "month") && "sm:ml-1")}>{v}</span>
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(true)}>
            <Download className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-3.5 h-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
          <Button variant="gold" size="sm" onClick={() => { setEditLead(null); setDefaultStage("ENQUIRY"); setModalOpen(true); }}>
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Lead</span>
          </Button>
        </div>
      </div>

      {/* Calendar nav */}
      {viewMode !== "kanban" && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon-sm" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <p className="text-sm font-medium">{periodLabel()}</p>
          <Button variant="outline" size="icon-sm" onClick={() => navigate(1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Pipeline summary — main stages only */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {PIPELINE_STAGES.map((stage) => {
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

      {/* Month view */}
      {viewMode === "month" && (
        <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
          <div className="min-w-[320px]">
          <div className="grid grid-cols-7 border-b border-border bg-secondary/30">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const dayLeads = getLeadsForDay(day);
              const inMonth = isSameMonth(day, currentMonth);
              return (
                <div
                  key={day.toISOString()}
                  className={cn("min-h-[60px] sm:min-h-[90px] border-b border-r border-border p-1 sm:p-1.5 transition-colors cursor-pointer hover:bg-secondary/30", !inMonth && "bg-secondary/20", isToday(day) && "bg-[#D4AF37]/5")}
                  onClick={() => { setSelectedDay(day); setViewMode("day"); }}
                >
                  <div className={cn("text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1", isToday(day) ? "bg-[#D4AF37] text-black" : inMonth ? "text-foreground" : "text-muted-foreground/40")}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayLeads.slice(0, 3).map((l) => {
                      const cfg = STAGE_CONFIG[l.stage];
                      return (
                        <div key={l.id} className={cn("flex items-center gap-1 text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80", cfg.bg, cfg.color)} onClick={(e) => { e.stopPropagation(); setEditLead(l); setModalOpen(true); }}>
                          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
                          <span className="truncate">{l.name}</span>
                        </div>
                      );
                    })}
                    {dayLeads.length > 3 && <p className="text-[10px] text-muted-foreground pl-1">+{dayLeads.length - 3} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}

      {/* Week view */}
      {viewMode === "week" && (
        <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
          <div className="min-w-[420px]">
          <div className="grid grid-cols-7 border-b border-border bg-secondary/30">
            {weekDays.map((day) => (
              <div key={day.toISOString()} className={cn("text-center py-2 cursor-pointer hover:bg-secondary/50 transition-colors", isToday(day) && "bg-[#D4AF37]/10")} onClick={() => { setSelectedDay(day); setViewMode("day"); }}>
                <p className="text-xs text-muted-foreground">{format(day, "EEE")}</p>
                <p className={cn("text-sm font-semibold mt-0.5", isToday(day) && "text-[#D4AF37]")}>{format(day, "d")}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-border min-h-[300px]">
            {weekDays.map((day) => {
              const dayLeads = getLeadsForDay(day);
              return (
                <div key={day.toISOString()} className={cn("p-2 space-y-1", isToday(day) && "bg-[#D4AF37]/5")}>
                  {dayLeads.length === 0 ? <p className="text-[10px] text-muted-foreground/30 text-center mt-4">—</p> : dayLeads.map((l) => {
                    const cfg = STAGE_CONFIG[l.stage];
                    return (
                      <div key={l.id} className={cn("text-[10px] px-1.5 py-1 rounded truncate cursor-pointer hover:opacity-80", cfg.bg, cfg.color)} onClick={() => { setEditLead(l); setModalOpen(true); }}>
                        <div className="flex items-center gap-1">
                          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
                          <span className="truncate font-medium">{l.name}</span>
                        </div>
                        <p className="text-muted-foreground/70 truncate pl-2.5">{LEAD_STAGE_LABELS[l.stage]}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}

      {/* Day view */}
      {viewMode === "day" && (
        <div className="space-y-3">
          <div className={cn("text-center py-2 rounded-lg border border-border bg-secondary/20", isToday(selectedDay) && "border-[#D4AF37]/30 bg-[#D4AF37]/5")}>
            <p className="text-xs text-muted-foreground">{format(selectedDay, "EEEE")}</p>
            <p className="text-2xl font-bold">{format(selectedDay, "d")}</p>
            <p className="text-xs text-muted-foreground">{format(selectedDay, "MMMM yyyy")}</p>
          </div>
          {(() => {
            const dayLeads = getLeadsForDay(selectedDay);
            return dayLeads.length === 0 ? (
              <div className="text-center py-12">
                <Target className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No leads added this day</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayLeads.map((l) => {
                  const cfg = STAGE_CONFIG[l.stage];
                  return (
                    <Card key={l.id} className={cn("border group hover:shadow-md transition-all", cfg.border)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                              <p className="font-medium text-sm truncate">{l.name}</p>
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", cfg.bg, cfg.color)}>{LEAD_STAGE_LABELS[l.stage]}</span>
                            </div>
                            {l.interest && <p className="text-xs text-muted-foreground truncate">{l.interest}</p>}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              {l.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{l.phone}</span>}
                              {l.value > 0 && <span className="flex items-center gap-1 text-[#D4AF37]">AED {l.value.toLocaleString("en-AE")}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon-sm" className="h-7 w-7" onClick={() => { setEditLead(l); setModalOpen(true); }}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(l.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Kanban board */}
      {viewMode === "kanban" && (
        <div className="space-y-4">
          {/* Main pipeline */}
          <div className="flex gap-4 overflow-x-auto pb-2">
            {PIPELINE_STAGES.map((stage) => {
              const cfg = STAGE_CONFIG[stage];
              const stageLeads = byStage[stage];
              const isDragTarget = dragOver === stage;
              return (
                <div
                  key={stage}
                  className={cn("flex-shrink-0 w-72 rounded-xl border transition-all", isDragTarget ? "border-primary/50 bg-primary/5 scale-[1.01]" : "border-border/50 bg-secondary/20")}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(stage); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => handleDrop(stage)}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                      <span className="text-sm font-semibold">{LEAD_STAGE_LABELS[stage]}</span>
                      <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", cfg.bg, cfg.color)}>{stageLeads.length}</span>
                    </div>
                    <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => { setDefaultStage(stage); setEditLead(null); setModalOpen(true); }}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="p-2 space-y-2 min-h-[300px]">
                    <AnimatePresence>
                      {stageLeads.map((lead) => (
                        <LeadCard key={lead.id} lead={lead} onEdit={(l) => { setEditLead(l); setModalOpen(true); }} onDelete={handleDelete} onDragStart={handleDragStart} />
                      ))}
                    </AnimatePresence>
                    {stageLeads.length === 0 && !isDragTarget && (
                      <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/40">Drop leads here</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Separate section — Irrelevant + Closed Lost */}
          <div className="border-t border-border/50 pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Closed / Irrelevant</p>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {(["IRRELEVANT", "CLOSED_LOST", "NO_REPLY"] as LeadStage[]).map((stage) => {
                const cfg = STAGE_CONFIG[stage];
                const stageLeads = byStage[stage];
                const isDragTarget = dragOver === stage;
                return (
                  <div
                    key={stage}
                    className={cn("flex-shrink-0 w-72 rounded-xl border opacity-70 transition-all", isDragTarget ? "border-primary/50 opacity-100" : "border-border/40 bg-secondary/10")}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(stage); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => handleDrop(stage)}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                        <span className="text-sm font-semibold text-muted-foreground">{LEAD_STAGE_LABELS[stage]}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-secondary text-muted-foreground">{stageLeads.length}</span>
                      </div>
                    </div>
                    <div className="p-2 space-y-2 min-h-[120px]">
                      <AnimatePresence>
                        {stageLeads.map((lead) => (
                          <LeadCard key={lead.id} lead={lead} onEdit={(l) => { setEditLead(l); setModalOpen(true); }} onDelete={handleDelete} onDragStart={handleDragStart} />
                        ))}
                      </AnimatePresence>
                      {stageLeads.length === 0 && !isDragTarget && (
                        <div className="flex items-center justify-center h-10 text-xs text-muted-foreground/30">Drop here</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Lead form modal */}
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

      {/* Export date-range dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={(o) => { setExportDialogOpen(o); if (!o) { setExportFrom(""); setExportTo(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-[#D4AF37]" />
              Export Leads
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-xs text-muted-foreground">Filter by lead creation date, or leave blank to export all.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">From</Label>
                <Input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">To</Label>
                <Input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} className="text-sm" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setExportDialogOpen(false); setExportFrom(""); setExportTo(""); }}>
                Cancel
              </Button>
              <Button
                variant="gold"
                className="flex-1"
                onClick={() => {
                  const from = exportFrom ? new Date(exportFrom + "T00:00:00") : null;
                  const to = exportTo ? new Date(exportTo + "T23:59:59") : null;
                  const filtered = leads.filter((l) => {
                    const d = new Date(l.leadDate ?? l.createdAt);
                    if (from && d < from) return false;
                    if (to && d > to) return false;
                    return true;
                  });
                  exportLeadsCSV(filtered);
                  setExportDialogOpen(false);
                  setExportFrom("");
                  setExportTo("");
                  toast.success(`Exported ${filtered.length} lead${filtered.length !== 1 ? "s" : ""}`);
                }}
              >
                Export
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={(o) => { if (!o) { setImportOpen(false); setImportRows([]); setImportErrors([]); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#D4AF37]" />
              Import Leads from Excel / CSV
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template download */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 border border-border/40">
              <p className="text-xs text-muted-foreground">
                Accepted columns: <span className="font-medium text-foreground">Name</span> (required), Phone, Email, Stage, Source, Interest, Value, Notes
              </p>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-3 h-3 mr-1.5" />
                Template
              </Button>
            </div>

            {/* Row preview */}
            {importRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  {importRows.length} rows detected
                </p>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-border/40 text-xs">
                  <table className="w-full">
                    <thead className="bg-secondary/60 sticky top-0">
                      <tr>
                        {Object.keys(importRows[0]).slice(0, 6).map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {importRows.slice(0, 20).map((row, i) => (
                        <tr key={i} className="hover:bg-secondary/30">
                          {Object.values(row).slice(0, 6).map((v, j) => (
                            <td key={j} className="px-3 py-1.5 truncate max-w-[120px]">{String(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importRows.length > 20 && (
                    <p className="px-3 py-2 text-muted-foreground text-center">+{importRows.length - 20} more rows</p>
                  )}
                </div>
              </div>
            )}

            {/* Errors from last import */}
            {importErrors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-destructive flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {importErrors.length} rows had errors and were skipped
                </p>
                <div className="max-h-32 overflow-y-auto rounded-lg bg-destructive/5 border border-destructive/20 p-2 space-y-0.5">
                  {importErrors.map((e, i) => (
                    <p key={i} className="text-xs text-destructive/80">{e}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setImportOpen(false); setImportRows([]); setImportErrors([]); }}>
                Cancel
              </Button>
              <Button
                variant="gold"
                className="flex-1"
                disabled={importRows.length === 0 || importing}
                loading={importing}
                onClick={handleImportSubmit}
              >
                Import {importRows.length > 0 ? `${importRows.length} leads` : ""}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto appointment popup — triggered when lead moves to Appointment Confirmed */}
      {(() => {
        const defaultTitle = apptLead
          ? `${apptLead.interest ? apptLead.interest + " — " : ""}${apptLead.name}`
          : "";

        return (
          <Dialog open={!!apptLead} onOpenChange={(o) => { if (!o) { setApptLead(null); setApptCustomerId(""); } }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                  Book Appointment — {apptLead?.name}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Customer record is ready. Fill in the appointment details below.
                </p>
              </DialogHeader>
              <AppointmentForm
                customers={customers}
                defaultCustomerId={apptCustomerId}
                defaultLeadId={apptLead?.id}
                defaultTitle={defaultTitle}
                onSuccess={() => {
                  toast.success("Appointment saved");
                  setApptLead(null);
                  setApptCustomerId("");
                }}
                onCancel={() => { setApptLead(null); setApptCustomerId(""); }}
              />
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}

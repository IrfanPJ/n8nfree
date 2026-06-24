"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Ruler,
  Edit2,
  Trash2,
  Eye,
  Printer,
  ChevronDown,
  ChevronUp,
  User,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MeasurementForm } from "@/components/measurements/measurement-form";
import { CustomerForm } from "@/components/customers/customer-form";
import { deleteMeasurement } from "@/actions/measurements";
import type { Measurement, Customer } from "@/types";
import { cn } from "@/lib/utils";

interface MeasurementsClientProps {
  measurements: Measurement[];
  customers: Customer[];
}

function printMeasurement(measurement: Measurement, customerName: string) {
  const win = window.open("", "_blank", "width=700,height=900");
  if (!win) return;
  const u = measurement.unit === "cm" ? "cm" : "in";
  const logoUrl = window.location.origin + "/1080_HT_BLACK.png";

  const sections = [
    {
      title: "Upper Body",
      items: [
        { label: "Full Length",   v: measurement.shirtLength },
        { label: "Shoulder",      v: measurement.shoulder },
        { label: "Arm Hole",      v: measurement.armhole },
        { label: "Sleeve",        v: measurement.sleeve },
        { label: "Bicep",         v: measurement.bicep },
        { label: "Chest",         v: measurement.chest },
        { label: "Lower Chest",   v: measurement.lowerChest },
        { label: "Stomach",       v: measurement.stomach },
        { label: "Hip",           v: measurement.hip },
        { label: "Collar",        v: measurement.neck },
        { label: "Cross Back",    v: measurement.backLength },
        { label: "Cross Front",   v: measurement.frontLength },
      ],
    },
    {
      title: "Jacket",
      items: [
        { label: "Sleeve",        v: measurement.jacketSleeve },
        { label: "Full Length",   v: measurement.jacketLength },
      ],
    },
    {
      title: "Waistcoat",
      items: [
        { label: "Half Shoulder", v: measurement.waistcoatHalfShoulder },
        { label: "Full Length",   v: measurement.waistcoatLength },
      ],
    },
    {
      title: "Long Coat",
      items: [
        { label: "Sleeve",        v: measurement.longCoatSleeve },
        { label: "Full Length",   v: measurement.longCoatLength },
      ],
    },
    {
      title: "Trouser",
      items: [
        { label: "Knee Length",   v: measurement.kneeLength },
        { label: "Full Length",   v: measurement.outseam },
        { label: "Inseam",        v: measurement.inseam },
        { label: "Thigh Loose",   v: measurement.thigh },
        { label: "Knee Loose",    v: measurement.kneeLose },
        { label: "Bottom Hem",    v: measurement.ankle },
        { label: "U-Round",       v: measurement.rise },
      ],
    },
    {
      title: "Skirt",
      items: [
        { label: "Length",        v: measurement.skirtLength },
        { label: "Bottom Hem",    v: measurement.skirtBottomHem },
      ],
    },
  ];

  const sectionHtml = sections
    .map(({ title, items }) => {
      const filled = items.filter((i) => i.v !== null);
      if (!filled.length) return "";
      return `<div class="section">
        <h3>${title}</h3>
        <div class="grid">${filled
          .map(
            (i) =>
              `<div class="cell"><div class="cl">${i.label}</div><div class="cv">${i.v}${u}</div></div>`
          )
          .join("")}</div></div>`;
    })
    .join("");

  win.document.write(`<!DOCTYPE html><html><head>
    <title>Measurements — ${customerName}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#111}
      .hdr{text-align:center;border-bottom:2px solid #D4AF37;padding-bottom:16px;margin-bottom:20px}
      .hdr p{margin:0;font-size:12px;color:#666}
      .meta{display:flex;gap:24px;flex-wrap:wrap;margin-bottom:20px;padding:12px 16px;background:#f9f9f9;border-radius:8px;border:1px solid #eee}
      .mi .ml{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.5px}
      .mi .mv{font-size:13px;font-weight:600;margin-top:2px}
      .section{margin-bottom:18px}
      .section h3{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#D4AF37;margin:0 0 8px;border-bottom:1px solid #eee;padding-bottom:4px}
      .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
      .cell{background:#f9f9f9;border:1px solid #eee;padding:8px;border-radius:6px;text-align:center}
      .cl{font-size:10px;color:#999;text-transform:uppercase}
      .cv{font-size:15px;font-weight:bold;margin-top:2px}
      .notes{background:#f9f9f9;border:1px solid #eee;padding:10px;border-radius:6px;font-size:12px}
      .sig{display:flex;justify-content:space-between;margin-top:48px}
      .sl{text-align:center;width:40%}
      .sl .line{border-top:1px solid #ccc;padding-top:6px;font-size:11px;color:#999}
      @media print{body{padding:10px}}
    </style>
  </head><body>
    <div class="hdr"><img src="${logoUrl}" style="height:70px;max-width:240px;object-fit:contain;display:block;margin:0 auto 10px" alt="House of Tailors"><p>Measurement Record</p></div>
    <div class="meta">
      <div class="mi"><div class="ml">Client</div><div class="mv">${customerName}</div></div>
      <div class="mi"><div class="ml">Label</div><div class="mv">${measurement.label}</div></div>
      <div class="mi"><div class="ml">Unit</div><div class="mv">${measurement.unit}</div></div>
      <div class="mi"><div class="ml">Date Taken</div><div class="mv">${new Date(measurement.takenAt).toLocaleDateString("en-AE")}</div></div>
      ${measurement.takenBy ? `<div class="mi"><div class="ml">Measured By</div><div class="mv">${measurement.takenBy}</div></div>` : ""}
    </div>
    ${sectionHtml}
    ${measurement.notes ? `<div class="section"><h3>Notes</h3><div class="notes">${measurement.notes}</div></div>` : ""}
    <div class="sig">
      <div class="sl"><div class="line">Client Signature</div></div>
      <div class="sl"><div class="line">Tailor / Manager</div></div>
    </div>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

interface MeasurementCardProps {
  measurement: Measurement;
  customers: Customer[];
  onEdit: (m: Measurement) => void;
  onView: (m: Measurement) => void;
  onPrint: (m: Measurement) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function MeasurementValue({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  if (value === null || value === undefined) return null;
  return (
    <div className="text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-foreground">
        {value}
        <span className="text-[10px] text-muted-foreground ml-0.5">{unit}</span>
      </p>
    </div>
  );
}

function MeasurementCard({
  measurement,
  customers,
  onEdit,
  onView,
  onPrint,
  onDelete,
  isDeleting,
}: MeasurementCardProps) {
  const [expanded, setExpanded] = useState(false);
  const customer = customers.find((c) => c.id === measurement.customerId);
  const unit = measurement.unit === "cm" ? "cm" : "in";

  const primaryFields: Array<{ label: string; value: number | null }> = [
    { label: "Chest", value: measurement.chest },
    { label: "Waist", value: measurement.waist },
    { label: "Hip", value: measurement.hip },
    { label: "Shoulder", value: measurement.shoulder },
  ];

  const allFields: Array<{ label: string; value: number | null }> = [
    { label: "Full Length",    value: measurement.shirtLength },
    { label: "Shoulder",       value: measurement.shoulder },
    { label: "Arm Hole",       value: measurement.armhole },
    { label: "Sleeve",         value: measurement.sleeve },
    { label: "Bicep",          value: measurement.bicep },
    { label: "Chest",          value: measurement.chest },
    { label: "Lower Chest",    value: measurement.lowerChest },
    { label: "Stomach",        value: measurement.stomach },
    { label: "Hip",            value: measurement.hip },
    { label: "Collar",         value: measurement.neck },
    { label: "Cross Back",     value: measurement.backLength },
    { label: "Cross Front",    value: measurement.frontLength },
    { label: "Jacket Sleeve",  value: measurement.jacketSleeve },
    { label: "Jacket Len.",    value: measurement.jacketLength },
    { label: "WC Half Shldr",  value: measurement.waistcoatHalfShoulder },
    { label: "WC Length",      value: measurement.waistcoatLength },
    { label: "LC Sleeve",      value: measurement.longCoatSleeve },
    { label: "LC Length",      value: measurement.longCoatLength },
    { label: "Knee Length",    value: measurement.kneeLength },
    { label: "Trouser Len.",   value: measurement.outseam },
    { label: "Inseam",         value: measurement.inseam },
    { label: "Thigh Loose",    value: measurement.thigh },
    { label: "Knee Loose",     value: measurement.kneeLose },
    { label: "Bottom Hem",     value: measurement.ankle },
    { label: "U-Round",        value: measurement.rise },
    { label: "Skirt Length",   value: measurement.skirtLength },
    { label: "Skirt Hem",      value: measurement.skirtBottomHem },
  ].filter((f) => f.value !== null && f.value !== undefined);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className="border-border/60 hover:border-[#D4AF37]/30 transition-colors overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                <Ruler className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-sm font-semibold">
                    {customer ? customer.name : "Unknown Customer"}
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#D4AF37]/30 text-[#D4AF37]">
                    {measurement.unit}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {measurement.label && measurement.label !== "Standard" && (
                    <span className="text-xs font-semibold text-[#D4AF37]/90 tracking-wide">
                      {measurement.label}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {format(new Date(measurement.takenAt), "dd MMM yyyy")}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon-sm" onClick={() => onView(measurement)} title="View">
                <Eye className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => onPrint(measurement)} title="Print">
                <Printer className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => onEdit(measurement)} title="Edit">
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDelete(measurement.id)}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Primary measurements row */}
          <div className="grid grid-cols-4 gap-2 p-3 rounded-lg bg-secondary/30">
            {primaryFields.map((f) =>
              f.value !== null ? (
                <MeasurementValue key={f.label} label={f.label} value={f.value} unit={unit} />
              ) : (
                <div key={f.label} className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{f.label}</p>
                  <p className="text-sm text-muted-foreground/50">—</p>
                </div>
              )
            )}
          </div>

          {/* Expand/Collapse all measurements */}
          {allFields.length > 4 && (
            <>
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    Show all {allFields.length} measurements
                  </>
                )}
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 p-3 rounded-lg bg-secondary/20 border border-border/30">
                      {allFields.map((f) => (
                        <MeasurementValue
                          key={f.label}
                          label={f.label}
                          value={f.value}
                          unit={unit}
                        />
                      ))}
                    </div>
                    {measurement.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic px-1">
                        {measurement.notes}
                      </p>
                    )}
                    {measurement.takenBy && (
                      <p className="text-xs text-muted-foreground mt-1 px-1">
                        Measured by: <span className="text-foreground">{measurement.takenBy}</span>
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function MeasurementsClient({
  measurements: initialMeasurements,
  customers,
}: MeasurementsClientProps) {
  const router = useRouter();
  const [measurements, setMeasurements] = useState(initialMeasurements);

  // Sync local state whenever the server re-fetches (e.g. router.refresh()
  // after a branch switch) — without this, switching branches would keep
  // showing whatever measurements were loaded on first render.
  useEffect(() => {
    setMeasurements(initialMeasurements);
  }, [initialMeasurements]);

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editMeasurement, setEditMeasurement] = useState<Measurement | null>(null);
  const [viewMeasurement, setViewMeasurement] = useState<Measurement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterCustomer, setFilterCustomer] = useState<string>("");
  const [allCustomers, setAllCustomers] = useState<Customer[]>(customers);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string | undefined>();

  const filtered = measurements.filter((m) => {
    const customer = allCustomers.find((c) => c.id === m.customerId);
    const matchesSearch =
      !search ||
      (m.label ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (customer?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesCustomer = !filterCustomer || m.customerId === filterCustomer;
    return matchesSearch && matchesCustomer;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this measurement? This cannot be undone.")) return;
    setDeletingId(id);
    const result = await deleteMeasurement(id);
    if (result.success) {
      toast.success("Measurement deleted");
      setMeasurements((prev) => prev.filter((m) => m.id !== id));
    } else {
      toast.error(result.error ?? "Failed to delete");
    }
    setDeletingId(null);
  };

  const handleCreateSuccess = (m: Measurement) => {
    setMeasurements((prev) => [m, ...prev]);
    setCreateOpen(false);
    toast.success("Measurement saved");
  };

  const handleEditSuccess = (m: Measurement) => {
    setMeasurements((prev) => prev.map((x) => (x.id === m.id ? m : x)));
    setEditMeasurement(null);
    toast.success("Measurement updated");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Measurements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {measurements.length} total records
          </p>
        </div>
        <Button variant="gold" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Measurement
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by order no. or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {allCustomers.length > 0 && (
          <select
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            className={cn(
              "h-10 px-3 rounded-md border border-input bg-background text-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "text-foreground"
            )}
          >
            <option value="">All Customers</option>
            {allCustomers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Records", value: measurements.length },
          {
            label: "Customers",
            value: new Set(measurements.map((m) => m.customerId)).size,
          },
          {
            label: "In Inches",
            value: measurements.filter((m) => m.unit === "inches").length,
          },
          {
            label: "In CM",
            value: measurements.filter((m) => m.unit === "cm").length,
          },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/40">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-[#D4AF37]">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
            <Ruler className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No measurements found</p>
          <Button variant="gold" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add first measurement
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          <AnimatePresence>
            {filtered.map((m) => (
              <MeasurementCard
                key={m.id}
                measurement={m}
                customers={customers}
                onView={setViewMeasurement}
                onPrint={(m) => {
                  const c = customers.find((c) => c.id === m.customerId);
                  printMeasurement(m, c?.name ?? "Customer");
                }}
                onEdit={setEditMeasurement}
                onDelete={handleDelete}
                isDeleting={deletingId === m.id}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-[#D4AF37]" />
                New Measurement
              </DialogTitle>
              <button
                type="button"
                onClick={() => setNewCustomerOpen(true)}
                className="text-xs text-[#D4AF37] hover:text-[#D4AF37]/80 flex items-center gap-1 mr-6"
              >
                <User className="w-3.5 h-3.5" />
                + New Customer
              </button>
            </div>
          </DialogHeader>
          <MeasurementForm
            customers={allCustomers}
            defaultCustomerId={preselectedCustomerId}
            onSuccess={handleCreateSuccess}
            onCancel={() => { setCreateOpen(false); setPreselectedCustomerId(undefined); }}
          />
        </DialogContent>
      </Dialog>

      {/* New Customer Dialog (nested from measurements) */}
      <Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#D4AF37]" />
              Add New Customer
            </DialogTitle>
          </DialogHeader>
          <CustomerForm
            onSuccess={(newCustomer) => {
              setAllCustomers((prev) => [newCustomer, ...prev]);
              setPreselectedCustomerId(newCustomer.id);
              setNewCustomerOpen(false);
              toast.success(`${newCustomer.name} added — now select them for this measurement`);
            }}
            onCancel={() => setNewCustomerOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editMeasurement} onOpenChange={() => setEditMeasurement(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-[#D4AF37]" />
              Edit Measurement
            </DialogTitle>
          </DialogHeader>
          {editMeasurement && (
            <MeasurementForm
              measurement={editMeasurement}
              customers={customers}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditMeasurement(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewMeasurement} onOpenChange={() => setViewMeasurement(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewMeasurement && (() => {
            const customer = customers.find((c) => c.id === viewMeasurement.customerId);
            const u = viewMeasurement.unit === "cm" ? "cm" : "in";
            const sections = [
              {
                title: "Upper Body",
                fields: [
                  { label: "Full Length",   v: viewMeasurement.shirtLength },
                  { label: "Shoulder",      v: viewMeasurement.shoulder },
                  { label: "Arm Hole",      v: viewMeasurement.armhole },
                  { label: "Sleeve",        v: viewMeasurement.sleeve },
                  { label: "Bicep",         v: viewMeasurement.bicep },
                  { label: "Chest",         v: viewMeasurement.chest },
                  { label: "Lower Chest",   v: viewMeasurement.lowerChest },
                  { label: "Stomach",       v: viewMeasurement.stomach },
                  { label: "Hip",           v: viewMeasurement.hip },
                  { label: "Collar",        v: viewMeasurement.neck },
                  { label: "Cross Back",    v: viewMeasurement.backLength },
                  { label: "Cross Front",   v: viewMeasurement.frontLength },
                ],
              },
              {
                title: "Jacket / Waistcoat / Long Coat",
                fields: [
                  { label: "Jacket Sleeve",  v: viewMeasurement.jacketSleeve },
                  { label: "Jacket Len.",    v: viewMeasurement.jacketLength },
                  { label: "WC Half Shldr",  v: viewMeasurement.waistcoatHalfShoulder },
                  { label: "WC Length",      v: viewMeasurement.waistcoatLength },
                  { label: "LC Sleeve",      v: viewMeasurement.longCoatSleeve },
                  { label: "LC Length",      v: viewMeasurement.longCoatLength },
                ],
              },
              {
                title: "Trouser",
                fields: [
                  { label: "Knee Length",   v: viewMeasurement.kneeLength },
                  { label: "Full Length",   v: viewMeasurement.outseam },
                  { label: "Inseam",        v: viewMeasurement.inseam },
                  { label: "Thigh Loose",   v: viewMeasurement.thigh },
                  { label: "Knee Loose",    v: viewMeasurement.kneeLose },
                  { label: "Bottom Hem",    v: viewMeasurement.ankle },
                  { label: "U-Round",       v: viewMeasurement.rise },
                ],
              },
              {
                title: "Skirt",
                fields: [
                  { label: "Length",        v: viewMeasurement.skirtLength },
                  { label: "Bottom Hem",    v: viewMeasurement.skirtBottomHem },
                ],
              },
            ];
            return (
              <div className="space-y-5">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Ruler className="w-5 h-5 text-[#D4AF37]" />
                    {viewMeasurement.label}
                  </DialogTitle>
                </DialogHeader>

                {/* Meta row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-secondary/30 border border-border/40">
                  {customer && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Customer</p>
                      <p className="text-sm font-semibold mt-0.5">{customer.name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Unit</p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#D4AF37]/30 text-[#D4AF37] mt-1">
                      {viewMeasurement.unit}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Date Taken</p>
                    <p className="text-sm font-medium mt-0.5">
                      {format(new Date(viewMeasurement.takenAt), "dd MMM yyyy")}
                    </p>
                  </div>
                  {viewMeasurement.takenBy && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Measured By</p>
                      <p className="text-sm font-medium mt-0.5">{viewMeasurement.takenBy}</p>
                    </div>
                  )}
                </div>

                {/* Measurement sections */}
                {sections.map(({ title, fields }) => {
                  const filled = fields.filter((f) => f.v !== null);
                  if (!filled.length) return null;
                  return (
                    <div key={title} className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-border/50" />
                        <h3 className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest">{title}</h3>
                        <div className="h-px flex-1 bg-border/50" />
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {filled.map((f) => (
                          <div key={f.label} className="text-center p-3 rounded-lg bg-secondary/30 border border-border/30">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{f.label}</p>
                            <p className="text-lg font-bold mt-0.5">
                              {f.v}
                              <span className="text-xs text-muted-foreground font-normal ml-0.5">{u}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Remarks */}
                {[
                  { label: "Upper Body Remarks", val: viewMeasurement.upperRemarks },
                  { label: "Comments & Fabric Details", val: viewMeasurement.fabricNotes },
                  { label: "Trouser / Skirt Remarks", val: viewMeasurement.lowerRemarks },
                  { label: "General Notes", val: viewMeasurement.notes },
                ].filter((r) => r.val).map((r) => (
                  <div key={r.label} className="p-3 rounded-lg bg-secondary/20 border border-border/30">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{r.label}</p>
                    <p className="text-sm leading-relaxed">{r.val}</p>
                  </div>
                ))}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => printMeasurement(viewMeasurement, customer?.name ?? "Customer")}
                    className="gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </Button>
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => { setViewMeasurement(null); setEditMeasurement(viewMeasurement); }}
                    className="gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

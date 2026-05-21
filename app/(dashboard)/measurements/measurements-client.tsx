"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Ruler,
  Edit2,
  Trash2,
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
import { deleteMeasurement } from "@/actions/measurements";
import type { Measurement, Customer } from "@/types";
import { cn } from "@/lib/utils";

interface MeasurementsClientProps {
  measurements: Measurement[];
  customers: Customer[];
}

interface MeasurementCardProps {
  measurement: Measurement;
  customers: Customer[];
  onEdit: (m: Measurement) => void;
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
    { label: "Chest", value: measurement.chest },
    { label: "Waist", value: measurement.waist },
    { label: "Hip", value: measurement.hip },
    { label: "Shoulder", value: measurement.shoulder },
    { label: "Neck", value: measurement.neck },
    { label: "Sleeve", value: measurement.sleeve },
    { label: "Armhole", value: measurement.armhole },
    { label: "Inseam", value: measurement.inseam },
    { label: "Outseam", value: measurement.outseam },
    { label: "Rise", value: measurement.rise },
    { label: "Thigh", value: measurement.thigh },
    { label: "Ankle", value: measurement.ankle },
    { label: "Back Len.", value: measurement.backLength },
    { label: "Front Len.", value: measurement.frontLength },
    { label: "Jacket Len.", value: measurement.jacketLength },
    { label: "Shirt Len.", value: measurement.shirtLength },
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
                  <CardTitle className="text-sm font-semibold">{measurement.label}</CardTitle>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#D4AF37]/30 text-[#D4AF37]">
                    {measurement.unit}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {customer && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {customer.name}
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
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onEdit(measurement)}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDelete(measurement.id)}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive"
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
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editMeasurement, setEditMeasurement] = useState<Measurement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterCustomer, setFilterCustomer] = useState<string>("");

  const filtered = measurements.filter((m) => {
    const customer = customers.find((c) => c.id === m.customerId);
    const matchesSearch =
      !search ||
      m.label.toLowerCase().includes(search.toLowerCase()) ||
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
            placeholder="Search by label or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {customers.length > 0 && (
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
            {customers.map((c) => (
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
            <DialogTitle className="flex items-center gap-2">
              <Ruler className="w-5 h-5 text-[#D4AF37]" />
              New Measurement
            </DialogTitle>
          </DialogHeader>
          <MeasurementForm
            customers={customers}
            onSuccess={handleCreateSuccess}
            onCancel={() => setCreateOpen(false)}
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
    </div>
  );
}

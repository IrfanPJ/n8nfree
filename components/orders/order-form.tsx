"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { orderSchema, type OrderFormData } from "@/validators/order";
import { createOrder, updateOrder, checkDateConflicts, type DateConflictResult } from "@/actions/orders";
import { getFabricHistoryValues } from "@/actions/fabric-history";
import { getAssignableStaff } from "@/actions/users";
import {
  getTailorMasters, createTailorMaster,
  getGarmentTypes, createGarmentType,
} from "@/actions/master-lists";
import { uploadImage } from "@/lib/upload-image-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getCustomers, createCustomer } from "@/actions/customers";
import { getMeasurements } from "@/actions/measurements";
import { MeasurementForm } from "@/components/measurements/measurement-form";
import type { OrderWithRelations, Customer, Measurement, TailorMaster, GarmentTypeMaster } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import { COUNTRIES } from "@/lib/countries";
import { UserPlus, X, Plus, Trash2, Ruler, CheckCircle2, Edit2, Camera, Sparkles, ChevronDown, Search } from "lucide-react";
import {
  BespokeDesigner,
  OptionChip, OptionGroup, SecLabel,
  DEFAULT_JACKET, DEFAULT_SHIRT, DEFAULT_TROUSER,
  buildSpecText, type GarmentDesign,
} from "@/components/orders/bespoke-designer";

// ── Searchable customer combobox ─────────────────────────────────────────────
function CustomerCombobox({
  customers, value, onChange, loading, hasError,
}: {
  customers: Customer[];
  value: string;
  onChange: (id: string) => void;
  loading?: boolean;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = customers.find((c) => c.id === value);
  const filtered = search
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search))
    : customers;

  useEffect(() => {
    if (!open) return;
    function onPD(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPD);
    return () => document.removeEventListener("pointerdown", onPD);
  }, [open]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 0); }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button type="button" disabled={loading} onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full h-9 px-3 flex items-center justify-between rounded-md border text-sm bg-background hover:border-[#D4AF37]/50 transition-colors",
          hasError ? "border-destructive" : "border-input"
        )}>
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {loading ? "Loading…" : selected ? selected.name : "Select a customer"}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-md border border-border bg-popover shadow-lg">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input ref={inputRef} type="text" placeholder="Search by name or phone…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:border-[#D4AF37]/50" />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground px-3 py-4 text-center">No customers found</p>
            ) : filtered.map((c) => (
              <button key={c.id} type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => { onChange(c.id); setOpen(false); setSearch(""); }}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm flex items-center justify-between gap-2 hover:bg-accent transition-colors",
                  value === c.id && "bg-accent"
                )}>
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">{c.phone}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface OrderFormProps {
  order?: OrderWithRelations;
  defaultCustomerId?: string;
  onSuccess?: (order: OrderWithRelations) => void;
  onCancel?: () => void;
}

type StaffMember = { id: string; name: string; role: string; position: string | null; isActive: boolean };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wider">{children}</h3>
  );
}

export function OrderForm({ order, defaultCustomerId, onSuccess, onCancel }: OrderFormProps) {
  const isEditing = !!order;
  const submittingRef = useRef(false);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const stylingFileRef = useRef<HTMLInputElement | null>(null);

  // Data state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [tailorMasters, setTailorMasters] = useState<TailorMaster[]>([]);
  const [staff, setStaff] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [garmentTypes, setGarmentTypes] = useState<GarmentTypeMaster[]>([]);

  // UI state
  const [balanceDue, setBalanceDue] = useState(0);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientArea, setNewClientArea] = useState("");
  const [newClientCountry, setNewClientCountry] = useState("");
  const [newClientCountryCustom, setNewClientCountryCustom] = useState("");
  const [newClientCity, setNewClientCity] = useState("");
  const [savingClient, setSavingClient] = useState(false);


  // Styling dialog
  const [stylingDialogOpen, setStylingDialogOpen] = useState(false);

  // Tailor inline add
  const [showAddTailor, setShowAddTailor] = useState(false);
  const [newTailorName, setNewTailorName] = useState("");
  const [newTailorPhone, setNewTailorPhone] = useState("");
  const [savingTailor, setSavingTailor] = useState(false);

  // Garment type inline add
  const [newGarmentTypeName, setNewGarmentTypeName] = useState<Record<number, string>>({});
  const [showAddGarmentType, setShowAddGarmentType] = useState<Record<number, boolean>>({});

  // Fabric image upload state per item
  const [uploadingFabricImage, setUploadingFabricImage] = useState<Record<number, boolean>>({});

  // Styling image upload state
  const [stylingImages, setStylingImages] = useState<string[]>(order?.stylingImageUrls ?? []);
  const [uploadingStyling, setUploadingStyling] = useState(false);

  // Inline bespoke designer state
  const [designTab, setDesignTab] = useState<"jacket" | "shirt" | "trouser">("jacket");
  const parseInitialDesign = (): GarmentDesign => {
    try {
      const raw = order?.designNotes ?? "{}";
      const p = JSON.parse(raw);
      // Handle both { spec, design } format (from BespokeDesigner dialog)
      // and bare GarmentDesign format (legacy inline saves)
      if (p && typeof p === "object") {
        if ("design" in p && p.design) return p.design as GarmentDesign;
        if ("jacket" in p || "shirt" in p || "trouser" in p) return p as GarmentDesign;
      }
    } catch { /* ignore */ }
    return {} as GarmentDesign;
  };
  const [jacketDesign, setJacketDesign] = useState(() => ({ ...DEFAULT_JACKET, ...(parseInitialDesign().jacket ?? {}) }));
  const [shirtDesign, setShirtDesign] = useState(() => ({ ...DEFAULT_SHIRT, ...(parseInitialDesign().shirt ?? {}) }));
  const [trouserDesign, setTrouserDesign] = useState(() => ({ ...DEFAULT_TROUSER, ...(parseInitialDesign().trouser ?? {}) }));

  // Simple setters — syncDesignNotes runs via useEffect below
  const setJ = <K extends keyof typeof DEFAULT_JACKET>(k: K, v: string) =>
    setJacketDesign((d) => ({ ...d, [k]: v }));
  const setS = <K extends keyof typeof DEFAULT_SHIRT>(k: K, v: string) =>
    setShirtDesign((d) => ({ ...d, [k]: v }));
  const setT = <K extends keyof typeof DEFAULT_TROUSER>(k: K, v: string) =>
    setTrouserDesign((d) => ({ ...d, [k]: v }));

  // Keep designNotes form field in sync whenever design state changes
  useEffect(() => {
    const design: GarmentDesign = { jacket: jacketDesign, shirt: shirtDesign, trouser: trouserDesign };
    setValue("designNotes", JSON.stringify({ spec: buildSpecText(design), design }));
  }, [jacketDesign, shirtDesign, trouserDesign]); // eslint-disable-line

  // Payment method state
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState<string>(
    (order as any)?.advancePaymentMethod ?? ""
  );

  // Date conflict state
  const [deliveryConflict, setDeliveryConflict] = useState<DateConflictResult | null>(null);
  const [trialConflict,    setTrialConflict]    = useState<DateConflictResult | null>(null);
  const deliveryCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trialCheckTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkDeliveryConflict = useCallback((dateTimeValue: string) => {
    if (deliveryCheckTimer.current) clearTimeout(deliveryCheckTimer.current);
    if (!dateTimeValue) { setDeliveryConflict(null); return; }
    deliveryCheckTimer.current = setTimeout(async () => {
      const day = dateTimeValue.split("T")[0];
      const result = await checkDateConflicts(day, "delivery", order?.id);
      setDeliveryConflict(result);
    }, 400);
  }, [order?.id]);

  const checkTrialConflict = useCallback((dateTimeValue: string) => {
    if (trialCheckTimer.current) clearTimeout(trialCheckTimer.current);
    if (!dateTimeValue) { setTrialConflict(null); return; }
    trialCheckTimer.current = setTimeout(async () => {
      const day = dateTimeValue.split("T")[0];
      const result = await checkDateConflicts(day, "trial", order?.id);
      setTrialConflict(result);
    }, 400);
  }, [order?.id]);
  const [advancePaymentReference, setAdvancePaymentReference] = useState<string>("");

  // Measurements
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const [savedMeasurements, setSavedMeasurements] = useState<Measurement[]>([]);
  const [existingMeasurements, setExistingMeasurements] = useState<Measurement[]>([]);
  const [loadingMeasurements, setLoadingMeasurements] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null);
  const [fabricHistory, setFabricHistory] = useState<{ codes: string[]; compositions: string[]; colors: string[] }>({ codes: [], compositions: [], colors: [] });

  const defaultItems = order?.items?.length
    ? order.items.map((item) => ({
        id: item.id,
        garmentType: item.garmentType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        assignedToId: item.assignedToId ?? "",
        notes: item.notes ?? "",
        sortOrder: item.sortOrder,
        fabricCode:        item.fabricCode ?? "",
        fabricComposition: item.fabricComposition ?? "",
        fabricColor:       item.fabricColor ?? "",
        fabricImageUrl:    item.fabricImageUrl ?? "",
      }))
    : [{ garmentType: "", quantity: 1, unitPrice: 0, assignedToId: "", notes: "", sortOrder: 0, fabricCode: "", fabricComposition: "", fabricColor: "", fabricImageUrl: "" }];

  const {
    register, handleSubmit, watch, control, setValue,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema) as any, // eslint-disable-line
    defaultValues: {
      customerId: order?.customerId ?? defaultCustomerId ?? "",
      customOrderNumber: order?.customOrderNumber ?? "",
      items: defaultItems,
      fabricName: order?.fabricName ?? "",
      fabricColor: order?.fabricColor ?? "",
      fabricQuantity:
        order?.fabricQuantity !== null && order?.fabricQuantity !== undefined
          ? order.fabricQuantity : undefined,
      deliveryDate: order?.deliveryDate ? new Date(order.deliveryDate).toISOString().slice(0, 16) : "",
      trialDate: order?.trialDate ? new Date(order.trialDate).toISOString().slice(0, 16) : "",
      trialRequired: order?.trialRequired ?? false,
      totalAmount: order?.totalAmount ?? 0,
      advanceAmount: order?.advanceAmount ?? 0,
      priority: (order?.priority as any) ?? "REGULAR",
      designNotes: order?.designNotes ?? "",
      notes: order?.notes ?? "",
      assignedToId: order?.assignedToId ?? "",
      masterTailorId: order?.masterTailorId ?? "",
      salespersonId: order?.salespersonId ?? "",
      stylingName: order?.stylingName ?? "",
      stylingNotes: order?.stylingNotes ?? "",
      stylingImageUrls: order?.stylingImageUrls ?? [],
      purchaseNotes: order?.purchaseNotes ?? "",
      specialNotes: order?.specialNotes ?? "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const totalAmount = watch("totalAmount");
  const advanceAmount = watch("advanceAmount");
  const watchedCustomerId = watch("customerId");
  const watchedOrderNumber = watch("customOrderNumber");
  const trialRequired = watch("trialRequired");

  useEffect(() => {
    const sum = (watchedItems ?? []).reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
    if (sum > 0) setValue("totalAmount", sum);
  }, [JSON.stringify(watchedItems?.map((i) => ({ q: i.quantity, p: i.unitPrice })))]); // eslint-disable-line

  useEffect(() => {
    const total = Number(totalAmount) || 0;
    const advance = Number(advanceAmount) || 0;
    setBalanceDue(Math.max(0, total - advance));
  }, [totalAmount, advanceAmount]);

  useEffect(() => {
    getFabricHistoryValues().then((h) => setFabricHistory({ codes: h.codes, compositions: h.compositions, colors: h.colors })).catch(() => {});
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!watchedCustomerId) { setExistingMeasurements([]); return; }
    setLoadingMeasurements(true);
    getMeasurements(watchedCustomerId)
      .then((data) => setExistingMeasurements(data))
      .catch(() => setExistingMeasurements([]))
      .finally(() => setLoadingMeasurements(false));
    setShowMeasurementForm(false);
    setEditingMeasurement(null);
    setSavedMeasurements([]);
  }, [watchedCustomerId]); // eslint-disable-line

  useEffect(() => {
    async function fetchData() {
      try {
        const [customersResult, tailors, staffResult, gtypes] = await Promise.all([
          getCustomers({ pageSize: 200 }),
          getTailorMasters(),
          getAssignableStaff(),
          getGarmentTypes(),
        ]);
        setCustomers(customersResult.data);
        setTailorMasters(tailors);
        if (staffResult.success) setStaff(staffResult.data ?? []);
        setGarmentTypes(gtypes);
      } catch {
        toast.error("Failed to load form data");
      } finally {
        setLoadingCustomers(false);
      }
    }
    fetchData();
  }, []); // eslint-disable-line

  const handleSaveNewClient = async () => {
    if (!newClientName.trim()) { toast.error("Name is required"); return; }
    if (!newClientPhone.trim()) { toast.error("Phone is required"); return; }
    setSavingClient(true);
    const result = await createCustomer({
      name: newClientName.trim(),
      phone: newClientPhone.trim(),
      email: newClientEmail.trim() || undefined,
      area: newClientArea.trim() || undefined,
      country: newClientCountry || undefined,
      countryCustom: newClientCountryCustom.trim() || undefined,
      city: newClientCity.trim() || undefined,
      gender: "MALE",
      tags: [],
      isVIP: false,
    });
    if (result.success && result.data) {
      const c = result.data as Customer;
      setCustomers((prev) => [c, ...prev]);
      setShowAddClient(false);
      setNewClientName(""); setNewClientPhone(""); setNewClientEmail("");
      setNewClientArea(""); setNewClientCountry(""); setNewClientCountryCustom(""); setNewClientCity("");
      // Defer setValue so the new customer is in the list before Select tries to resolve the value
      setTimeout(() => setValue("customerId", c.id, { shouldDirty: true }), 0);
      toast.success(`${c.name} added to client book`);
    } else { toast.error(result.error ?? "Failed to save client"); }
    setSavingClient(false);
  };


  const handleSaveTailor = async () => {
    if (!newTailorName.trim()) { toast.error("Name is required"); return; }
    setSavingTailor(true);
    const result = await createTailorMaster({ name: newTailorName.trim(), phone: newTailorPhone.trim() || undefined });
    if (result.success && result.data) {
      setTailorMasters((prev) => [...prev, result.data!]);
      setValue("masterTailorId", result.data!.id);
      setShowAddTailor(false);
      setNewTailorName(""); setNewTailorPhone("");
      toast.success("Tailor saved");
    } else { toast.error(result.error ?? "Failed to save tailor"); }
    setSavingTailor(false);
  };

  const handleAddGarmentType = async (index: number) => {
    const name = (newGarmentTypeName[index] ?? "").trim();
    if (!name) return;
    const result = await createGarmentType(name);
    if (result.success && result.data) {
      setGarmentTypes((prev) => [...prev.filter((g) => g.name !== name), result.data!].sort((a, b) => a.name.localeCompare(b.name)));
      setValue(`items.${index}.garmentType`, result.data!.name);
      setShowAddGarmentType((prev) => ({ ...prev, [index]: false }));
      setNewGarmentTypeName((prev) => ({ ...prev, [index]: "" }));
    } else { toast.error(result.error ?? "Failed to save garment type"); }
  };

  const handleFabricImageUpload = useCallback(async (index: number, file: File) => {
    setUploadingFabricImage((prev) => ({ ...prev, [index]: true }));
    try {
      const result = await uploadImage("fabric-images", file, "items");
      if (result.url) {
        setValue(`items.${index}.fabricImageUrl`, result.url);
        toast.success("Fabric photo uploaded");
      } else { toast.error(result.error ?? "Upload failed"); }
    } finally {
      setUploadingFabricImage((prev) => ({ ...prev, [index]: false }));
    }
  }, [setValue]);

  const handleStylingImageUpload = useCallback(async (file: File) => {
    setUploadingStyling(true);
    try {
      const result = await uploadImage("order-styling-images", file, "styling");
      if (result.url) {
        const updated = [...stylingImages, result.url];
        setStylingImages(updated);
        setValue("stylingImageUrls", updated);
        toast.success("Styling image uploaded");
      } else { toast.error(result.error ?? "Upload failed"); }
    } finally {
      setUploadingStyling(false);
    }
  }, [stylingImages, setValue]);

  const removeStylingImage = (url: string) => {
    const updated = stylingImages.filter((u) => u !== url);
    setStylingImages(updated);
    setValue("stylingImageUrls", updated);
  };

  const onSubmit = async (data: OrderFormData) => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    // Always build fresh designNotes in { spec, design } format (same as BespokeDesigner dialog)
    const design: GarmentDesign = { jacket: jacketDesign, shirt: shirtDesign, trouser: trouserDesign };
    data.designNotes = JSON.stringify({ spec: buildSpecText(design), design });

    // Strip any accidentally large/base64 values (defensive — these shouldn't be in form state)
    data.items = (data.items ?? []).map((item) => ({
      ...item,
      fabricImageUrl: (item as any).fabricImageUrl?.startsWith?.("data:") ? "" : (item as any).fabricImageUrl ?? "",
    }));
    data.stylingImageUrls = (data.stylingImageUrls ?? []).filter((u) => !u.startsWith("data:"));

    if (advancePaymentMethod) {
      (data as any).advancePaymentMethod = advancePaymentMethod;
      (data as any).advancePaymentReference = advancePaymentReference || undefined;
    }

    // Dev diagnostic: log payload size per field so oversized submissions can be identified
    if (process.env.NODE_ENV === "development") {
      const byField = Object.entries(data as Record<string, unknown>).map(([k, v]) => ({
        field: k, bytes: JSON.stringify(v)?.length ?? 0,
      })).sort((a, b) => b.bytes - a.bytes);
      const total = byField.reduce((s, f) => s + f.bytes, 0);
      if (total > 50_000) {
        console.warn("[OrderForm] Large payload:", total, "bytes. Top fields:", byField.slice(0, 5));
      }
    }

    try {
      const result = isEditing ? await updateOrder(order.id, data) : await createOrder(data);
      if (result.success) {
        toast.success(result.message ?? "Success");
        onSuccess?.(result.data as OrderWithRelations);
      } else { toast.error(result.error ?? "Something went wrong"); }
    } finally { submittingRef.current = false; }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* ── Customer Details ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionTitle>Customer Details</SectionTitle>

        {/* Order Number */}
        <div className="space-y-1.5">
          <Label htmlFor="customOrderNumber">Order / Invoice Number</Label>
          <Input
            id="customOrderNumber"
            placeholder="e.g. HOT-2026-001 (leave blank to auto-generate)"
            className="h-9 text-sm"
            {...register("customOrderNumber")}
          />
          <p className="text-xs text-muted-foreground">This becomes the Invoice Number throughout the system.</p>
        </div>

        {/* Customer select */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="customerId">Customer *</Label>
            <button type="button" onClick={() => setShowAddClient((v) => !v)}
              className="flex items-center gap-1 text-xs text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors">
              {showAddClient ? (<><X className="w-3 h-3" /> Cancel</>) : (<><UserPlus className="w-3 h-3" /> New Client</>)}
            </button>
          </div>
          <Controller name="customerId" control={control} render={({ field }) => (
            <CustomerCombobox
              customers={customers}
              value={field.value}
              onChange={field.onChange}
              loading={loadingCustomers}
              hasError={!!errors.customerId}
            />
          )} />
          <FieldError message={errors.customerId?.message} />
          {showAddClient && (
            <div className="mt-2 p-4 rounded-lg border border-[#D4AF37]/25 bg-[#D4AF37]/5 space-y-3">
              <p className="text-xs font-semibold text-[#D4AF37] flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5" />Add New Client</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Full Name *</Label>
                  <Input placeholder="e.g. Ahmed Al Mansouri" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Phone *</Label>
                  <Input placeholder="+971 50 123 4567" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} className="h-8 text-sm" /></div>
                <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Email (optional)</Label>
                  <Input placeholder="email@example.com" type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Area</Label>
                  <Input placeholder="e.g. Downtown, JBR..." value={newClientArea} onChange={(e) => setNewClientArea(e.target.value)} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">City</Label>
                  <Input placeholder="e.g. Dubai" value={newClientCity} onChange={(e) => setNewClientCity(e.target.value)} className="h-8 text-sm" /></div>
                <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Country</Label>
                  <Select value={newClientCountry || "__none__"} onValueChange={(v) => { setNewClientCountry(v === "__none__" ? "" : v); if (v !== "Others") setNewClientCountryCustom(""); }}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Not specified —</SelectItem>
                      {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      <SelectItem value="Others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                  {newClientCountry === "Others" && (
                    <Input placeholder="Enter country name" value={newClientCountryCustom}
                      onChange={(e) => setNewClientCountryCustom(e.target.value)} className="h-8 text-sm mt-1.5" />
                  )}
                </div>
              </div>
              <Button type="button" variant="gold" size="sm" onClick={handleSaveNewClient} loading={savingClient} className="w-full gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />Save to Client Book
              </Button>
            </div>
          )}
        </div>

        {/* Sales Information */}
        <div className="space-y-1.5">
          <Label>Salesperson</Label>
          <Controller name="salespersonId" control={control} render={({ field }) => (
            <Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {staff.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
        </div>
      </div>

      {/* ── Order Details ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SectionTitle>Order Details</SectionTitle>
          <button type="button"
            onClick={() => append({ garmentType: "", quantity: 1, unitPrice: 0, assignedToId: "", notes: "", sortOrder: fields.length, fabricCode: "", fabricComposition: "", fabricColor: "", fabricImageUrl: "" })}
            className="flex items-center gap-1 text-xs text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors">
            <Plus className="w-3.5 h-3.5" />Add Item
          </button>
        </div>
        {(errors.items as any)?.message && <p className="text-xs text-destructive">{(errors.items as any).message}</p>}

        <div className="space-y-3">
          {fields.map((field, index) => {
            const fabricImageUrl = watch(`items.${index}.fabricImageUrl`);
            return (
              <div key={field.id} className="rounded-lg border border-border bg-secondary/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Item {index + 1}</span>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} className="text-muted-foreground hover:text-destructive transition-colors" aria-label="Remove item">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Row 1: Garment Type | Qty | Unit Price */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Garment Type with Add New */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Garment Type *</Label>
                    {showAddGarmentType[index] ? (
                      <div className="flex gap-1">
                        <Input
                          autoFocus
                          placeholder="New type name"
                          value={newGarmentTypeName[index] ?? ""}
                          onChange={(e) => setNewGarmentTypeName((prev) => ({ ...prev, [index]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddGarmentType(index); } }}
                          className="h-9 text-sm"
                        />
                        <Button type="button" size="sm" variant="gold" onClick={() => handleAddGarmentType(index)} className="h-9 px-2 text-xs">Save</Button>
                        <button type="button" onClick={() => setShowAddGarmentType((p) => ({ ...p, [index]: false }))} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <Controller name={`items.${index}.garmentType`} control={control} render={({ field: f }) => (
                        <Select value={f.value} onValueChange={(v) => { if (v === "__add__") { setShowAddGarmentType((p) => ({ ...p, [index]: true })); } else { f.onChange(v); } }}>
                          <SelectTrigger className={cn("h-9 text-sm", errors.items?.[index]?.garmentType ? "border-destructive" : "")}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__add__" className="text-[#D4AF37] font-medium border-b border-border/50 mb-1">+ Add New Item</SelectItem>
                            {garmentTypes.map((g) => (<SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      )} />
                    )}
                    <FieldError message={errors.items?.[index]?.garmentType?.message} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Qty</Label>
                    <Input type="text" inputMode="decimal" className="h-9 text-sm" {...register(`items.${index}.quantity`)} />
                    <FieldError message={errors.items?.[index]?.quantity?.message} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Unit Price (AED)</Label>
                    <Input type="text" inputMode="decimal" placeholder="0" className="h-9 text-sm" {...register(`items.${index}.unitPrice`)} />
                    <FieldError message={errors.items?.[index]?.unitPrice?.message} />
                  </div>
                </div>

                {/* Row 2: Fabric Code | Composition | Fabric Color | Photo */}
                <div className="grid grid-cols-4 gap-3 items-end">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fabric Code</Label>
                    <Input list={`fab-code-${index}`} placeholder="e.g. WL-001" className="h-9 text-sm" {...register(`items.${index}.fabricCode`)} />
                    <datalist id={`fab-code-${index}`}>{fabricHistory.codes.map((v) => <option key={v} value={v} />)}</datalist>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Composition</Label>
                    <Input list={`fab-comp-${index}`} placeholder="e.g. 100% Wool" className="h-9 text-sm" {...register(`items.${index}.fabricComposition`)} />
                    <datalist id={`fab-comp-${index}`}>{fabricHistory.compositions.map((v) => <option key={v} value={v} />)}</datalist>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fabric Color</Label>
                    <Input list={`fab-color-${index}`} placeholder="e.g. Navy Blue" className="h-9 text-sm" {...register(`items.${index}.fabricColor`)} />
                    <datalist id={`fab-color-${index}`}>{fabricHistory.colors.map((v) => <option key={v} value={v} />)}</datalist>
                  </div>
                  {/* Fabric photo */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Photo</Label>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={(el) => { fileInputRefs.current[index] = el; }}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFabricImageUpload(index, f); }}
                    />
                    {fabricImageUrl ? (
                      <div className="relative h-9 w-full">
                        <img src={fabricImageUrl} alt="Fabric" className="h-9 w-9 rounded object-cover border border-border" />
                        <button type="button"
                          onClick={() => setValue(`items.${index}.fabricImageUrl`, "")}
                          className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">×</button>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" size="sm" className="h-9 w-full text-xs gap-1"
                        loading={uploadingFabricImage[index]}
                        onClick={() => fileInputRefs.current[index]?.click()}>
                        <Camera className="w-3.5 h-3.5" />Photo
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Item Notes</Label>
                  <Input placeholder="Specific instructions for this garment..." className="h-8 text-sm" {...register(`items.${index}.notes`)} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Garment Styling ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTitle><span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" />Garment Styling</span></SectionTitle>
          <button type="button" onClick={() => setStylingDialogOpen(true)}
            className="flex items-center gap-1.5 text-xs text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            {buildSpecText({ jacket: jacketDesign, shirt: shirtDesign, trouser: trouserDesign }).trim() ? "Edit Styling" : "Add Styling"}
          </button>
        </div>
        {buildSpecText({ jacket: jacketDesign, shirt: shirtDesign, trouser: trouserDesign }).trim() && (
          <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2 leading-relaxed line-clamp-2">
            ✦ {buildSpecText({ jacket: jacketDesign, shirt: shirtDesign, trouser: trouserDesign })}
          </p>
        )}
      </div>

      {/* ── Order Schedule ────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionTitle>Order Schedule</SectionTitle>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="deliveryDate">Delivery Date &amp; Time *</Label>
            <Input
              id="deliveryDate"
              type="datetime-local"
              min={new Date().toISOString().slice(0, 16)}
              {...register("deliveryDate")}
              className={cn(errors.deliveryDate ? "border-destructive" : "")}
              onChange={(e) => {
                register("deliveryDate").onChange(e);
                checkDeliveryConflict(e.target.value);
              }}
            />
            <DateConflictHint result={deliveryConflict} />
            <FieldError message={errors.deliveryDate?.message} />
          </div>
          <div />
        </div>

        {/* Trial Required toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="trialRequired"
            className="w-4 h-4 rounded border-border"
            {...register("trialRequired")}
          />
          <Label htmlFor="trialRequired" className="cursor-pointer">Trial Required</Label>
        </div>

        {trialRequired && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="trialDate">Trial Date &amp; Time</Label>
              <Input
                id="trialDate"
                type="datetime-local"
                min={new Date().toISOString().slice(0, 16)}
                {...register("trialDate")}
                onChange={(e) => {
                  register("trialDate").onChange(e);
                  checkTrialConflict(e.target.value);
                }}
              />
              <DateConflictHint result={trialConflict} />
            </div>
          </div>
        )}

        {/* Master Tailor */}
        <div className="space-y-1.5">
          <Label>Master Tailor</Label>
          <Controller name="masterTailorId" control={control} render={({ field }) => (
            <Select value={field.value || "__none__"}
              onValueChange={(v) => {
                if (v === "__add_master__") { setShowAddTailor(true); return; }
                field.onChange(v === "__none__" ? "" : v);
              }}>
              <SelectTrigger><SelectValue placeholder="Assign master tailor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__add_master__" className="text-[#D4AF37] font-medium border-b border-border/50 mb-1">+ Add New Master</SelectItem>
                <SelectItem value="__none__">— Unassigned —</SelectItem>
                {tailorMasters.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}{t.specialization && <span className="ml-1.5 text-xs text-muted-foreground">({t.specialization})</span>}</SelectItem>))}
              </SelectContent>
            </Select>
          )} />
          {showAddTailor && (
            <div className="mt-2 p-3 rounded-lg border border-[#D4AF37]/25 bg-[#D4AF37]/5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#D4AF37]">Add New Master</p>
                <button type="button" onClick={() => { setShowAddTailor(false); setNewTailorName(""); setNewTailorPhone(""); }}
                  className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Name *" value={newTailorName} onChange={(e) => setNewTailorName(e.target.value)} className="h-8 text-sm" />
                <Input placeholder="Phone" value={newTailorPhone} onChange={(e) => setNewTailorPhone(e.target.value)} className="h-8 text-sm" />
              </div>
              <Button type="button" size="sm" variant="gold" onClick={handleSaveTailor} loading={savingTailor} className="w-full text-xs">Save Master</Button>
            </div>
          )}
        </div>

        {/* Priority */}
        <div className="space-y-1.5">
          <Label htmlFor="priority">Priority</Label>
          <Controller name="priority" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="REGULAR">Regular</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </div>
      </div>

      {/* ── Payment ───────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionTitle>Payment</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="totalAmount">Total Amount (AED) *</Label>
            <Input id="totalAmount" type="text" inputMode="decimal" placeholder="0" {...register("totalAmount")} className={cn(errors.totalAmount ? "border-destructive" : "")} />
            <FieldError message={errors.totalAmount?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="advanceAmount">Advance Amount (AED)</Label>
            <Input id="advanceAmount" type="text" inputMode="decimal" placeholder="0" {...register("advanceAmount")} className={cn(errors.advanceAmount ? "border-destructive" : "")} />
            <FieldError message={errors.advanceAmount?.message} />
          </div>
          <div className="space-y-1.5">
            <Label>Balance Due</Label>
            <div className="h-10 px-3 rounded-md border border-border bg-secondary/30 flex items-center text-sm font-medium text-[#D4AF37]">
              {formatCurrency(balanceDue)}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={advancePaymentMethod || "__none__"} onValueChange={(v) => setAdvancePaymentMethod(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select method (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Not specified —</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CARD">Card Payment</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="PAYMENT_LINK">Payment Link</SelectItem>
                <SelectItem value="OTHER">Others</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reference / Note</Label>
            <Input
              placeholder={advancePaymentMethod === "OTHER" ? "Describe payment method..." : "Transaction ref, link, or note..."}
              value={advancePaymentReference}
              onChange={(e) => setAdvancePaymentReference(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* ── Purchase Request & Special Notes ─────────────────────────────── */}
      <div className="space-y-4">
        <SectionTitle>Purchase Request & Special Notes</SectionTitle>
        <div className="space-y-1.5">
          <Label htmlFor="purchaseNotes">Purchase Request</Label>
          <Textarea id="purchaseNotes" placeholder="Fabric sourcing instructions, specific supplier requests..." rows={2} {...register("purchaseNotes")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="specialNotes">Special Notes</Label>
          <Textarea id="specialNotes" placeholder="Any special instructions visible across Orders, Purchases, and Kanban..." rows={2} {...register("specialNotes")} />
        </div>
      </div>

      {/* ── Notes ────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionTitle>Notes</SectionTitle>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea id="notes" placeholder="Any other instructions or reminders..." rows={2} {...register("notes")} />
        </div>
      </div>

      {/* ── Measurements ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5" />
            Measurements
            {existingMeasurements.length > 0 && (
              <span className="text-[10px] font-normal text-muted-foreground normal-case tracking-normal">
                ({existingMeasurements.length} on file)
              </span>
            )}
          </h3>
          {!showMeasurementForm && !editingMeasurement && (
            <button type="button" onClick={() => setShowMeasurementForm(true)} disabled={!watchedCustomerId}
              className="flex items-center gap-1 text-xs text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Plus className="w-3.5 h-3.5" />Add New
            </button>
          )}
        </div>
        {!watchedCustomerId && (<p className="text-xs text-muted-foreground">Select a customer above to view or add measurements</p>)}
        {loadingMeasurements && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />Loading measurements...
          </div>
        )}
        {!loadingMeasurements && existingMeasurements.length > 0 && (
          <div className="space-y-1.5">
            {existingMeasurements.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/30 border border-border/40 text-xs">
                <Ruler className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{m.label}</span>
                  <span className="text-muted-foreground ml-2">{m.unit}</span>
                  {m.chest && <span className="text-muted-foreground ml-2">Ch {m.chest}</span>}
                  {m.waist && <span className="text-muted-foreground ml-1">W {m.waist}</span>}
                  {m.shoulder && <span className="text-muted-foreground ml-1">Sh {m.shoulder}</span>}
                  {m.sleeve && <span className="text-muted-foreground ml-1">Sl {m.sleeve}</span>}
                </div>
                <button type="button" onClick={() => { setEditingMeasurement(m); setShowMeasurementForm(false); }}
                  className="text-muted-foreground hover:text-[#D4AF37] transition-colors flex-shrink-0"><Edit2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
        {savedMeasurements.length > 0 && (
          <div className="space-y-1.5">
            {savedMeasurements.map((m) => (
              <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/5 border border-green-500/20 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                <span className="font-medium">{m.label}</span>
                <span className="text-muted-foreground">· {m.unit}</span>
                {m.chest && <span className="text-muted-foreground ml-1">Ch {m.chest}</span>}
                {m.waist && <span className="text-muted-foreground ml-1">W {m.waist}</span>}
                <span className="text-green-400 ml-auto">Saved</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Measurement Dialog */}
      <Dialog open={showMeasurementForm || !!editingMeasurement}
        onOpenChange={(open) => { if (!open) { setShowMeasurementForm(false); setEditingMeasurement(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-[#D4AF37]" />
              {editingMeasurement ? `Edit — ${editingMeasurement.label}` : "New Measurement"}
            </DialogTitle>
          </DialogHeader>
          {(showMeasurementForm || editingMeasurement) && watchedCustomerId && (
            <MeasurementForm
              measurement={editingMeasurement ?? undefined}
              defaultCustomerId={watchedCustomerId}
              defaultLabel={editingMeasurement ? undefined : (watchedOrderNumber?.trim() || undefined)}
              onSuccess={(m) => {
                if (editingMeasurement) {
                  setExistingMeasurements((prev) => prev.map((x) => x.id === m.id ? m : x));
                  setEditingMeasurement(null);
                } else {
                  setSavedMeasurements((prev) => [...prev, m]);
                  setExistingMeasurements((prev) => [m, ...prev]);
                  setShowMeasurementForm(false);
                }
              }}
              onCancel={() => { setShowMeasurementForm(false); setEditingMeasurement(null); }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-border">
        {onCancel && (<Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>)}
        <Button type="submit" variant="gold" loading={isSubmitting} className="flex-1">
          {isEditing ? "Update Order" : "Create Order"}
        </Button>
      </div>

      {/* Styling Dialog */}
      <BespokeDesigner
        open={stylingDialogOpen}
        onClose={() => setStylingDialogOpen(false)}
        initialDesign={{ jacket: jacketDesign, shirt: shirtDesign, trouser: trouserDesign }}
        onSave={async (design, specText) => {
          setJacketDesign(design.jacket ?? DEFAULT_JACKET);
          setShirtDesign(design.shirt ?? DEFAULT_SHIRT);
          setTrouserDesign(design.trouser ?? DEFAULT_TROUSER);
          setValue("designNotes", JSON.stringify({ spec: specText, design }));
        }}
      />
    </form>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function DateConflictHint({ result }: { result: DateConflictResult | null }) {
  if (!result) return null;
  if (result.count === 0) return (
    <p className="flex items-center gap-1 text-[11px] text-emerald-400 mt-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
      No other orders on this date
    </p>
  );
  const names = result.orders
    .map((o) => `${o.customOrderNumber || o.orderNumber} — ${o.customerName}`)
    .join(", ");
  const color = result.count >= 3 ? "text-orange-400" : "text-amber-400";
  const dot   = result.count >= 3 ? "bg-orange-400"   : "bg-amber-400";
  return (
    <p className={`flex items-start gap-1 text-[11px] mt-0.5 ${color}`} title={names}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} inline-block mt-0.5 flex-shrink-0`} />
      <span>
        {result.count} other order{result.count > 1 ? "s" : ""} on this date
        {" — "}
        <span className="opacity-75">{names}</span>
      </span>
    </p>
  );
}

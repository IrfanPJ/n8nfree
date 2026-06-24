"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  FileText,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  DollarSign,
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
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { InvoiceView } from "@/components/invoices/invoice-view";
import { deleteInvoice, recordPayment } from "@/actions/invoices";
import { formatCurrency, INVOICE_STATUS_CONFIG, debounce } from "@/lib/utils";
import { recordPaymentSchema, type RecordPaymentFormData } from "@/validators/invoice";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InvoiceWithRelations, Customer, Order, PaginatedResult } from "@/types";
import type { InvoiceStatus } from "@/types";
import { cn } from "@/lib/utils";

interface InvoicesClientProps {
  initialData: PaginatedResult<InvoiceWithRelations>;
  customers: Customer[];
  orders: Order[];
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config = INVOICE_STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        config.color,
        config.bg
      )}
    >
      {config.label}
    </span>
  );
}

function PaymentForm({
  invoiceId,
  maxAmount,
  onSuccess,
  onCancel,
}: {
  invoiceId: string;
  maxAmount: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RecordPaymentFormData>({
    resolver: zodResolver(recordPaymentSchema) as any, // eslint-disable-line
    defaultValues: { amount: maxAmount, method: "CASH" },
  });
  const selectedMethod = watch("method");

  const onSubmit = async (data: RecordPaymentFormData) => {
    const result = await recordPayment(invoiceId, data);
    if (result.success) {
      toast.success("Payment recorded");
      onSuccess();
    } else {
      toast.error(result.error ?? "Failed to record payment");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Amount (AED) *</label>
          <Input
            type="text"
            inputMode="decimal"
            max={maxAmount}
            {...register("amount")}
            className={errors.amount ? "border-destructive" : ""}
          />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Payment Method *</label>
          <Controller
            name="method"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card Payment</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="PAYMENT_LINK">Payment Link</SelectItem>
                  <SelectItem value="OTHER">Others</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {selectedMethod === "OTHER" && (
          <div className="space-y-1.5 col-span-2">
            <label className="text-sm font-medium">Describe Payment Method</label>
            <Input placeholder="e.g. Cash on delivery, barter, etc." {...register("methodNote")} />
          </div>
        )}

        <div className="space-y-1.5 col-span-2">
          <label className="text-sm font-medium">Reference / Transaction ID</label>
          <Input placeholder="UPI ID, cheque number, etc." {...register("reference")} />
        </div>

        <div className="space-y-1.5 col-span-2">
          <label className="text-sm font-medium">Notes</label>
          <Input placeholder="Optional notes" {...register("notes")} />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" variant="gold" loading={isSubmitting} className="flex-1">
          Record Payment
        </Button>
      </div>
    </form>
  );
}

export function InvoicesClient({ initialData, customers, orders }: InvoicesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState(initialData);

  // Sync local state whenever the server re-fetches (e.g. router.refresh()
  // after a branch switch) — without this, switching branches would keep
  // showing whatever invoices were loaded on first render.
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<InvoiceWithRelations | null>(null);
  const [viewInvoice, setViewInvoice] = useState<InvoiceWithRelations | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceWithRelations | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | "">("");

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set("search", value);
        else params.delete("search");
        params.set("page", "1");
        router.push(`/invoices?${params.toString()}`);
      }, 400),
    [searchParams, router]
  );

  const handleDelete = async (id: string, invoiceNumber: string) => {
    if (!confirm(`Delete invoice ${invoiceNumber}? This cannot be undone.`)) return;
    setDeletingId(id);
    const result = await deleteInvoice(id);
    if (result.success) {
      toast.success("Invoice deleted");
      setData((prev) => ({
        ...prev,
        data: prev.data.filter((inv) => inv.id !== id),
        total: prev.total - 1,
      }));
    } else {
      toast.error(result.error ?? "Failed");
    }
    setDeletingId(null);
  };

  const handlePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/invoices?${params.toString()}`);
  };

  const handleFilterStatus = (status: InvoiceStatus | "") => {
    setFilterStatus(status);
    const params = new URLSearchParams(searchParams.toString());
    if (status) params.set("status", status);
    else params.delete("status");
    params.set("page", "1");
    router.push(`/invoices?${params.toString()}`);
  };

  // Summary stats
  const stats = useMemo(() => {
    const all = data.data;
    return {
      total: all.reduce((s, i) => s + i.totalAmount, 0),
      paid: all.reduce((s, i) => s + i.paidAmount, 0),
      due: all.reduce((s, i) => s + i.dueAmount, 0),
      overdue: all.filter((i) => i.status === "OVERDUE").length,
    };
  }, [data.data]);

  const statusOptions: Array<{ value: InvoiceStatus | ""; label: string }> = [
    { value: "", label: "All" },
    { value: "DRAFT", label: "Draft" },
    { value: "SENT", label: "Sent" },
    { value: "PARTIAL", label: "Partial" },
    { value: "PAID", label: "Paid" },
    { value: "OVERDUE", label: "Overdue" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data.total} total invoices</p>
        </div>
        <Button variant="gold" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Billed", value: formatCurrency(stats.total), icon: DollarSign, className: "" },
          { label: "Collected", value: formatCurrency(stats.paid), icon: CheckCircle2, className: "text-green-400" },
          { label: "Outstanding", value: formatCurrency(stats.due), icon: Clock, className: stats.due > 0 ? "text-yellow-400" : "text-green-400" },
          { label: "Overdue", value: stats.overdue, icon: AlertCircle, className: stats.overdue > 0 ? "text-red-400" : "text-muted-foreground" },
        ].map((stat) => (
          <Card key={stat.label} className={cn("border-border/40", stats.overdue > 0 && stat.label === "Overdue" && "border-red-500/20")}>
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={cn("w-8 h-8", stat.className || "text-[#D4AF37]")} />
              <div>
                <p className={cn("text-lg font-bold", stat.className || "text-[#D4AF37]")}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Status Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search invoice # or customer..."
            defaultValue={searchParams.get("search") ?? ""}
            onChange={(e) => debouncedSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleFilterStatus(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                filterStatus === opt.value
                  ? "bg-[#D4AF37] text-black"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice List */}
      {data.data.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
            <FileText className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No invoices found</p>
          <Button variant="gold" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create first invoice
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {data.data.map((invoice, i) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-[#D4AF37]/20 transition-all group"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-[#D4AF37]" />
                </div>

                {/* Main Info */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{invoice.invoiceNumber}</p>
                    <StatusBadge status={invoice.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>{invoice.customer.name}</span>
                    <span>{format(new Date(invoice.createdAt), "dd MMM yyyy")}</span>
                    {invoice.dueDate && (
                      <span className={cn(invoice.status === "OVERDUE" ? "text-red-400" : "")}>
                        Due: {format(new Date(invoice.dueDate), "dd MMM yyyy")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Amounts */}
                <div className="hidden sm:flex flex-col items-end gap-0.5">
                  <p className="text-sm font-bold text-[#D4AF37]">
                    {formatCurrency(invoice.totalAmount)}
                  </p>
                  {invoice.dueAmount > 0 && (
                    <p className="text-xs text-red-400">
                      Due: {formatCurrency(invoice.dueAmount)}
                    </p>
                  )}
                  {invoice.paidAmount > 0 && invoice.dueAmount === 0 && (
                    <p className="text-xs text-green-400">Fully paid</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setViewInvoice(invoice)}
                    title="View invoice"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {invoice.dueAmount > 0 && invoice.status !== "CANCELLED" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setPaymentInvoice(invoice)}
                      title="Record payment"
                      className="text-green-400 hover:text-green-400"
                    >
                      <CreditCard className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditInvoice(invoice)}
                    title="Edit invoice"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)}
                    disabled={deletingId === invoice.id}
                    className="text-destructive hover:text-destructive"
                    title="Delete invoice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {data.page} of {data.totalPages} · {data.total} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={data.page <= 1}
              onClick={() => handlePage(data.page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={data.page >= data.totalPages}
              onClick={() => handlePage(data.page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#D4AF37]" />
              New Invoice
            </DialogTitle>
          </DialogHeader>
          <InvoiceForm
            customers={customers}
            orders={orders}
            onSuccess={(inv) => {
              setData((prev) => ({
                ...prev,
                data: [inv, ...prev.data],
                total: prev.total + 1,
              }));
              setCreateOpen(false);
              toast.success("Invoice created");
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editInvoice} onOpenChange={() => setEditInvoice(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-[#D4AF37]" />
              Edit Invoice
            </DialogTitle>
          </DialogHeader>
          {editInvoice && (
            <InvoiceForm
              invoice={editInvoice}
              customers={customers}
              orders={orders}
              onSuccess={(inv) => {
                setData((prev) => ({
                  ...prev,
                  data: prev.data.map((x) => (x.id === inv.id ? inv : x)),
                }));
                setEditInvoice(null);
                toast.success("Invoice updated");
              }}
              onCancel={() => setEditInvoice(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#D4AF37]">
              Invoice {viewInvoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          {viewInvoice && <InvoiceView invoice={viewInvoice} showActions />}
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={!!paymentInvoice} onOpenChange={() => setPaymentInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-400" />
              Record Payment — {paymentInvoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          {paymentInvoice && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-secondary/30 flex justify-between text-sm">
                <span className="text-muted-foreground">Outstanding Balance</span>
                <span className="font-bold text-[#D4AF37]">
                  {formatCurrency(paymentInvoice.dueAmount)}
                </span>
              </div>
              <PaymentForm
                invoiceId={paymentInvoice.id}
                maxAmount={paymentInvoice.dueAmount}
                onSuccess={() => {
                  setPaymentInvoice(null);
                  router.refresh();
                }}
                onCancel={() => setPaymentInvoice(null)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

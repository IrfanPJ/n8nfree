"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Edit2, Star, Phone, Mail, MapPin, Calendar, ShoppingBag,
  Ruler, FileText, Package, MessageCircle, Plus, Sparkles, Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomerForm } from "@/components/customers/customer-form";
import { MeasurementForm } from "@/components/measurements/measurement-form";
import { BespokeDesigner } from "@/components/orders/bespoke-designer";
import { parseDesignNotes } from "@/app/(dashboard)/orders/orders-client";
import type { CustomerWithRelations, Measurement } from "@/types";
import {
  getInitials, formatDate, formatCurrency, ORDER_STATUS_CONFIG, INVOICE_STATUS_CONFIG, openWhatsApp
} from "@/lib/utils";
import { cn } from "@/lib/utils";

interface CustomerDetailClientProps {
  customer: CustomerWithRelations;
}

export function CustomerDetailClient({ customer }: CustomerDetailClientProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [measurementOpen, setMeasurementOpen] = useState(false);
  const [editMeasurement, setEditMeasurement] = useState<Measurement | null>(null);
  const [localMeasurements, setLocalMeasurements] = useState(customer.measurements as unknown as Measurement[]);
  const [designViewOrder, setDesignViewOrder] = useState<(typeof customer.orders)[0] | null>(null);

  const totalRevenue = customer.invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + i.paidAmount, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openWhatsApp(customer.phone, `Hello ${customer.name}, this is House of Tailors. How can we assist you?`)}
          >
            <MessageCircle className="w-4 h-4 mr-2 text-green-400" />
            WhatsApp
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMeasurementOpen(true)}>
            <Ruler className="w-4 h-4 mr-2 text-[#D4AF37]" />
            Add Measurement
          </Button>
          <Button variant="gold-outline" onClick={() => setEditOpen(true)}>
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Customer
          </Button>
        </div>
      </div>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex items-start gap-5">
          <Avatar className="h-20 w-20">
            <AvatarFallback className={cn(
              "text-2xl font-bold",
              customer.isVIP ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "bg-primary/10 text-primary"
            )}>
              {getInitials(customer.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{customer.name}</h1>
              {customer.isVIP && (
                <Badge variant="gold" className="flex items-center gap-1">
                  <Star className="w-3 h-3" /> VIP
                </Badge>
              )}
              <Badge variant="outline" className="capitalize">{customer.gender.toLowerCase()}</Badge>
            </div>

            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{customer.phone}</span>
              {customer.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{customer.email}</span>}
              {customer.city && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{customer.city}</span>}
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Since {formatDate(customer.createdAt)}</span>
            </div>

            {customer.notes && (
              <p className="text-sm text-muted-foreground mt-3 bg-secondary/30 rounded-lg p-3">{customer.notes}</p>
            )}

            {customer.tags.length > 0 && (
              <div className="flex gap-2 mt-3">
                {customer.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="hidden lg:grid grid-cols-2 gap-3">
            {[
              { label: "Orders", value: customer._count?.orders ?? 0, icon: ShoppingBag },
              { label: "Revenue", value: formatCurrency(totalRevenue), icon: FileText },
              { label: "Measurements", value: customer._count?.measurements ?? 0, icon: Package },
              { label: "Appointments", value: customer._count?.appointments ?? 0, icon: Calendar },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-3 rounded-xl bg-secondary/30 border border-border">
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">
            Orders ({customer._count?.orders ?? 0})
          </TabsTrigger>
          <TabsTrigger value="measurements">
            Measurements ({customer._count?.measurements ?? 0})
          </TabsTrigger>
          <TabsTrigger value="designs">
            Designs ({customer.orders.filter((o) => !!(o as any).designNotes).length})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices ({customer._count?.invoices ?? 0})
          </TabsTrigger>
          <TabsTrigger value="followups">
            Follow-ups ({customer._count?.followUps ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          {customer.orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No orders yet</p>
              <Button variant="gold" className="mt-4" onClick={() => router.push("/orders")}>
                Create Order
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {customer.orders.map((order) => {
                const statusConfig = ORDER_STATUS_CONFIG[order.status];
                return (
                  <div
                    key={order.id}
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/20 cursor-pointer transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-medium">{order.orderNumber}</span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border", statusConfig.bg, statusConfig.color, statusConfig.border)}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{order.garmentType}</p>
                      {(order as any).designNotes && (
                        <p className="text-[10px] text-[#D4AF37]/70 mt-0.5 truncate max-w-xs" title={parseDesignNotes((order as any).designNotes).spec}>
                          ✦ {parseDesignNotes((order as any).designNotes).spec}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold">{formatCurrency(order.totalAmount)}</p>
                      <p className="text-xs text-muted-foreground">Due: {formatDate(order.deliveryDate)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="measurements" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">
              {customer.measurements.length} measurement{customer.measurements.length !== 1 ? "s" : ""} recorded
            </p>
            <Button size="sm" variant="gold" onClick={() => setMeasurementOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Measurement
            </Button>
          </div>
          {localMeasurements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
              <Ruler className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No measurements recorded yet</p>
              <p className="text-xs mt-1">Tap &quot;Add Measurement&quot; to record this client&apos;s measurements</p>
            </div>
          ) : (
            <div className="space-y-3">
              {localMeasurements.map((m) => {
                const u = m.unit === "cm" ? "cm" : "in";
                const fields = [
                  { key: "Full Length", val: m.shirtLength },
                  { key: "Chest", val: m.chest },
                  { key: "Waist", val: m.waist },
                  { key: "Hip", val: m.hip },
                  { key: "Shoulder", val: m.shoulder },
                  { key: "Sleeve", val: m.sleeve },
                  { key: "Arm Hole", val: m.armhole },
                  { key: "Bicep", val: m.bicep },
                  { key: "Lower Chest", val: m.lowerChest },
                  { key: "Stomach", val: m.stomach },
                  { key: "Collar", val: m.neck },
                  { key: "Cross Back", val: m.backLength },
                  { key: "Cross Front", val: m.frontLength },
                  { key: "Jacket Sleeve", val: m.jacketSleeve },
                  { key: "Jacket Len", val: m.jacketLength },
                  { key: "WC Half Shldr", val: m.waistcoatHalfShoulder },
                  { key: "WC Length", val: m.waistcoatLength },
                  { key: "LC Sleeve", val: m.longCoatSleeve },
                  { key: "LC Length", val: m.longCoatLength },
                  { key: "Knee Len", val: m.kneeLength },
                  { key: "Trouser Len", val: m.outseam },
                  { key: "Inseam", val: m.inseam },
                  { key: "Thigh Loose", val: m.thigh },
                  { key: "Knee Loose", val: m.kneeLose },
                  { key: "Bottom Hem", val: m.ankle },
                  { key: "U-Round", val: m.rise },
                  { key: "Skirt Len", val: m.skirtLength },
                  { key: "Skirt Hem", val: m.skirtBottomHem },
                ].filter((item) => item.val !== null && item.val !== undefined);
                return (
                  <Card key={m.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>{m.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-normal">{formatDate(m.takenAt)}</span>
                          <Button size="icon-sm" variant="ghost" onClick={() => setEditMeasurement(m)} title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
                        {fields.map(({ key, val }) => (
                          <div key={key} className="text-center p-2 rounded-lg bg-secondary/30">
                            <p className="font-semibold">{val}{u}</p>
                            <p className="text-muted-foreground mt-0.5">{key}</p>
                          </div>
                        ))}
                      </div>
                      {m.upperRemarks && <p className="text-xs text-muted-foreground mt-2 italic">{m.upperRemarks}</p>}
                      {m.notes && <p className="text-xs text-muted-foreground mt-1 italic">{m.notes}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="designs" className="mt-4">
          {(() => {
            const ordersWithDesign = customer.orders.filter((o) => !!(o as any).designNotes);
            if (ordersWithDesign.length === 0) {
              return (
                <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No garment designs yet</p>
                  <p className="text-xs mt-1">Open an order and fill in Garment Style Details to save a design</p>
                </div>
              );
            }
            return (
              <div className="space-y-3">
                {ordersWithDesign.map((order) => {
                  const { spec, design } = parseDesignNotes((order as any).designNotes);
                  const statusConfig = ORDER_STATUS_CONFIG[order.status];
                  return (
                    <div key={order.id} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card">
                      <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-mono font-semibold">{order.orderNumber}</span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border", statusConfig.bg, statusConfig.color, statusConfig.border)}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{order.garmentType}</p>
                        {spec && (
                          <p className="text-xs text-[#D4AF37]/80 mt-1 leading-relaxed line-clamp-2">{spec}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => setDesignViewOrder(order as any)}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          View
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          {customer.invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No invoices</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customer.invoices.map((invoice) => {
                const config = INVOICE_STATUS_CONFIG[invoice.status];
                return (
                  <div
                    key={invoice.id}
                    onClick={() => router.push(`/invoices/${invoice.id}`)}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/20 cursor-pointer transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-medium">{invoice.invoiceNumber}</span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full", config.bg, config.color)}>
                          {config.label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(invoice.totalAmount)}</p>
                      {invoice.dueAmount > 0 && (
                        <p className="text-xs text-red-400">Due: {formatCurrency(invoice.dueAmount)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="followups" className="mt-4">
          {customer.followUps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Phone className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No follow-ups</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customer.followUps.map((fu) => (
                <div key={fu.id} className="p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{fu.title}</p>
                      {fu.description && <p className="text-xs text-muted-foreground mt-0.5">{fu.description}</p>}
                    </div>
                    <Badge
                      className={cn(
                        "text-xs",
                        fu.status === "COMPLETED" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                        fu.status === "PENDING" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                        "bg-gray-500/10 text-gray-400"
                      )}
                    >
                      {fu.status}
                    </Badge>
                  </div>
                  {fu.dueDate && (
                    <p className="text-xs text-muted-foreground mt-2">Due: {formatDate(fu.dueDate)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm
            customer={customer}
            onSuccess={() => { setEditOpen(false); router.refresh(); }}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Garment Design Viewer (read-only, print-only) */}
      <BespokeDesigner
        open={!!designViewOrder}
        onClose={() => setDesignViewOrder(null)}
        orderNumber={(designViewOrder as any)?.orderNumber}
        initialDesign={designViewOrder ? parseDesignNotes((designViewOrder as any).designNotes).design ?? undefined : undefined}
        order={designViewOrder ? {
          customerName: customer.name,
          deliveryDate: (designViewOrder as any).deliveryDate,
          trialDate: (designViewOrder as any).trialDate ?? "",
          gender: customer.gender ?? "",
        } : undefined}
      />

      {/* Add Measurement Dialog */}
      <Dialog open={measurementOpen} onOpenChange={setMeasurementOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ruler className="w-5 h-5 text-[#D4AF37]" />
              Add Measurement — {customer.name}
            </DialogTitle>
          </DialogHeader>
          <MeasurementForm
            defaultCustomerId={customer.id}
            onSuccess={(m) => {
              setLocalMeasurements((prev) => [m, ...prev]);
              setMeasurementOpen(false);
            }}
            onCancel={() => setMeasurementOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Measurement Dialog */}
      <Dialog open={!!editMeasurement} onOpenChange={() => setEditMeasurement(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-[#D4AF37]" />
              Edit Measurement — {customer.name}
            </DialogTitle>
          </DialogHeader>
          {editMeasurement && (
            <MeasurementForm
              measurement={editMeasurement}
              onSuccess={(m) => {
                setLocalMeasurements((prev) => prev.map((x) => x.id === m.id ? m : x));
                setEditMeasurement(null);
              }}
              onCancel={() => setEditMeasurement(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

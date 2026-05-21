"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Edit2, Star, Phone, Mail, MapPin, Calendar, ShoppingBag,
  Ruler, FileText, Phone as PhoneIcon, Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomerForm } from "@/components/customers/customer-form";
import type { CustomerWithRelations } from "@/types";
import {
  getInitials, formatDate, formatCurrency, ORDER_STATUS_CONFIG, INVOICE_STATUS_CONFIG
} from "@/lib/utils";
import { cn } from "@/lib/utils";

interface CustomerDetailClientProps {
  customer: CustomerWithRelations;
}

export function CustomerDetailClient({ customer }: CustomerDetailClientProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

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
        <Button variant="gold-outline" onClick={() => setEditOpen(true)}>
          <Edit2 className="w-4 h-4 mr-2" />
          Edit Customer
        </Button>
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
          {customer.measurements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No measurements recorded</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customer.measurements.map((m) => (
                <Card key={m.id}>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>{m.label}</span>
                      <span className="text-xs text-muted-foreground font-normal">{formatDate(m.takenAt)}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-xs">
                      {[
                        { key: "Chest", val: m.chest },
                        { key: "Waist", val: m.waist },
                        { key: "Hip", val: m.hip },
                        { key: "Shoulder", val: m.shoulder },
                        { key: "Sleeve", val: m.sleeve },
                        { key: "Neck", val: m.neck },
                        { key: "Inseam", val: m.inseam },
                        { key: "Back Len", val: m.backLength },
                        { key: "Jacket Len", val: m.jacketLength },
                        { key: "Shirt Len", val: m.shirtLength },
                      ].filter((item) => item.val !== null && item.val !== undefined).map(({ key, val }) => (
                        <div key={key} className="text-center p-2 rounded-lg bg-secondary/30">
                          <p className="font-semibold">{val}&quot;</p>
                          <p className="text-muted-foreground mt-0.5">{key}</p>
                        </div>
                      ))}
                    </div>
                    {m.notes && <p className="text-xs text-muted-foreground mt-3 italic">{m.notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
              <PhoneIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
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
    </div>
  );
}

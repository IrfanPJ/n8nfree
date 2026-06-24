"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Search, Filter, Star, Phone, Mail, ChevronLeft, ChevronRight, Trash2, Edit2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { CustomerForm } from "@/components/customers/customer-form";
import { deleteCustomer } from "@/actions/customers";
import type { CustomerWithRelations, PaginatedResult } from "@/types";
import { getInitials, debounce } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface CustomersClientProps {
  initialData: PaginatedResult<CustomerWithRelations>;
}

export function CustomersClient({ initialData }: CustomersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState(initialData);

  // Sync local state whenever the server re-fetches (e.g. router.refresh()
  // after a branch switch) — without this, switching branches would keep
  // showing whatever customers were loaded on first render.
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<CustomerWithRelations | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("search", value);
      else params.delete("search");
      params.set("page", "1");
      router.push(`/customers?${params.toString()}`);
    }, 400),
    [searchParams]
  );

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete customer "${name}"? This action cannot be undone.`)) return;
    setDeletingId(id);
    const result = await deleteCustomer(id);
    if (result.success) {
      toast.success("Customer deleted");
      setData((prev) => ({
        ...prev,
        data: prev.data.filter((c) => c.id !== id),
        total: prev.total - 1,
      }));
    } else {
      toast.error(result.error);
    }
    setDeletingId(null);
  };

  const handlePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/customers?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data.total} total customers</p>
        </div>
        <Button variant="gold" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email..."
            defaultValue={searchParams.get("search") ?? ""}
            onChange={(e) => debouncedSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={searchParams.get("vip") === "true" ? "gold" : "outline"}
          size="sm"
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            if (params.get("vip") === "true") params.delete("vip");
            else params.set("vip", "true");
            params.set("page", "1");
            router.push(`/customers?${params.toString()}`);
          }}
        >
          <Star className="w-3.5 h-3.5 mr-1.5" />
          VIP Only
        </Button>
      </div>

      {/* Customer List */}
      {data.data.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
            <Search className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No customers found</p>
          <Button variant="gold" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add your first customer
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {data.data.map((customer, i) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all group"
            >
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback className={cn(
                  "text-sm font-semibold",
                  customer.isVIP ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "bg-primary/10 text-primary"
                )}>
                  {getInitials(customer.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{customer.name}</p>
                  {customer.isVIP && (
                    <Badge variant="gold" className="text-[10px] px-1.5 py-0">VIP</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {customer.phone}
                  </span>
                  {customer.email && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3" /> {customer.email}
                    </span>
                  )}
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                <span>{customer._count?.orders ?? 0} orders</span>
                <span>{customer._count?.measurements ?? 0} measurements</span>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => router.push(`/customers/${customer.id}`)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setEditCustomer(customer)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(customer.id, customer.name)}
                  disabled={deletingId === customer.id}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm
            onSuccess={() => {
              setCreateOpen(false);
              router.refresh();
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editCustomer} onOpenChange={() => setEditCustomer(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          {editCustomer && (
            <CustomerForm
              customer={editCustomer}
              onSuccess={() => {
                setEditCustomer(null);
                router.refresh();
              }}
              onCancel={() => setEditCustomer(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

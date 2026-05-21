"use client";

import React, { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, X, CheckCircle2, Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { POSProduct, POSCartItem } from "@/types";
import { createPOSSale } from "@/actions/pos";
import { createProduct, deleteProduct } from "@/actions/products";

const TAX_RATE = 0.05; // 5% VAT

type PaymentMethod = "CASH" | "CARD";

function formatAED(n: number) {
  return `AED ${n.toLocaleString("en-AE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface ReceiptData {
  items: POSCartItem[];
  subtotal: number;
  tax: number;
  total: number;
  method: PaymentMethod;
  time: string;
  receiptNo: string;
}

function Receipt({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-4"
    >
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-full bg-green-400/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6 text-green-400" />
        </div>
        <h3 className="font-bold text-lg">Payment Successful</h3>
        <p className="text-xs text-muted-foreground">{data.time} · {data.receiptNo}</p>
      </div>

      <div className="bg-secondary/50 rounded-xl p-4 space-y-2 font-mono text-xs">
        <div className="text-center font-bold text-sm mb-3">HOUSE OF TAILORS</div>
        <div className="border-t border-dashed border-border pt-2 space-y-1">
          {data.items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>{item.name} ×{item.qty}</span>
              <span>{formatAED(item.price * item.qty)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-dashed border-border pt-2 space-y-1">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span><span>{formatAED(data.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>VAT (5%)</span><span>{formatAED(data.tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed border-border">
            <span>TOTAL</span><span>{formatAED(data.total)}</span>
          </div>
        </div>
        <div className="text-center text-muted-foreground pt-2">
          Paid via {data.method === "CASH" ? "Cash" : "Card"}
        </div>
      </div>

      <Button variant="gold" className="w-full" onClick={onClose}>
        New Sale
      </Button>
    </motion.div>
  );
}

function AddProductDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(price);
    if (!name.trim() || !category.trim() || isNaN(p) || p <= 0) {
      toast.error("Please fill all fields with valid values");
      return;
    }
    startTransition(async () => {
      try {
        await createProduct({ name: name.trim(), price: p, category: category.trim() });
        toast.success(`"${name.trim()}" added`);
        router.refresh();
        onClose();
      } catch {
        toast.error("Failed to add product");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-base">Add Product</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Product Name *</Label>
            <Input
              placeholder="e.g. Cufflinks"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Input
              placeholder="e.g. Accessories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Price (AED) *</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" className="flex-1" disabled={isPending}>
              {isPending ? "Adding…" : "Add Product"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ManageProductsDialog({ products, onClose }: { products: POSProduct[]; onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string, name: string) => {
    startTransition(async () => {
      try {
        await deleteProduct(id);
        toast.success(`"${name}" removed`);
        router.refresh();
      } catch {
        toast.error("Failed to remove product");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-base">Manage Products</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {products.length === 0 ? (
            <p className="text-center py-10 text-sm text-muted-foreground">No products yet</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {products.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-6 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.category} · {formatAED(p.price)}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    disabled={isPending}
                    className="text-destructive hover:text-destructive/70 transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="px-6 py-4 border-t border-border">
          <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
        </div>
      </motion.div>
    </div>
  );
}

export function POSClient({ products }: { products: POSProduct[] }) {
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category)))],
    [products]
  );

  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [category, setCategory] = useState("All");
  const [clientName, setClientName] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState<PaymentMethod | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showManage, setShowManage] = useState(false);

  const filteredProducts = useMemo(
    () => (category === "All" ? products : products.filter((p) => p.category === category)),
    [category, products]
  );

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const tax = useMemo(() => Math.round(subtotal * TAX_RATE), [subtotal]);
  const total = subtotal + tax;

  const addToCart = (product: POSProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const adjustQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)).filter((i) => i.qty > 0)
    );
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const handlePay = async (method: PaymentMethod) => {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    setLoading(method);

    const receiptNo = `HOT-POS-${Date.now()}`;
    try {
      await createPOSSale({
        receiptNo,
        clientName,
        items: cart,
        subtotal,
        tax,
        total,
        paymentMethod: method,
      });
    } catch {
      // receipt still shows locally even if DB fails
    }

    const receiptData: ReceiptData = {
      items: cart,
      subtotal,
      tax,
      total,
      method,
      time: new Date().toLocaleTimeString("en-AE"),
      receiptNo,
    };

    setReceipt(receiptData);
    setLoading(null);
    toast.success(`${formatAED(total)} received via ${method === "CASH" ? "Cash" : "Card"}`);
  };

  const handleNewSale = () => {
    setCart([]);
    setClientName("");
    setReceipt(null);
  };

  return (
    <>
      <AnimatePresence>
        {showAdd && <AddProductDialog key="add" onClose={() => setShowAdd(false)} />}
        {showManage && <ManageProductsDialog key="manage" products={products} onClose={() => setShowManage(false)} />}
      </AnimatePresence>

      <div className="flex gap-6 h-[calc(100vh-7rem)]">
        {/* Left — Product grid */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Point of Sale</h1>
              <p className="text-sm text-muted-foreground">Select items to add to the cart</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowManage(true)} className="gap-1.5">
                <Settings className="w-4 h-4" />
                Manage
              </Button>
              <Button variant="gold" size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  category === cat
                    ? "bg-[#D4AF37] text-black"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 opacity-20" />
                <p className="text-sm">No products yet</p>
                <Button variant="gold" size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  Add your first product
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <AnimatePresence mode="popLayout">
                  {filteredProducts.map((product) => {
                    const inCart = cart.find((i) => i.id === product.id);
                    return (
                      <motion.button
                        key={product.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        type="button"
                        onClick={() => addToCart(product)}
                        className={cn(
                          "relative p-4 rounded-xl border text-left transition-all hover:shadow-md active:scale-95",
                          inCart
                            ? "border-[#D4AF37]/50 bg-[#D4AF37]/5"
                            : "border-border/50 bg-card hover:border-border"
                        )}
                      >
                        {inCart && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#D4AF37] text-black text-[10px] font-bold flex items-center justify-center">
                            {inCart.qty}
                          </span>
                        )}
                        <p className="text-sm font-semibold leading-tight mb-1">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                        <p className="text-base font-bold text-[#D4AF37] mt-2">{formatAED(product.price)}</p>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Right — Cart */}
        <div className="w-80 flex-shrink-0 flex flex-col border border-border/50 rounded-2xl bg-card overflow-hidden">
          {receipt ? (
            <div className="p-5 flex-1 overflow-y-auto">
              <Receipt data={receipt} onClose={handleNewSale} />
            </div>
          ) : (
            <>
              {/* Cart header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                <ShoppingCart className="w-4 h-4 text-[#D4AF37]" />
                <span className="font-semibold text-sm">Cart</span>
                {cart.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {cart.reduce((s, i) => s + i.qty, 0)} items
                  </Badge>
                )}
              </div>

              {/* Client name */}
              <div className="px-4 py-3 border-b border-border/30">
                <Input
                  placeholder="Client name (optional)"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                    <ShoppingCart className="w-10 h-10 opacity-20" />
                    <p className="text-xs">Select items to add</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {cart.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center gap-3 px-4 py-3 border-b border-border/30"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{formatAED(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustQty(item.id, -1)}
                            className="w-6 h-6 rounded-md border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold w-5 text-center">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => adjustQty(item.id, 1)}
                            className="w-6 h-6 rounded-md border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="w-6 h-6 text-destructive hover:text-destructive/80 transition-colors ml-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* Totals + Payment */}
              <div className="border-t border-border/50 p-4 space-y-3">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatAED(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>VAT (5%)</span>
                    <span>{formatAED(tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t border-border/50 pt-1.5 mt-1.5">
                    <span>Total</span>
                    <span className="text-[#D4AF37]">{formatAED(total)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    disabled={cart.length === 0 || !!loading}
                    loading={loading === "CASH"}
                    onClick={() => handlePay("CASH")}
                    className="flex items-center gap-1.5"
                  >
                    <Banknote className="w-4 h-4" />
                    Cash
                  </Button>
                  <Button
                    variant="gold"
                    disabled={cart.length === 0 || !!loading}
                    loading={loading === "CARD"}
                    onClick={() => handlePay("CARD")}
                    className="flex items-center gap-1.5"
                  >
                    <CreditCard className="w-4 h-4" />
                    Card
                  </Button>
                </div>

                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Clear cart
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

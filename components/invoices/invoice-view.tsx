"use client";

import React, { useRef } from "react";
import { format } from "date-fns";
import { Printer, Download, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, INVOICE_STATUS_CONFIG } from "@/lib/utils";
import type { InvoiceWithRelations } from "@/types";
import { cn } from "@/lib/utils";

interface InvoiceViewProps {
  invoice: InvoiceWithRelations;
  showActions?: boolean;
}

const COMPANY = {
  name: "House of Tailors",
  tagline: "Luxury Bespoke Tailoring",
  address: "123, Fashion Street, Bandra West",
  city: "Mumbai – 400050, Maharashtra",
  phone: "+91 98765 43210",
  email: "info@houseoftailors.com",
  gstin: "27AABCH1234R1ZB",
  pan: "AABCH1234R",
} as const;

function StatusChip({ status }: { status: keyof typeof INVOICE_STATUS_CONFIG }) {
  const config = INVOICE_STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide border",
        config.color,
        config.bg,
        status === "PAID"
          ? "border-green-500/30"
          : status === "OVERDUE"
          ? "border-red-500/30"
          : status === "PARTIAL"
          ? "border-yellow-500/30"
          : "border-current/20"
      )}
    >
      {config.label}
    </span>
  );
}

export function InvoiceView({ invoice, showActions = true }: InvoiceViewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (!printContents) return;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber} - ${COMPANY.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Georgia', serif; background: #fff; color: #1a1a1a; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 300);
  };

  const discountAmount =
    invoice.discountType === "PERCENTAGE"
      ? (invoice.subtotal * invoice.discountValue) / 100
      : invoice.discountValue;

  const taxableAmount = Math.max(0, invoice.subtotal - discountAmount);

  return (
    <div className="space-y-4">
      {/* Action buttons — not printed */}
      {showActions && (
        <div className="flex justify-end gap-3 no-print">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print Invoice
          </Button>
        </div>
      )}

      {/* Invoice Document */}
      <div
        ref={printRef}
        style={{
          background: "#ffffff",
          color: "#1a1a1a",
          fontFamily: "'Georgia', 'Times New Roman', serif",
          maxWidth: "860px",
          margin: "0 auto",
        }}
      >
        {/* Gold border frame */}
        <div
          style={{
            border: "2px solid #D4AF37",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          {/* Header Band */}
          <div
            style={{
              background: "linear-gradient(135deg, #0a0a0a 0%, #1c1c1c 50%, #0a0a0a 100%)",
              padding: "32px 40px",
              position: "relative",
            }}
          >
            {/* Decorative corner lines */}
            <div
              style={{
                position: "absolute",
                top: "12px",
                left: "12px",
                width: "40px",
                height: "40px",
                borderTop: "2px solid #D4AF37",
                borderLeft: "2px solid #D4AF37",
                opacity: 0.6,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                width: "40px",
                height: "40px",
                borderTop: "2px solid #D4AF37",
                borderRight: "2px solid #D4AF37",
                opacity: 0.6,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "12px",
                left: "12px",
                width: "40px",
                height: "40px",
                borderBottom: "2px solid #D4AF37",
                borderLeft: "2px solid #D4AF37",
                opacity: 0.6,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "12px",
                right: "12px",
                width: "40px",
                height: "40px",
                borderBottom: "2px solid #D4AF37",
                borderRight: "2px solid #D4AF37",
                opacity: 0.6,
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              {/* Company Info */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "#D4AF37",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      color: "#000",
                      fontWeight: "bold",
                    }}
                  >
                    ✦
                  </div>
                  <h1
                    style={{
                      color: "#D4AF37",
                      fontSize: "26px",
                      fontWeight: "bold",
                      letterSpacing: "3px",
                      textTransform: "uppercase",
                    }}
                  >
                    {COMPANY.name}
                  </h1>
                </div>
                <p
                  style={{
                    color: "#9a8060",
                    fontSize: "10px",
                    letterSpacing: "4px",
                    textTransform: "uppercase",
                    marginBottom: "12px",
                  }}
                >
                  {COMPANY.tagline}
                </p>
                <div style={{ color: "#888", fontSize: "11px", lineHeight: "1.7" }}>
                  <p>{COMPANY.address}</p>
                  <p>{COMPANY.city}</p>
                  <p>Phone: {COMPANY.phone}</p>
                  <p>Email: {COMPANY.email}</p>
                </div>
              </div>

              {/* Invoice Title */}
              <div style={{ textAlign: "right" }}>
                <p
                  style={{
                    color: "#D4AF37",
                    fontSize: "32px",
                    fontWeight: "bold",
                    letterSpacing: "6px",
                    textTransform: "uppercase",
                  }}
                >
                  INVOICE
                </p>
                <p
                  style={{
                    color: "#888",
                    fontSize: "13px",
                    marginTop: "6px",
                    letterSpacing: "1px",
                  }}
                >
                  {invoice.invoiceNumber}
                </p>
                <div
                  style={{
                    marginTop: "16px",
                    padding: "8px 12px",
                    background: invoice.status === "PAID"
                      ? "rgba(34,197,94,0.2)"
                      : invoice.status === "OVERDUE"
                      ? "rgba(239,68,68,0.2)"
                      : invoice.status === "PARTIAL"
                      ? "rgba(234,179,8,0.2)"
                      : "rgba(212,175,55,0.15)",
                    border: `1px solid ${
                      invoice.status === "PAID"
                        ? "rgba(34,197,94,0.4)"
                        : invoice.status === "OVERDUE"
                        ? "rgba(239,68,68,0.4)"
                        : "rgba(212,175,55,0.4)"
                    }`,
                    borderRadius: "4px",
                    display: "inline-block",
                  }}
                >
                  <p
                    style={{
                      color:
                        invoice.status === "PAID"
                          ? "#4ade80"
                          : invoice.status === "OVERDUE"
                          ? "#f87171"
                          : "#D4AF37",
                      fontSize: "11px",
                      fontWeight: "bold",
                      letterSpacing: "3px",
                      textTransform: "uppercase",
                    }}
                  >
                    {INVOICE_STATUS_CONFIG[invoice.status]?.label ?? invoice.status}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Gold divider */}
          <div style={{ height: "3px", background: "linear-gradient(90deg, transparent, #D4AF37 20%, #D4AF37 80%, transparent)" }} />

          {/* Tax Info Band */}
          <div
            style={{
              background: "#f9f6f0",
              padding: "10px 40px",
              display: "flex",
              gap: "40px",
              borderBottom: "1px solid #e8d9b0",
            }}
          >
            <p style={{ fontSize: "11px", color: "#666" }}>
              <strong style={{ color: "#333" }}>GSTIN:</strong> {COMPANY.gstin}
            </p>
            <p style={{ fontSize: "11px", color: "#666" }}>
              <strong style={{ color: "#333" }}>PAN:</strong> {COMPANY.pan}
            </p>
            <p style={{ fontSize: "11px", color: "#666" }}>
              <strong style={{ color: "#333" }}>Tax Invoice</strong>
            </p>
          </div>

          {/* Invoice Meta & Customer */}
          <div style={{ padding: "24px 40px", background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "40px" }}>
              {/* Bill To */}
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    color: "#D4AF37",
                    fontSize: "9px",
                    fontWeight: "bold",
                    letterSpacing: "3px",
                    textTransform: "uppercase",
                    marginBottom: "8px",
                  }}
                >
                  Bill To
                </p>
                <p style={{ fontSize: "15px", fontWeight: "bold", color: "#1a1a1a", marginBottom: "4px" }}>
                  {invoice.customer.name}
                </p>
                {invoice.customer.phone && (
                  <p style={{ fontSize: "12px", color: "#555", lineHeight: "1.7" }}>
                    {invoice.customer.phone}
                  </p>
                )}
                {invoice.customer.email && (
                  <p style={{ fontSize: "12px", color: "#555" }}>{invoice.customer.email}</p>
                )}
                {invoice.customer.address && (
                  <p style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>
                    {invoice.customer.address}
                    {invoice.customer.city ? `, ${invoice.customer.city}` : ""}
                  </p>
                )}
              </div>

              {/* Invoice Details */}
              <div style={{ minWidth: "200px" }}>
                <p
                  style={{
                    color: "#D4AF37",
                    fontSize: "9px",
                    fontWeight: "bold",
                    letterSpacing: "3px",
                    textTransform: "uppercase",
                    marginBottom: "8px",
                  }}
                >
                  Invoice Details
                </p>
                <table style={{ fontSize: "12px", width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ color: "#888", paddingBottom: "5px", paddingRight: "12px" }}>Invoice #</td>
                      <td style={{ color: "#1a1a1a", fontWeight: "600", paddingBottom: "5px" }}>
                        {invoice.invoiceNumber}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: "#888", paddingBottom: "5px", paddingRight: "12px" }}>Date</td>
                      <td style={{ color: "#1a1a1a", paddingBottom: "5px" }}>
                        {format(new Date(invoice.createdAt), "dd MMM yyyy")}
                      </td>
                    </tr>
                    {invoice.dueDate && (
                      <tr>
                        <td style={{ color: "#888", paddingBottom: "5px", paddingRight: "12px" }}>Due Date</td>
                        <td
                          style={{
                            color:
                              invoice.status === "OVERDUE" ? "#ef4444" : "#1a1a1a",
                            paddingBottom: "5px",
                            fontWeight: invoice.status === "OVERDUE" ? "bold" : "normal",
                          }}
                        >
                          {format(new Date(invoice.dueDate), "dd MMM yyyy")}
                        </td>
                      </tr>
                    )}
                    {invoice.order && (
                      <tr>
                        <td style={{ color: "#888", paddingBottom: "5px", paddingRight: "12px" }}>Order #</td>
                        <td style={{ color: "#1a1a1a", paddingBottom: "5px" }}>
                          {(invoice.order as { orderNumber?: string }).orderNumber ?? invoice.orderId}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ padding: "0 40px 24px", background: "#fff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr
                  style={{
                    background: "#1a1a1a",
                    color: "#D4AF37",
                  }}
                >
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontWeight: "600",
                      letterSpacing: "1px",
                      fontSize: "10px",
                      textTransform: "uppercase",
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontWeight: "600",
                      letterSpacing: "1px",
                      fontSize: "10px",
                      textTransform: "uppercase",
                    }}
                  >
                    Description
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "right",
                      fontWeight: "600",
                      letterSpacing: "1px",
                      fontSize: "10px",
                      textTransform: "uppercase",
                    }}
                  >
                    Qty
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "right",
                      fontWeight: "600",
                      letterSpacing: "1px",
                      fontSize: "10px",
                      textTransform: "uppercase",
                    }}
                  >
                    Unit Price
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "right",
                      fontWeight: "600",
                      letterSpacing: "1px",
                      fontSize: "10px",
                      textTransform: "uppercase",
                    }}
                  >
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <tr
                    key={item.id}
                    style={{
                      background: i % 2 === 0 ? "#ffffff" : "#fdfaf5",
                      borderBottom: "1px solid #f0e8d0",
                    }}
                  >
                    <td style={{ padding: "10px 12px", color: "#888" }}>{i + 1}</td>
                    <td style={{ padding: "10px 12px", color: "#1a1a1a" }}>
                      {item.description}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#555" }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#555" }}>
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        color: "#1a1a1a",
                        fontWeight: "600",
                      }}
                    >
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div
            style={{
              background: "#f9f6f0",
              borderTop: "1px solid #e8d9b0",
              padding: "20px 40px",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <table style={{ width: "260px", fontSize: "13px" }}>
              <tbody>
                <tr>
                  <td style={{ color: "#666", paddingBottom: "8px", paddingRight: "20px" }}>
                    Subtotal
                  </td>
                  <td style={{ textAlign: "right", color: "#1a1a1a", paddingBottom: "8px" }}>
                    {formatCurrency(invoice.subtotal)}
                  </td>
                </tr>
                {invoice.discountValue > 0 && (
                  <tr>
                    <td style={{ color: "#666", paddingBottom: "8px", paddingRight: "20px" }}>
                      Discount
                      {invoice.discountType === "PERCENTAGE"
                        ? ` (${invoice.discountValue}%)`
                        : ""}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        color: "#ef4444",
                        paddingBottom: "8px",
                      }}
                    >
                      − {formatCurrency(discountAmount)}
                    </td>
                  </tr>
                )}
                <tr>
                  <td
                    style={{
                      color: "#666",
                      paddingBottom: "8px",
                      paddingRight: "20px",
                      fontSize: "11px",
                    }}
                  >
                    Taxable Amount
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      color: "#555",
                      paddingBottom: "8px",
                      fontSize: "11px",
                    }}
                  >
                    {formatCurrency(taxableAmount)}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: "#666", paddingBottom: "8px", paddingRight: "20px" }}>
                    CGST ({invoice.taxRate / 2}%)
                  </td>
                  <td style={{ textAlign: "right", color: "#1a1a1a", paddingBottom: "8px" }}>
                    {formatCurrency(invoice.taxAmount / 2)}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: "#666", paddingBottom: "12px", paddingRight: "20px" }}>
                    SGST ({invoice.taxRate / 2}%)
                  </td>
                  <td style={{ textAlign: "right", color: "#1a1a1a", paddingBottom: "12px" }}>
                    {formatCurrency(invoice.taxAmount / 2)}
                  </td>
                </tr>
                <tr style={{ borderTop: "2px solid #D4AF37" }}>
                  <td
                    style={{
                      paddingTop: "10px",
                      paddingRight: "20px",
                      fontWeight: "bold",
                      fontSize: "15px",
                      color: "#1a1a1a",
                    }}
                  >
                    Total
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      paddingTop: "10px",
                      fontWeight: "bold",
                      fontSize: "15px",
                      color: "#D4AF37",
                    }}
                  >
                    {formatCurrency(invoice.totalAmount)}
                  </td>
                </tr>
                {invoice.paidAmount > 0 && (
                  <>
                    <tr>
                      <td
                        style={{
                          paddingTop: "8px",
                          paddingRight: "20px",
                          color: "#22c55e",
                          fontSize: "12px",
                        }}
                      >
                        Paid
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          paddingTop: "8px",
                          color: "#22c55e",
                          fontSize: "12px",
                        }}
                      >
                        − {formatCurrency(invoice.paidAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          paddingTop: "6px",
                          paddingRight: "20px",
                          fontWeight: "bold",
                          color: invoice.dueAmount > 0 ? "#ef4444" : "#22c55e",
                        }}
                      >
                        Balance Due
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          paddingTop: "6px",
                          fontWeight: "bold",
                          color: invoice.dueAmount > 0 ? "#ef4444" : "#22c55e",
                        }}
                      >
                        {formatCurrency(invoice.dueAmount)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div style={{ padding: "0 40px 20px", background: "#fff" }}>
              <p
                style={{
                  color: "#D4AF37",
                  fontSize: "9px",
                  fontWeight: "bold",
                  letterSpacing: "3px",
                  textTransform: "uppercase",
                  marginBottom: "10px",
                }}
              >
                Payment History
              </p>
              <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9f6f0", borderBottom: "1px solid #e8d9b0" }}>
                    <th style={{ padding: "6px 10px", textAlign: "left", color: "#888" }}>Date</th>
                    <th style={{ padding: "6px 10px", textAlign: "left", color: "#888" }}>Method</th>
                    <th style={{ padding: "6px 10px", textAlign: "left", color: "#888" }}>Reference</th>
                    <th style={{ padding: "6px 10px", textAlign: "right", color: "#888" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid #f0e8d0" }}>
                      <td style={{ padding: "6px 10px", color: "#555" }}>
                        {format(new Date(p.paidAt), "dd MMM yyyy")}
                      </td>
                      <td style={{ padding: "6px 10px", color: "#555" }}>{p.method}</td>
                      <td style={{ padding: "6px 10px", color: "#888" }}>{p.reference ?? "—"}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right", color: "#22c55e", fontWeight: "600" }}>
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes & Terms */}
          {(invoice.notes || invoice.terms) && (
            <div
              style={{
                padding: "16px 40px",
                background: "#fdfaf5",
                borderTop: "1px solid #e8d9b0",
                display: "flex",
                gap: "40px",
              }}
            >
              {invoice.notes && (
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      color: "#D4AF37",
                      fontSize: "9px",
                      fontWeight: "bold",
                      letterSpacing: "2px",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    Notes
                  </p>
                  <p style={{ fontSize: "11px", color: "#666", lineHeight: "1.6" }}>
                    {invoice.notes}
                  </p>
                </div>
              )}
              {invoice.terms && (
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      color: "#D4AF37",
                      fontSize: "9px",
                      fontWeight: "bold",
                      letterSpacing: "2px",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    Terms & Conditions
                  </p>
                  <p style={{ fontSize: "11px", color: "#666", lineHeight: "1.6" }}>
                    {invoice.terms}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              background: "#0a0a0a",
              padding: "16px 40px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <p
              style={{
                color: "#555",
                fontSize: "10px",
                letterSpacing: "1px",
              }}
            >
              This is a computer-generated invoice. No signature required.
            </p>
            <p
              style={{
                color: "#D4AF37",
                fontSize: "10px",
                letterSpacing: "2px",
                textTransform: "uppercase",
              }}
            >
              {COMPANY.name} ✦
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

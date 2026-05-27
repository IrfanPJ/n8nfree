"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Printer, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface OrderQRDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  customerName: string;
  garmentType: string;
}

export function OrderQRDialog({
  open,
  onClose,
  orderId,
  orderNumber,
  customerName,
  garmentType,
}: OrderQRDialogProps) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    if (!open || !orderId) {
      setDataUrl("");
      return;
    }
    QRCode.toDataURL(`${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/scan/${orderId}`, {
      width: 256,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then(setDataUrl)
      .catch(console.error);
  }, [open, orderId]);

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=480,height=640");
    if (!win || !dataUrl) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>QR Code — ${orderNumber}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:0;padding:32px;text-align:center;background:#fff}
        .hdr{border-bottom:2px solid #D4AF37;padding-bottom:16px;margin-bottom:28px}
        .hdr h1{margin:0;font-size:20px;color:#D4AF37;letter-spacing:2px}
        .hdr p{margin:4px 0 0;font-size:11px;color:#888}
        .qr-wrap{display:inline-block;padding:16px;border:1px solid #eee;border-radius:12px;background:#fff;margin-bottom:20px}
        .order-num{font-size:26px;font-weight:bold;color:#D4AF37;letter-spacing:2px;margin-bottom:8px}
        .info{font-size:13px;color:#333;margin:3px 0}
        .uid{font-size:8px;color:#bbb;margin-top:14px;word-break:break-all;font-family:monospace}
        .sig{display:flex;justify-content:space-between;margin-top:48px;padding-top:12px;border-top:1px solid #eee}
        .sl{text-align:center;width:45%}
        .sl .line{border-top:1px solid #ccc;padding-top:6px;font-size:10px;color:#999}
        @media print{body{padding:16px}}
      </style>
    </head><body>
      <div class="hdr"><h1>HOUSE OF TAILORS</h1><p>Workshop Order QR Code</p></div>
      <div class="qr-wrap"><img src="${dataUrl}" width="200" height="200" /></div>
      <div class="order-num">${orderNumber}</div>
      <div class="info">${customerName}</div>
      <div class="info">${garmentType}</div>
      <div class="uid">ID: ${orderId}</div>
      <div class="sig">
        <div class="sl"><div class="line">Received By</div></div>
        <div class="sl"><div class="line">Tailor / Manager</div></div>
      </div>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `QR-${orderNumber}.png`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#D4AF37]" />
            Order QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-5 py-2">
          {/* QR image */}
          <div className="p-4 rounded-xl border border-border bg-white shadow-sm flex items-center justify-center min-h-[192px]">
            {dataUrl ? (
              <img
                src={dataUrl}
                alt={`QR Code for ${orderNumber}`}
                width={160}
                height={160}
                className="block"
              />
            ) : (
              <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {/* Order info */}
          <div className="text-center space-y-1 w-full">
            <p className="text-xl font-bold text-[#D4AF37] tracking-widest">{orderNumber}</p>
            <p className="text-sm font-semibold">{customerName}</p>
            <p className="text-xs text-muted-foreground">{garmentType}</p>
            <p className="text-[9px] text-muted-foreground/50 font-mono mt-3 break-all px-2">
              {orderId}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!dataUrl}
              className="flex-1 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={handlePrint}
              disabled={!dataUrl}
              className="flex-1 gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

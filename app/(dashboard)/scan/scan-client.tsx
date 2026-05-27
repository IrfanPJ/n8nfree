"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ScanLine, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { POSITION_STAGE_MAP, STATUS_LABELS } from "@/lib/scan-config";
import type { OrderStatus } from "@/types";

interface ScanClientProps {
  userPosition: string | null;
  userName: string;
  userRole: string;
}

export function ScanClient({ userPosition, userName, userRole }: ScanClientProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const allowedStages: OrderStatus[] =
    userRole === "ADMIN"
      ? []
      : userPosition
      ? (POSITION_STAGE_MAP[userPosition] ?? [])
      : [];

  // Auto-focus the input for USB scanner
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const raw = value.trim();
    if (!raw) return;

    // Extract order ID from full URL or raw UUID
    let orderId = raw;
    if (raw.includes("/scan/")) {
      orderId = raw.split("/scan/").pop()?.split("?")[0] ?? raw;
    } else if (raw.startsWith("http")) {
      // Unknown URL format
      setError("Unrecognised QR code format");
      return;
    }

    router.push(`/scan/${orderId}`);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mx-auto">
          <ScanLine className="w-8 h-8 text-[#D4AF37]" />
        </div>
        <h1 className="text-2xl font-bold">QR Scanner</h1>
        <p className="text-sm text-muted-foreground">
          {userName}
          {userPosition && (
            <span className="text-[#D4AF37]"> · {userPosition.replace(/_/g, " ")}</span>
          )}
        </p>
      </div>

      {/* Your stages */}
      {allowedStages.length > 0 && (
        <div className="rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-4">
          <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider mb-2">
            Your assigned stages
          </p>
          <div className="flex flex-wrap gap-2">
            {allowedStages.map((s) => (
              <span key={s} className="text-xs bg-[#D4AF37]/15 text-[#D4AF37] px-2 py-1 rounded-full font-medium">
                {STATUS_LABELS[s]}
              </span>
            ))}
          </div>
        </div>
      )}

      {userRole === "ADMIN" && (
        <div className="rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-3 text-xs text-[#D4AF37] text-center font-medium">
          Admin — can set any stage
        </div>
      )}

      {/* Scan input */}
      <div className="space-y-3">
        <p className="text-sm font-semibold">
          Scan or enter Order ID
        </p>
        <p className="text-xs text-muted-foreground">
          Point your phone camera at any order QR code — it will open this app automatically.
          Or use a USB QR scanner / paste an order ID below.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste order ID or scan URL..."
            className={cn(error && "border-destructive")}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <Button type="submit" variant="gold" disabled={!value.trim()} className="gap-1.5 shrink-0">
            Go <ArrowRight className="w-4 h-4" />
          </Button>
        </form>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {/* Instructions */}
      <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">How to scan</p>
        <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
          <li>Open the camera app on any phone</li>
          <li>Point it at the printed order QR code</li>
          <li>Tap the notification — it opens this app</li>
          <li>Select the new stage and confirm</li>
        </ol>
      </div>
    </div>
  );
}

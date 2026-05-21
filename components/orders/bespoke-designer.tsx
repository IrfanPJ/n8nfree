"use client";

import React, { useState } from "react";
import { X, Printer, Save, Sparkles, Check } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────
type LapelStyle = "notch" | "peak" | "shawl";
type FitStyle = "slim" | "regular" | "classic";
type VentStyle = "no-vent" | "single-vent" | "double-vent";
type ButtonCount = 1 | 2 | 3;
type PocketStyle = "jetted" | "flap" | "patch";
type SleeveButtons = 1 | 2 | 3 | 4;
type ButtonMaterial = "horn" | "pearl" | "gold" | "black";
type CollarType = "cutaway" | "spread" | "button-down";
type LiningColor = "navy" | "burgundy" | "gold" | "black" | "grey" | "ivory";
type TieAccessory = "tie" | "bow-tie" | "plastron" | "open-collar";

export interface SuitDesign {
  lapel: LapelStyle;
  fit: FitStyle;
  vent: VentStyle;
  buttons: ButtonCount;
  pocket: PocketStyle;
  sleeveButtons: SleeveButtons;
  buttonMaterial: ButtonMaterial;
  collar: CollarType;
  lining: LiningColor;
  workingButtonholes: boolean;
  ticketPocket: boolean;
  surgeonsCuff: boolean;
  fullSilkLining: boolean;
  personalMonogram: boolean;
  monogramText: string;
  tie: TieAccessory;
}

const DEFAULT_DESIGN: SuitDesign = {
  lapel: "notch",
  fit: "slim",
  vent: "double-vent",
  buttons: 2,
  pocket: "jetted",
  sleeveButtons: 4,
  buttonMaterial: "horn",
  collar: "spread",
  lining: "burgundy",
  workingButtonholes: true,
  ticketPocket: false,
  surgeonsCuff: true,
  fullSilkLining: true,
  personalMonogram: false,
  monogramText: "",
  tie: "tie",
};

const LINING_COLORS: Record<LiningColor, string> = {
  navy: "#1e3a5f",
  burgundy: "#722F37",
  gold: "#D4AF37",
  black: "#1a1a1a",
  grey: "#6B7280",
  ivory: "#F5F5DC",
};

const BUTTON_COLORS: Record<ButtonMaterial, string> = {
  horn: "#8B7355",
  pearl: "#F0EAD6",
  gold: "#D4AF37",
  black: "#2a2a2a",
};

export function buildSpecText(d: SuitDesign): string {
  const parts = [
    `Lapel: ${d.lapel}`,
    `Fit: ${d.fit} · ${d.vent.replace("-", " ")}`,
    `${d.buttons}btn · ${d.fit} fit · ${d.vent.replace("-", " ")}`,
    `Pockets: ${d.pocket}`,
    `${d.sleeveButtons} sleeve btn · ${d.pocket} pocket`,
    `Buttons: ${d.buttonMaterial}`,
    `Collar: ${d.collar}`,
    `Lining: ${d.lining}`,
    d.workingButtonholes ? "Working buttonholes" : "",
    d.ticketPocket ? "Ticket pocket" : "",
    d.surgeonsCuff ? "Surgeon's cuff" : "",
    d.fullSilkLining ? "Silk lining" : "",
    d.personalMonogram && d.monogramText ? `Monogram: ${d.monogramText}` : "",
    `Tie: ${d.tie.replace("-", " ")}`,
  ];
  return parts.filter(Boolean).join(" · ");
}

// ── Suit SVG Preview ──────────────────────────────────────────
function SuitPreview({ design }: { design: SuitDesign }) {
  const liningHex = LINING_COLORS[design.lining];
  const buttonHex = BUTTON_COLORS[design.buttonMaterial];
  const btnCount = design.buttons;

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <svg viewBox="0 0 220 300" className="w-48 h-64" xmlns="http://www.w3.org/2000/svg">
        {/* Jacket body */}
        <path d="M30 80 L20 300 L200 300 L190 80 L155 60 L110 120 L65 60 Z" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
        {/* Left lapel */}
        {design.lapel === "notch" && (
          <path d="M110 120 L65 60 L80 80 L100 130 Z" fill="#2a2a2a" stroke="#444" strokeWidth="0.5" />
        )}
        {design.lapel === "peak" && (
          <path d="M110 120 L65 60 L55 90 L100 130 Z" fill="#2a2a2a" stroke="#444" strokeWidth="0.5" />
        )}
        {design.lapel === "shawl" && (
          <path d="M110 120 Q85 85 65 60 Q80 100 100 130 Z" fill="#2a2a2a" stroke="#444" strokeWidth="0.5" />
        )}
        {/* Right lapel */}
        {design.lapel === "notch" && (
          <path d="M110 120 L155 60 L140 80 L120 130 Z" fill="#2a2a2a" stroke="#444" strokeWidth="0.5" />
        )}
        {design.lapel === "peak" && (
          <path d="M110 120 L155 60 L165 90 L120 130 Z" fill="#2a2a2a" stroke="#444" strokeWidth="0.5" />
        )}
        {design.lapel === "shawl" && (
          <path d="M110 120 Q135 85 155 60 Q140 100 120 130 Z" fill="#2a2a2a" stroke="#444" strokeWidth="0.5" />
        )}
        {/* Shirt / tie area */}
        <rect x="100" y="100" width="20" height="120" rx="2" fill="#f5f5f5" opacity="0.9" />
        {/* Tie */}
        {design.tie === "tie" && (
          <polygon points="110,110 105,130 108,200 110,210 112,200 115,130" fill="#8B0000" opacity="0.85" />
        )}
        {design.tie === "bow-tie" && (
          <g transform="translate(110,120)">
            <polygon points="-12,-4 -4,0 -12,4" fill="#8B0000" opacity="0.85" />
            <polygon points="12,-4 4,0 12,4" fill="#8B0000" opacity="0.85" />
            <circle cx="0" cy="0" r="4" fill="#8B0000" opacity="0.85" />
          </g>
        )}
        {/* Buttons */}
        {Array.from({ length: btnCount }).map((_, i) => {
          const y = 155 + i * 20;
          return (
            <circle
              key={i}
              cx="110"
              cy={y}
              r="5"
              fill={buttonHex}
              stroke="#111"
              strokeWidth="0.5"
              opacity="0.9"
            />
          );
        })}
        {/* Chest pocket */}
        <rect x="130" y="120" width="18" height="4" rx="1" fill={liningHex} opacity="0.7" />
        {/* Pocket (jetted/flap/patch) */}
        {design.pocket === "jetted" && (
          <>
            <rect x="60" y="185" width="28" height="3" rx="1" fill="#333" stroke="#555" strokeWidth="0.5" />
            <rect x="135" y="185" width="28" height="3" rx="1" fill="#333" stroke="#555" strokeWidth="0.5" />
          </>
        )}
        {design.pocket === "flap" && (
          <>
            <rect x="58" y="183" width="30" height="9" rx="2" fill="#252525" stroke="#444" strokeWidth="0.5" />
            <rect x="133" y="183" width="30" height="9" rx="2" fill="#252525" stroke="#444" strokeWidth="0.5" />
          </>
        )}
        {design.pocket === "patch" && (
          <>
            <rect x="58" y="178" width="30" height="20" rx="3" fill="#252525" stroke="#444" strokeWidth="0.5" />
            <rect x="133" y="178" width="30" height="20" rx="3" fill="#252525" stroke="#444" strokeWidth="0.5" />
          </>
        )}
        {/* Sleeve buttons */}
        {Array.from({ length: design.sleeveButtons }).map((_, i) => (
          <circle key={`sl-${i}`} cx={32 + i * 6} cy={250} r="2.5" fill={buttonHex} stroke="#111" strokeWidth="0.3" opacity="0.8" />
        ))}
        {Array.from({ length: design.sleeveButtons }).map((_, i) => (
          <circle key={`sr-${i}`} cx={170 + i * 6} cy={250} r="2.5" fill={buttonHex} stroke="#111" strokeWidth="0.3" opacity="0.8" />
        ))}
        {/* Lining color strip at hem */}
        <rect x="22" y="290" width="176" height="8" rx="0" fill={liningHex} opacity="0.6" />
      </svg>

      {/* Lining swatch */}
      <div
        className="absolute bottom-3 right-3 w-8 h-8 rounded-full border-2 border-white/20 shadow-lg"
        style={{ backgroundColor: liningHex }}
        title={`Lining: ${design.lining}`}
      />
    </div>
  );
}

// ── Option Card ───────────────────────────────────────────────
function OptionCard({
  label, selected, color, onClick,
}: { label: string; selected: boolean; color?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all",
        selected
          ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]"
          : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-border hover:text-foreground"
      )}
    >
      {color && (
        <div
          className="w-8 h-8 rounded-full border border-white/20 shadow"
          style={{ backgroundColor: color }}
        />
      )}
      {!color && (
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-base",
          selected ? "bg-[#D4AF37]/20" : "bg-secondary"
        )}>
          {selected ? <Check className="w-4 h-4" /> : null}
        </div>
      )}
      <span className="text-[10px] font-medium leading-none">{label}</span>
      {selected && (
        <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-[#D4AF37] flex items-center justify-center">
          <Check className="w-2 h-2 text-black" />
        </div>
      )}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 mt-4 first:mt-0">
      {children}
    </p>
  );
}

// ── Main Component ────────────────────────────────────────────
interface BespokeDesignerProps {
  open: boolean;
  onClose: () => void;
  orderId?: string;
  orderNumber?: string;
  onSave?: (design: SuitDesign, specText: string) => Promise<void>;
}

export function BespokeDesigner({ open, onClose, orderId, orderNumber, onSave }: BespokeDesignerProps) {
  const [design, setDesign] = useState<SuitDesign>(DEFAULT_DESIGN);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof SuitDesign>(key: K, val: SuitDesign[K]) =>
    setDesign((d) => ({ ...d, [key]: val }));

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(design, buildSpecText(design));
      toast.success("Design saved to order");
      onClose();
    } catch {
      toast.error("Failed to save design");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=700,height=900");
    if (!win) return;
    const specLines = [
      `Lapel: ${design.lapel}`,
      `Fit: ${design.fit} | Vent: ${design.vent.replace(/-/g, " ")}`,
      `Front Buttons: ${design.buttons}`,
      `Pocket Style: ${design.pocket}`,
      `Sleeve Buttons: ${design.sleeveButtons}`,
      `Button Material: ${design.buttonMaterial}`,
      `Collar: ${design.collar}`,
      `Lining: ${design.lining}`,
      `Working Buttonholes: ${design.workingButtonholes ? "Yes" : "No"}`,
      `Ticket Pocket: ${design.ticketPocket ? "Yes" : "No"}`,
      `Surgeon's Cuff: ${design.surgeonsCuff ? "Yes" : "No"}`,
      `Full Silk Lining: ${design.fullSilkLining ? "Yes" : "No"}`,
      `Personal Monogram: ${design.personalMonogram ? design.monogramText || "Yes" : "No"}`,
      `Tie / Accessory: ${design.tie.replace(/-/g, " ")}`,
    ];
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Bespoke Spec Sheet${orderNumber ? ` — ${orderNumber}` : ""}</title>
      <style>
        body { font-family: 'Georgia', serif; margin: 40px; color: #111; }
        h1 { font-size: 28px; letter-spacing: 4px; color: #D4AF37; border-bottom: 2px solid #D4AF37; padding-bottom: 12px; }
        h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 2px; color: #666; margin: 24px 0 8px; }
        .spec-line { display: flex; justify-content: space-between; font-size: 14px; padding: 6px 0; border-bottom: 1px solid #eee; }
        .label { color: #888; }
        .value { font-weight: 600; text-transform: capitalize; }
        .lining-swatch { display: inline-block; width: 14px; height: 14px; border-radius: 50%; border: 1px solid #ccc; vertical-align: middle; margin-right: 6px; background: ${LINING_COLORS[design.lining]}; }
      </style>
    </head><body>
      <h1>HOUSE OF TAILORS</h1>
      <h2>Bespoke Suit Specification Sheet${orderNumber ? ` · ${orderNumber}` : ""}</h2>
      ${specLines.map(l => {
        const [k, v] = l.split(": ");
        return `<div class="spec-line"><span class="label">${k}</span><span class="value">${k === "Lining" ? `<span class="lining-swatch"></span>${v}` : v}</span></div>`;
      }).join("")}
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span className="font-bold text-sm tracking-wide">Bespoke Suit Designer</span>
            {orderNumber && <span className="text-xs text-muted-foreground ml-1">· {orderNumber}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
              <Printer className="w-3.5 h-3.5" /> Spec Sheet
            </Button>
            {onSave && (
              <Button variant="gold" size="sm" onClick={handleSave} loading={saving} className="gap-1.5 text-xs">
                <Save className="w-3.5 h-3.5" /> Save to Order
              </Button>
            )}
            <button type="button" onClick={onClose} className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left — Live Preview */}
          <div className="w-72 flex-shrink-0 bg-[#0d0d0d] flex flex-col overflow-hidden">
            <div className="flex-1 flex items-center justify-center p-4">
              <SuitPreview design={design} />
            </div>
            {/* Spec summary */}
            <div className="p-4 border-t border-white/10 space-y-1">
              <p className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest mb-2">Live Preview</p>
              <p className="text-[11px] text-white/70 capitalize">{design.lapel} lapel · {design.fit} fit · {design.vent.replace(/-/g, " ")}</p>
              <p className="text-[11px] text-white/70 capitalize">{design.buttons}btn · {design.pocket} pocket</p>
              <p className="text-[11px] text-white/70 capitalize">{design.sleeveButtons} sleeve btn · {design.buttonMaterial} buttons</p>
              <p className="text-[11px] text-white/70 capitalize">{design.collar} collar</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: LINING_COLORS[design.lining] }} />
                <span className="text-[11px] text-white/70 capitalize">{design.lining} lining</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {design.workingButtonholes && <span className="text-[9px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded">Buttonholes</span>}
                {design.surgeonsCuff && <span className="text-[9px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded">Surgeon's cuff</span>}
                {design.fullSilkLining && <span className="text-[9px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded">Silk lining</span>}
                {design.personalMonogram && <span className="text-[9px] bg-[#D4AF37]/20 text-[#D4AF37] px-1.5 py-0.5 rounded">{design.monogramText || "Monogram"}</span>}
              </div>
            </div>
          </div>

          {/* Right — Options */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* SUIT STYLE */}
            <SectionTitle>Suit Style</SectionTitle>
            <div className="grid grid-cols-3 gap-2 mb-1">
              {(["notch", "peak", "shawl"] as LapelStyle[]).map((l) => (
                <OptionCard key={l} label={`${l} lapel`} selected={design.lapel === l} onClick={() => set("lapel", l)} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-1">
              {(["slim", "regular", "classic"] as FitStyle[]).map((f) => (
                <OptionCard key={f} label={`${f} fit`} selected={design.fit === f} onClick={() => set("fit", f)} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["no-vent", "single-vent", "double-vent"] as VentStyle[]).map((v) => (
                <OptionCard key={v} label={v.replace(/-/g, " ")} selected={design.vent === v} onClick={() => set("vent", v)} />
              ))}
            </div>

            {/* FRONT */}
            <SectionTitle>Front Buttons</SectionTitle>
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 3] as ButtonCount[]).map((n) => (
                <OptionCard key={n} label={`${n} Button`} selected={design.buttons === n} onClick={() => set("buttons", n)} />
              ))}
            </div>

            <SectionTitle>Pocket Style</SectionTitle>
            <div className="grid grid-cols-3 gap-2">
              {(["jetted", "flap", "patch"] as PocketStyle[]).map((p) => (
                <OptionCard key={p} label={p} selected={design.pocket === p} onClick={() => set("pocket", p)} />
              ))}
            </div>

            {/* SLEEVE BUTTONS */}
            <SectionTitle>Sleeve Buttons</SectionTitle>
            <div className="grid grid-cols-4 gap-2">
              {([1, 2, 3, 4] as SleeveButtons[]).map((n) => (
                <OptionCard key={n} label={`${n} Button${n > 1 ? "s" : ""}`} selected={design.sleeveButtons === n} onClick={() => set("sleeveButtons", n)} />
              ))}
            </div>

            {/* BUTTON MATERIAL */}
            <SectionTitle>Button Material</SectionTitle>
            <div className="grid grid-cols-4 gap-2">
              {(["horn", "pearl", "gold", "black"] as ButtonMaterial[]).map((m) => (
                <OptionCard key={m} label={m === "pearl" ? "Mother of Pearl" : m} selected={design.buttonMaterial === m} color={BUTTON_COLORS[m]} onClick={() => set("buttonMaterial", m)} />
              ))}
            </div>

            {/* SHIRT COLLAR */}
            <SectionTitle>Shirt Collar</SectionTitle>
            <div className="grid grid-cols-3 gap-2">
              {(["cutaway", "spread", "button-down"] as CollarType[]).map((c) => (
                <OptionCard key={c} label={c.replace(/-/g, " ")} selected={design.collar === c} onClick={() => set("collar", c)} />
              ))}
            </div>

            {/* LINING COLOUR */}
            <SectionTitle>Lining Colour</SectionTitle>
            <div className="grid grid-cols-6 gap-2">
              {(Object.entries(LINING_COLORS) as [LiningColor, string][]).map(([name, hex]) => (
                <OptionCard key={name} label={name} selected={design.lining === name} color={hex} onClick={() => set("lining", name)} />
              ))}
            </div>

            {/* TIE / ACCESSORY */}
            <SectionTitle>Tie / Accessory</SectionTitle>
            <div className="grid grid-cols-4 gap-2">
              {(["tie", "bow-tie", "plastron", "open-collar"] as TieAccessory[]).map((t) => (
                <OptionCard key={t} label={t.replace(/-/g, " ")} selected={design.tie === t} onClick={() => set("tie", t)} />
              ))}
            </div>

            {/* EXTRAS */}
            <SectionTitle>Extras</SectionTitle>
            <div className="space-y-2">
              {(
                [
                  { key: "workingButtonholes" as const, label: "Working buttonholes" },
                  { key: "ticketPocket" as const, label: "Ticket pocket" },
                  { key: "surgeonsCuff" as const, label: "Surgeon's cuff" },
                  { key: "fullSilkLining" as const, label: "Full silk lining" },
                  { key: "personalMonogram" as const, label: "Personal monogram" },
                ]
              ).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-secondary/20 cursor-pointer hover:border-border transition-colors">
                  <input
                    type="checkbox"
                    checked={design[key] as boolean}
                    onChange={(e) => set(key, e.target.checked as any)}
                    className="w-4 h-4 accent-[#D4AF37]"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
              {design.personalMonogram && (
                <Input
                  placeholder="Enter monogram initials (e.g. AKS)"
                  value={design.monogramText}
                  onChange={(e) => set("monogramText", e.target.value)}
                  className="h-9 text-sm mt-1"
                  maxLength={4}
                />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

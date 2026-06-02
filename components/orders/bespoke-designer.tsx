"use client";

import React, { useState } from "react";
import { X, Printer, Save, Sparkles, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────

interface JacketDesign {
  sizePattern: string;
  buttonsCode: string;
  jacketType: string;
  noOfButtons: string;
  frontPockets: string;
  lapel: string;
  lapelPinHole: string;
  backVent: string;
  insideFashion: string;
  insidePockets: string;
  extraPocket: string;
  sleeveButtons: string;
  pickStitch: string;
  others: string;
  comments: string;
}

interface ShirtDesign {
  sizePattern: string;
  buttonsCode: string;
  shirtFit: string;
  collarStyle: string;
  frontPockets: string;
  frontPlacket: string;
  backDart: string;
  cuffStyle: string;
  nameEmbroidery: string;
  embroideryPosition: string;
  cuffSize: string;
  collarPointSize: string;
  collarStandSize: string;
  collarSize: string;
  comments: string;
}

interface TrouserDesign {
  sizePattern: string;
  buttonsCode: string;
  fit: string;
  frontPleats: string;
  backPockets: string;
  backPocketsType: string;
  insideLining: string;
  loops: string;
  sideAdjuster: string;
  frontPocket: string;
  bottomStyle: string;
  buttonHook: string;
  coinPocket: string;
  waistSize: string;
  fullLength: string;
  comments: string;
}

export interface GarmentDesign {
  jacket: JacketDesign;
  shirt: ShirtDesign;
  trouser: TrouserDesign;
}

// ── Defaults ───────────────────────────────────────────────────

const DEFAULT_JACKET: JacketDesign = {
  sizePattern: "", buttonsCode: "", jacketType: "", noOfButtons: "",
  frontPockets: "", lapel: "", lapelPinHole: "", backVent: "",
  insideFashion: "", insidePockets: "", extraPocket: "", sleeveButtons: "",
  pickStitch: "", others: "", comments: "",
};

const DEFAULT_SHIRT: ShirtDesign = {
  sizePattern: "", buttonsCode: "", shirtFit: "", collarStyle: "",
  frontPockets: "", frontPlacket: "", backDart: "", cuffStyle: "",
  nameEmbroidery: "", embroideryPosition: "", cuffSize: "",
  collarPointSize: "", collarStandSize: "", collarSize: "", comments: "",
};

const DEFAULT_TROUSER: TrouserDesign = {
  sizePattern: "", buttonsCode: "", fit: "", frontPleats: "",
  backPockets: "", backPocketsType: "", insideLining: "", loops: "",
  sideAdjuster: "", frontPocket: "", bottomStyle: "", buttonHook: "",
  coinPocket: "", waistSize: "", fullLength: "", comments: "",
};

// ── buildSpecText ──────────────────────────────────────────────

export function buildSpecText(d: GarmentDesign): string {
  const j = d.jacket;
  const s = d.shirt;
  const t = d.trouser;
  const parts: string[] = [];

  if (j.jacketType) parts.push(`[Jacket] ${j.jacketType}`);
  if (j.lapel) parts.push(`Lapel: ${j.lapel}`);
  if (j.noOfButtons) parts.push(`${j.noOfButtons} btn`);
  if (j.backVent) parts.push(j.backVent);
  if (j.sleeveButtons) parts.push(`Sleeve: ${j.sleeveButtons}`);
  if (j.frontPockets) parts.push(`Pkt: ${j.frontPockets}`);
  if (j.insidePockets) parts.push(`Inside: ${j.insidePockets}`);
  if (j.pickStitch) parts.push(`Pick: ${j.pickStitch}`);
  if (j.comments) parts.push(`Note: ${j.comments}`);

  if (s.shirtFit) parts.push(`[Shirt] ${s.shirtFit}`);
  if (s.collarStyle) parts.push(`Collar: ${s.collarStyle}`);
  if (s.cuffStyle) parts.push(`Cuff: ${s.cuffStyle}`);
  if (s.frontPlacket) parts.push(s.frontPlacket);
  if (s.backDart) parts.push(`Back: ${s.backDart}`);
  if (s.nameEmbroidery === "yes") parts.push(`Embroidery: ${s.embroideryPosition || "yes"}`);
  if (s.collarSize) parts.push(`Collar size: ${s.collarSize}`);

  if (t.fit) parts.push(`[Trouser] ${t.fit}`);
  if (t.frontPleats) parts.push(t.frontPleats);
  if (t.insideLining) parts.push(t.insideLining);
  if (t.bottomStyle) parts.push(t.bottomStyle);
  if (t.waistSize) parts.push(`W: ${t.waistSize}`);
  if (t.fullLength) parts.push(`L: ${t.fullLength}`);

  return parts.join(" · ");
}

// ── Print — exact PDF form layout ─────────────────────────────

function printSpec(
  design: GarmentDesign,
  orderNumber?: string,
  order?: { customerName?: string; deliveryDate?: string; trialDate?: string; qty?: number; gender?: string }
) {
  const win = window.open("", "_blank", "width=1100,height=1400");
  if (!win) return;
  const logoUrl = window.location.origin + "/1080_HT_BLACK.png";
  const j = design.jacket;
  const s = design.shirt;
  const t = design.trouser;

  const fmt = (iso?: string) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleDateString("en-AE", { day: "2-digit", month: "2-digit", year: "numeric" }); }
    catch { return iso; }
  };

  // Checkbox: small square, filled if selected
  const cb = (label: string, selected: boolean) =>
    `<div class="opt"><span class="sq${selected ? " chk" : ""}"></span>${label}</div>`;

  // Render a column of options
  const col = (options: string[], val: string) =>
    options.map((o) => cb(o, o === val)).join("");

  // Size pattern row (inline checkboxes)
  const spCbs = (val: string) =>
    ["Create New", "Use Existing", "Use Sample", "Not Required"]
      .map((o) => `<span class="sp-opt"><span class="sq${o === val ? " chk" : ""}"></span>${o.toUpperCase()}</span>`)
      .join("");

  // Section header block (same for all 3 garment types)
  const sectionHeader = (title: string, spVal: string, btnCode: string, fabricLabel: string, liningSwatch: boolean) => `
    <table class="form-table" cellpadding="0" cellspacing="0">
      <tr>
        <td colspan="12" class="sec-title-cell">
          <span class="sec-title">${title}</span>
          <span class="order-no">No. ${orderNumber ?? "A0001"}</span>
        </td>
      </tr>
      <tr>
        <td class="lbl-cell" width="50">DATE:</td>
        <td class="val-cell" width="100">${fmt(new Date().toISOString())}</td>
        <td class="lbl-cell" width="80">SIZE PATTERN:</td>
        <td class="sp-cell" colspan="4">${spCbs(spVal)}</td>
        <td class="lbl-cell" width="70">ORDER NO.</td>
        <td class="val-cell" width="120">${orderNumber ?? ""}</td>
        <td class="lbl-cell" colspan="2">TRIAL DATE:</td>
        <td class="val-cell">${fmt(order?.trialDate)}</td>
      </tr>
      <tr>
        <td class="lbl-cell">NAME:</td>
        <td class="val-cell" colspan="5">${order?.customerName ?? ""}</td>
        <td class="lbl-cell">M.FORM.NO.</td>
        <td class="val-cell" colspan="2"></td>
        <td class="lbl-cell" colspan="2">DELIVERY DATE:</td>
        <td class="val-cell">${fmt(order?.deliveryDate)}</td>
      </tr>
      <tr>
        <td class="lbl-cell">GENDER:</td>
        <td class="val-cell" colspan="2">${order?.gender ?? ""}</td>
        <td class="lbl-cell" colspan="2">${fabricLabel}</td>
        <td class="val-cell"></td>
        ${liningSwatch ? `<td class="lbl-cell">LINING SWATCH</td><td class="val-cell"></td>` : `<td colspan="2"></td>`}
        <td class="lbl-cell" colspan="2">BUTTONS CODE</td>
        <td class="val-cell">${btnCode}</td>
      </tr>
      <tr>
        <td class="lbl-cell">QTY:</td>
        <td class="val-cell" colspan="11">${order?.qty ?? ""}</td>
      </tr>
      <tr><td colspan="12" class="styling-header">STYLING</td></tr>
    </table>`;

  // ── JACKET styling table
  const jacketStyling = () => {
    const cols = [
      { hdr: "JACKET",           opts: ["Single Breasted","Double Breasted","Band Gala","Bundy"],           val: j.jacketType },
      { hdr: "NO. OF BUTTONS",   opts: ["1 Button","2 Buttons","3 Buttons","6 Buttons"],                    val: j.noOfButtons },
      { hdr: "FRONT POCKETS",    opts: ["Straight","Slanting","With Ticket"],                               val: j.frontPockets },
      { hdr: "LAPEL",            opts: ["Notch","Peak","Shawl"],                                            val: j.lapel },
      { hdr: "LAPEL PIN HOLE",   opts: ["Show","With Hole","None"],                                         val: j.lapelPinHole },
      { hdr: "BACK VENT OPEN",   opts: ["Side Vent","Center Vent","No Vent"],                               val: j.backVent },
      { hdr: "INSIDE FASHION",   opts: ["Straight","Takurdwara","Piping"],                                  val: j.insideFashion },
      { hdr: "INSIDE POCKETS",   opts: ["2 Pocket","3 Pockets","4 Pockets","No Pocket"],                   val: j.insidePockets },
      { hdr: "EXTRA POCKET",     opts: ["Pen Pocket","Passport","None"],                                    val: j.extraPocket },
      { hdr: "SLEEVE BUTTONS",   opts: ["3 Buttons","4 Buttons","5 Buttons"],                               val: j.sleeveButtons },
      { hdr: "PICK STITCH",      opts: ["Full Pick","Lapel Pick","None"],                                   val: j.pickStitch },
      { hdr: "OTHERS",           opts: [],                                                                   val: j.others },
    ];
    return stylingTable(cols);
  };

  // ── SHIRT styling table
  const shirtStyling = () => {
    const embCell = `
      ${cb("Yes", s.nameEmbroidery === "Yes")}
      ${cb("No", s.nameEmbroidery === "No")}
      ${cb("Left", s.embroideryPosition === "Left")}
      ${cb("Right", s.embroideryPosition === "Right")}`;
    const collarCell = `
      <div class="sub-lbl">POINT SIZE</div><div class="val-input">${s.collarPointSize}</div>
      <div class="sub-lbl">STAND SIZE</div><div class="val-input">${s.collarStandSize}</div>`;
    const cols = [
      { hdr: "SHIRT FIT",           opts: ["Comfort","Slim"],                                          val: s.shirtFit },
      { hdr: "COLLAR STYLE",        opts: ["Regular","Semi Cut Way","Full Cut Way","Tux Wing"],        val: s.collarStyle },
      { hdr: "FRONT POCKETS",       opts: ["Single","Double","No Pocket"],                             val: s.frontPockets },
      { hdr: "FRONT PLACKET",       opts: ["With Placket","Invisible Buttons","No Placket","Tux Pleats"], val: s.frontPlacket },
      { hdr: "BACK DART",           opts: ["Dart","Center Box","Side Pleats","None"],                  val: s.backDart },
      { hdr: "CUFF STYLE",          opts: ["One Button","Two Button","French Cuff"],                   val: s.cuffStyle },
      { hdr: "NAME EMBROIDERY",     opts: [],                                                          val: "", custom: embCell },
      { hdr: "CUFF SIZE",           opts: ["Left","Right","Regular"],                                  val: s.cuffSize },
      { hdr: "COLLAR STAND & POINT",opts: [],                                                          val: "", custom: collarCell },
      { hdr: "COLLAR SIZE",         opts: [],                                                          val: s.collarSize, custom: `<div class="val-input large">${s.collarSize}</div>` },
    ];
    return stylingTable(cols);
  };

  // ── TROUSER styling table
  const trouserStyling = () => {
    const waistCell = `<div class="sub-lbl">WAIST SIZE</div><div class="val-input">${t.waistSize}</div>
      <div class="sub-lbl">FULL LENGTH</div><div class="val-input">${t.fullLength}</div>`;
    const cols = [
      { hdr: "FIT",           opts: ["Comfort","Slim","Straight","Loose Fit"],                    val: t.fit },
      { hdr: "FRONT PLEATS",  opts: ["1 Pleat","2 Pleats","No Pleats","Front Darts"],             val: t.frontPleats },
      { hdr: "BACK POCKETS",  opts: ["1 Pocket","2 Pockets","No Pockets"],                        val: t.backPockets },
      { hdr: "BACK POCKETS",  opts: ["Pocket Flap","Button Loop","Kaaj"],                         val: t.backPocketsType },
      { hdr: "INSIDE LINING", opts: ["Half Lining","Full Lining","No Lining"],                    val: t.insideLining },
      { hdr: "LOOPS",         opts: ["8 Loops","6 Loops","No Loops"],                             val: t.loops },
      { hdr: "SIDE ADJUSTER", opts: ["Yes","No","Back Elastic","Side Invisible Elastic"],         val: t.sideAdjuster },
      { hdr: "FRONT POCKET",  opts: ["Cross","Straight","Jeans Style","No Pockets"],              val: t.frontPocket },
      { hdr: "BOTTOM STYLE",  opts: ["Cuff Fold","Normal Hemming","Fold & Stitch"],               val: t.bottomStyle },
      { hdr: "BUTTON / HOOK", opts: ["Long Belt","Hook","Button","Double Button 2\" Belt"],       val: t.buttonHook },
      { hdr: "COIN POCKET",   opts: ["Inside Belt","Inside Right Pocket","None"],                 val: t.coinPocket },
      { hdr: "",              opts: [],                                                            val: "", custom: waistCell },
    ];
    return stylingTable(cols);
  };

  type ColDef = { hdr: string; opts: string[]; val: string; custom?: string };
  function stylingTable(cols: ColDef[]) {
    const maxRows = Math.max(...cols.map((c) => c.opts.length), 1);
    return `<table class="style-table" cellpadding="0" cellspacing="0">
      <tr class="col-hdr-row">
        ${cols.map((c) => `<th class="col-hdr">${c.hdr}</th>`).join("")}
      </tr>
      ${Array.from({ length: maxRows }, (_, r) => `
        <tr>
          ${cols.map((c) => {
            if (c.custom && r === 0) return `<td class="opt-cell" rowspan="${maxRows}">${c.custom}</td>`;
            if (c.custom) return "";
            const opt = c.opts[r];
            return `<td class="opt-cell">${opt ? cb(opt, opt === c.val) : ""}</td>`;
          }).join("")}
        </tr>`
      ).join("")}
    </table>`;
  }

  const comments = (text: string) =>
    `<div class="comments-row"><span class="lbl-cell" style="width:100px">MORE COMMENTS</span><span class="comments-val">${text}</span></div>`;

  const logo = `<div class="logo-row"><img src="${logoUrl}" style="height:32px;object-fit:contain" alt="House of Tailors"></div>`;

  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:8px;color:#111;background:#fff;padding:8px}
    .section-wrap{border:1px solid #999;margin-bottom:12px;page-break-inside:avoid}
    .form-table{width:100%;border-collapse:collapse}
    .form-table td,.form-table th{border:1px solid #bbb;padding:2px 4px;font-size:8px}
    .sec-title-cell{background:#e8e8e8;padding:3px 6px;position:relative}
    .sec-title{font-weight:bold;font-size:9px;letter-spacing:.5px}
    .order-no{position:absolute;right:6px;top:3px;font-weight:bold;color:#c00;font-size:9px}
    .lbl-cell{font-weight:bold;font-size:7px;color:#444;white-space:nowrap;background:#f5f5f5}
    .val-cell{font-size:8px}
    .sp-cell{padding:2px 4px}
    .sp-opt{display:inline-flex;align-items:center;gap:2px;margin-right:8px;font-size:7px;font-weight:bold}
    .styling-header{text-align:center;font-weight:bold;font-size:8px;letter-spacing:1px;background:#f0f0f0;padding:3px}
    .style-table{width:100%;border-collapse:collapse}
    .style-table td,.style-table th{border:1px solid #bbb;padding:2px 3px;vertical-align:top}
    .col-hdr-row{background:#e8e8e8}
    .col-hdr{font-size:6.5px;font-weight:bold;text-align:center;letter-spacing:.3px;padding:2px 3px}
    .opt{display:flex;align-items:center;gap:2px;font-size:7px;font-weight:600;text-transform:uppercase;white-space:nowrap;margin-bottom:2px}
    .opt-cell{padding:2px 3px;vertical-align:top}
    .sq{display:inline-block;width:8px;height:8px;border:1px solid #555;flex-shrink:0;background:#fff}
    .sq.chk{background:#222;position:relative}
    .sq.chk::after{content:"✓";color:#fff;font-size:6px;line-height:8px;display:block;text-align:center}
    .sub-lbl{font-size:6.5px;font-weight:bold;color:#555;margin-bottom:1px;margin-top:3px}
    .val-input{border-bottom:1px solid #888;min-width:40px;font-size:8px;font-weight:bold;padding:1px 0;margin-bottom:2px}
    .val-input.large{font-size:10px;min-width:30px}
    .comments-row{display:flex;align-items:flex-start;gap:6px;padding:3px 4px;border-top:1px solid #ddd}
    .comments-val{flex:1;border-bottom:1px solid #888;min-height:16px;font-size:8px}
    .logo-row{display:flex;justify-content:flex-end;padding:4px 6px 2px}
    @media print{
      body{padding:4px}
      .section-wrap{margin-bottom:8px}
      @page{margin:8mm;size:A4}
    }`;

  win.document.write(`<!DOCTYPE html><html><head>
    <title>Style Details — ${orderNumber ?? ""}</title>
    <style>${css}</style>
  </head><body>

    <div class="section-wrap">
      ${sectionHeader("JACKET STYLE DETAILS", j.sizePattern, j.buttonsCode, "FABRIC SWATCH", true)}
      ${jacketStyling()}
      ${comments(j.comments)}
      ${logo}
    </div>

    <div class="section-wrap">
      ${sectionHeader("SHIRT STYLE DETAILS", s.sizePattern, s.buttonsCode, "FABRIC SWATCH", false)}
      ${shirtStyling()}
      ${comments(s.comments)}
      ${logo}
    </div>

    <div class="section-wrap">
      ${sectionHeader("TROUSER STYLE DETAILS", t.sizePattern, t.buttonsCode, "FABRIC SWATCH", false)}
      ${trouserStyling()}
      ${comments(t.comments)}
      ${logo}
    </div>

  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

// ── OptionChip ─────────────────────────────────────────────────

function OptionChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative px-3 py-2 rounded-lg border text-xs font-medium text-center transition-all leading-tight",
        selected
          ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]"
          : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-border hover:text-foreground"
      )}
    >
      {selected && (
        <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#D4AF37] flex items-center justify-center">
          <Check className="w-1.5 h-1.5 text-black" />
        </span>
      )}
      {label}
    </button>
  );
}

function SecLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 mt-4 first:mt-0">
      {children}
    </p>
  );
}

function OptionGroup({
  label, options, value, onChange,
}: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <SecLabel>{label}</SecLabel>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <OptionChip key={o} label={o} selected={value === o} onClick={() => onChange(value === o ? "" : o)} />
        ))}
      </div>
    </div>
  );
}

// ── Jacket SVG Preview ─────────────────────────────────────────

function JacketPreview({ j }: { j: JacketDesign }) {
  const btnCount = j.noOfButtons === "6" ? 6 : j.noOfButtons === "3" ? 3 : j.noOfButtons === "1" ? 1 : 2;
  const isDouble = j.jacketType === "Double Breasted";

  return (
    <div className="flex items-center justify-center w-full h-full">
      <svg viewBox="0 0 220 300" className="w-40 h-56" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 80 L20 300 L200 300 L190 80 L155 60 L110 120 L65 60 Z" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
        {/* Lapel */}
        {(j.lapel === "Notch" || !j.lapel) && <>
          <path d="M110 120 L65 60 L80 80 L100 130 Z" fill="#2a2a2a" stroke="#444" strokeWidth="0.5" />
          <path d="M110 120 L155 60 L140 80 L120 130 Z" fill="#2a2a2a" stroke="#444" strokeWidth="0.5" />
        </>}
        {j.lapel === "Peak" && <>
          <path d="M110 120 L65 60 L55 90 L100 130 Z" fill="#2a2a2a" stroke="#444" strokeWidth="0.5" />
          <path d="M110 120 L155 60 L165 90 L120 130 Z" fill="#2a2a2a" stroke="#444" strokeWidth="0.5" />
        </>}
        {j.lapel === "Shawl" && <>
          <path d="M110 120 Q85 85 65 60 Q80 100 100 130 Z" fill="#2a2a2a" stroke="#444" strokeWidth="0.5" />
          <path d="M110 120 Q135 85 155 60 Q140 100 120 130 Z" fill="#2a2a2a" stroke="#444" strokeWidth="0.5" />
        </>}
        {/* Shirt strip */}
        <rect x="100" y="100" width="20" height="120" rx="2" fill="#f5f5f5" opacity="0.9" />
        {/* Front buttons */}
        {Array.from({ length: Math.min(btnCount, 6) }).map((_, i) => (
          <circle key={i} cx={isDouble ? 104 + (i % 2) * 12 : 110} cy={150 + Math.floor(i / (isDouble ? 2 : 1)) * 22}
            r="4.5" fill="#D4AF37" stroke="#111" strokeWidth="0.5" opacity="0.85" />
        ))}
        {/* Pocket flap */}
        <rect x="58" y="183" width="30" height="8" rx="2" fill="#252525" stroke="#444" strokeWidth="0.5" />
        <rect x="133" y="183" width="30" height="8" rx="2" fill="#252525" stroke="#444" strokeWidth="0.5" />
        {/* Breast pocket */}
        <rect x="130" y="120" width="18" height="4" rx="1" fill="#D4AF37" opacity="0.5" />
        {/* Sleeve buttons */}
        {Array.from({ length: Math.min(Number(j.sleeveButtons?.replace(" Buttons","").replace(" Button","")) || 4, 5) }).map((_, i) => (
          <circle key={`sl-${i}`} cx={32 + i * 6} cy={250} r="2.5" fill="#D4AF37" stroke="#111" strokeWidth="0.3" opacity="0.7" />
        ))}
        {/* Back vent indicator */}
        {j.backVent === "Center Vent" && <line x1="110" y1="260" x2="110" y2="300" stroke="#555" strokeWidth="1.5" />}
        {j.backVent === "Side Vent" && <>
          <line x1="50" y1="260" x2="50" y2="300" stroke="#555" strokeWidth="1.5" />
          <line x1="170" y1="260" x2="170" y2="300" stroke="#555" strokeWidth="1.5" />
        </>}
      </svg>
    </div>
  );
}

// ── Garment Summary Panel ──────────────────────────────────────

function SummaryItem({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-1.5">
      <span className="text-[10px] text-white/40 min-w-0 whitespace-nowrap">{label}</span>
      <span className="text-[11px] text-white/80 font-medium leading-tight">{value}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

interface BespokeDesignerProps {
  open: boolean;
  onClose: () => void;
  orderId?: string;
  orderNumber?: string;
  order?: {
    customerName?: string;
    deliveryDate?: string;
    trialDate?: string;
    qty?: number;
    gender?: string;
  };
  onSave?: (design: GarmentDesign, specText: string) => Promise<void>;
}

export function BespokeDesigner({ open, onClose, orderId, orderNumber, order, onSave }: BespokeDesignerProps) {
  const [activeTab, setActiveTab] = useState<"jacket" | "shirt" | "trouser">("jacket");
  const [jacket, setJacket] = useState<JacketDesign>(DEFAULT_JACKET);
  const [shirt, setShirt] = useState<ShirtDesign>(DEFAULT_SHIRT);
  const [trouser, setTrouser] = useState<TrouserDesign>(DEFAULT_TROUSER);
  const [saving, setSaving] = useState(false);

  const setJ = <K extends keyof JacketDesign>(k: K, v: JacketDesign[K]) => setJacket((d) => ({ ...d, [k]: v }));
  const setS = <K extends keyof ShirtDesign>(k: K, v: ShirtDesign[K]) => setShirt((d) => ({ ...d, [k]: v }));
  const setT = <K extends keyof TrouserDesign>(k: K, v: TrouserDesign[K]) => setTrouser((d) => ({ ...d, [k]: v }));

  const design: GarmentDesign = { jacket, shirt, trouser };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(design, buildSpecText(design));
      toast.success("Style details saved to order");
      onClose();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const SIZE_PATTERN = ["Create New", "Use Existing", "Use Sample", "Not Required"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <DialogTitle className="font-bold text-sm tracking-wide">Garment Style Details</DialogTitle>
            {orderNumber && <span className="text-xs text-muted-foreground">· {orderNumber}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => printSpec(design, orderNumber, order)} className="gap-1.5 text-xs">
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
            {onSave && (
              <Button variant="gold" size="sm" onClick={handleSave} loading={saving} className="gap-1.5 text-xs">
                <Save className="w-3.5 h-3.5" /> Save to Order
              </Button>
            )}
            <button type="button" onClick={onClose} className="ml-1 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-card flex-shrink-0">
          {(["jacket", "shirt", "trouser"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors",
                activeTab === tab
                  ? "border-[#D4AF37] text-[#D4AF37]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left — Preview / Summary */}
          <div className="w-56 flex-shrink-0 bg-[#0d0d0d] flex flex-col overflow-hidden">
            <div className="flex-1 flex items-center justify-center">
              {activeTab === "jacket" && <JacketPreview j={jacket} />}
              {activeTab === "shirt" && (
                <div className="p-4 text-center">
                  <div className="w-16 h-20 mx-auto mb-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <span className="text-2xl">👔</span>
                  </div>
                </div>
              )}
              {activeTab === "trouser" && (
                <div className="p-4 text-center">
                  <div className="w-16 h-20 mx-auto mb-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <span className="text-2xl">👖</span>
                  </div>
                </div>
              )}
            </div>
            {/* Summary */}
            <div className="p-3 border-t border-white/10 space-y-1.5 overflow-y-auto">
              <p className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest mb-2">
                {activeTab === "jacket" ? "Jacket" : activeTab === "shirt" ? "Shirt" : "Trouser"} Details
              </p>
              {activeTab === "jacket" && <>
                <SummaryItem label="Type" value={jacket.jacketType} />
                <SummaryItem label="Buttons" value={jacket.noOfButtons} />
                <SummaryItem label="Lapel" value={jacket.lapel} />
                <SummaryItem label="Vent" value={jacket.backVent} />
                <SummaryItem label="Pockets" value={jacket.frontPockets} />
                <SummaryItem label="Inside" value={jacket.insidePockets} />
                <SummaryItem label="Sleeve" value={jacket.sleeveButtons} />
                <SummaryItem label="Pick" value={jacket.pickStitch} />
              </>}
              {activeTab === "shirt" && <>
                <SummaryItem label="Fit" value={shirt.shirtFit} />
                <SummaryItem label="Collar" value={shirt.collarStyle} />
                <SummaryItem label="Pocket" value={shirt.frontPockets} />
                <SummaryItem label="Placket" value={shirt.frontPlacket} />
                <SummaryItem label="Back" value={shirt.backDart} />
                <SummaryItem label="Cuff" value={shirt.cuffStyle} />
                <SummaryItem label="Embroidery" value={shirt.nameEmbroidery} />
                <SummaryItem label="Collar Size" value={shirt.collarSize} />
              </>}
              {activeTab === "trouser" && <>
                <SummaryItem label="Fit" value={trouser.fit} />
                <SummaryItem label="Pleats" value={trouser.frontPleats} />
                <SummaryItem label="Back Pkt" value={trouser.backPockets} />
                <SummaryItem label="Lining" value={trouser.insideLining} />
                <SummaryItem label="Loops" value={trouser.loops} />
                <SummaryItem label="Adjuster" value={trouser.sideAdjuster} />
                <SummaryItem label="Bottom" value={trouser.bottomStyle} />
                <SummaryItem label="Waist" value={trouser.waistSize} />
                <SummaryItem label="Length" value={trouser.fullLength} />
              </>}
            </div>
          </div>

          {/* Right — Options */}
          <div className="flex-1 overflow-y-auto p-5">

            {/* ── JACKET TAB ─────────────────────────────── */}
            {activeTab === "jacket" && (
              <div className="space-y-0">
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <SecLabel>Size Pattern</SecLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {SIZE_PATTERN.map((o) => (
                        <OptionChip key={o} label={o} selected={jacket.sizePattern === o} onClick={() => setJ("sizePattern", jacket.sizePattern === o ? "" : o)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <SecLabel>Buttons Code</SecLabel>
                    <Input placeholder="Code" value={jacket.buttonsCode} onChange={(e) => setJ("buttonsCode", e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>

                <OptionGroup label="Jacket Type" options={["Single Breasted", "Double Breasted", "Band Gala", "Bundy"]}
                  value={jacket.jacketType} onChange={(v) => setJ("jacketType", v)} />

                <OptionGroup label="No. of Buttons" options={["1 Button", "2 Buttons", "3 Buttons", "6 Buttons"]}
                  value={jacket.noOfButtons} onChange={(v) => setJ("noOfButtons", v)} />

                <OptionGroup label="Front Pockets" options={["Straight", "Slanting", "With Ticket"]}
                  value={jacket.frontPockets} onChange={(v) => setJ("frontPockets", v)} />

                <OptionGroup label="Lapel" options={["Notch", "Peak", "Shawl"]}
                  value={jacket.lapel} onChange={(v) => setJ("lapel", v)} />

                <OptionGroup label="Lapel Pin Hole" options={["Show", "With Hole", "None"]}
                  value={jacket.lapelPinHole} onChange={(v) => setJ("lapelPinHole", v)} />

                <OptionGroup label="Back Vent Open" options={["Side Vent", "Center Vent", "No Vent"]}
                  value={jacket.backVent} onChange={(v) => setJ("backVent", v)} />

                <OptionGroup label="Inside Fashion" options={["Straight", "Takurdwara", "Piping"]}
                  value={jacket.insideFashion} onChange={(v) => setJ("insideFashion", v)} />

                <OptionGroup label="Inside Pockets" options={["2 Pocket", "3 Pockets", "4 Pockets", "No Pocket"]}
                  value={jacket.insidePockets} onChange={(v) => setJ("insidePockets", v)} />

                <OptionGroup label="Extra Pocket" options={["Pen Pocket", "Passport", "None"]}
                  value={jacket.extraPocket} onChange={(v) => setJ("extraPocket", v)} />

                <OptionGroup label="Sleeve Buttons" options={["3 Buttons", "4 Buttons", "5 Buttons"]}
                  value={jacket.sleeveButtons} onChange={(v) => setJ("sleeveButtons", v)} />

                <OptionGroup label="Pick Stitch" options={["Full Pick", "Lapel Pick", "None"]}
                  value={jacket.pickStitch} onChange={(v) => setJ("pickStitch", v)} />

                <div>
                  <SecLabel>Others</SecLabel>
                  <Input placeholder="Any other styling detail..." value={jacket.others} onChange={(e) => setJ("others", e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <SecLabel>More Comments</SecLabel>
                  <Textarea placeholder="Additional comments or special instructions..." rows={3} value={jacket.comments} onChange={(e) => setJ("comments", e.target.value)} className="text-sm resize-none" />
                </div>
              </div>
            )}

            {/* ── SHIRT TAB ──────────────────────────────── */}
            {activeTab === "shirt" && (
              <div className="space-y-0">
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <SecLabel>Size Pattern</SecLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {SIZE_PATTERN.map((o) => (
                        <OptionChip key={o} label={o} selected={shirt.sizePattern === o} onClick={() => setS("sizePattern", shirt.sizePattern === o ? "" : o)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <SecLabel>Buttons Code</SecLabel>
                    <Input placeholder="Code" value={shirt.buttonsCode} onChange={(e) => setS("buttonsCode", e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>

                <OptionGroup label="Shirt Fit" options={["Comfort", "Slim"]}
                  value={shirt.shirtFit} onChange={(v) => setS("shirtFit", v)} />

                <OptionGroup label="Collar Style" options={["Regular", "Semi Cut Way", "Full Cut Way", "Tux Wing"]}
                  value={shirt.collarStyle} onChange={(v) => setS("collarStyle", v)} />

                <OptionGroup label="Front Pockets" options={["Single", "Double", "No Pocket"]}
                  value={shirt.frontPockets} onChange={(v) => setS("frontPockets", v)} />

                <OptionGroup label="Front Placket" options={["With Placket", "Invisible Buttons", "No Placket", "Tux Pleats"]}
                  value={shirt.frontPlacket} onChange={(v) => setS("frontPlacket", v)} />

                <OptionGroup label="Back Dart" options={["Dart", "Center Box", "Side Pleats", "None"]}
                  value={shirt.backDart} onChange={(v) => setS("backDart", v)} />

                <OptionGroup label="Cuff Style" options={["One Button", "Two Button", "French Cuff"]}
                  value={shirt.cuffStyle} onChange={(v) => setS("cuffStyle", v)} />

                <div>
                  <SecLabel>Name Embroidery</SecLabel>
                  <div className="flex flex-wrap gap-2">
                    {["Yes", "No"].map((o) => (
                      <OptionChip key={o} label={o} selected={shirt.nameEmbroidery === o} onClick={() => setS("nameEmbroidery", shirt.nameEmbroidery === o ? "" : o)} />
                    ))}
                    {shirt.nameEmbroidery === "Yes" && (
                      <>
                        <OptionChip label="Left" selected={shirt.embroideryPosition === "Left"} onClick={() => setS("embroideryPosition", shirt.embroideryPosition === "Left" ? "" : "Left")} />
                        <OptionChip label="Right" selected={shirt.embroideryPosition === "Right"} onClick={() => setS("embroideryPosition", shirt.embroideryPosition === "Right" ? "" : "Right")} />
                      </>
                    )}
                  </div>
                </div>

                <OptionGroup label="Cuff Size" options={["Left", "Right", "Regular"]}
                  value={shirt.cuffSize} onChange={(v) => setS("cuffSize", v)} />

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <SecLabel>Collar Point Size</SecLabel>
                    <Input placeholder="Size" value={shirt.collarPointSize} onChange={(e) => setS("collarPointSize", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <SecLabel>Collar Stand Size</SecLabel>
                    <Input placeholder="Size" value={shirt.collarStandSize} onChange={(e) => setS("collarStandSize", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <SecLabel>Collar Size</SecLabel>
                    <Input placeholder="Size" value={shirt.collarSize} onChange={(e) => setS("collarSize", e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>

                <div>
                  <SecLabel>More Comments</SecLabel>
                  <Textarea placeholder="Additional comments or special instructions..." rows={3} value={shirt.comments} onChange={(e) => setS("comments", e.target.value)} className="text-sm resize-none" />
                </div>
              </div>
            )}

            {/* ── TROUSER TAB ────────────────────────────── */}
            {activeTab === "trouser" && (
              <div className="space-y-0">
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <SecLabel>Size Pattern</SecLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {SIZE_PATTERN.map((o) => (
                        <OptionChip key={o} label={o} selected={trouser.sizePattern === o} onClick={() => setT("sizePattern", trouser.sizePattern === o ? "" : o)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <SecLabel>Buttons Code</SecLabel>
                    <Input placeholder="Code" value={trouser.buttonsCode} onChange={(e) => setT("buttonsCode", e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>

                <OptionGroup label="Fit" options={["Comfort", "Slim", "Straight", "Loose Fit"]}
                  value={trouser.fit} onChange={(v) => setT("fit", v)} />

                <OptionGroup label="Front Pleats" options={["1 Pleat", "2 Pleats", "No Pleats", "Front Darts"]}
                  value={trouser.frontPleats} onChange={(v) => setT("frontPleats", v)} />

                <div className="grid grid-cols-2 gap-4">
                  <OptionGroup label="Back Pockets (Count)" options={["1 Pocket", "2 Pockets", "No Pockets"]}
                    value={trouser.backPockets} onChange={(v) => setT("backPockets", v)} />
                  <OptionGroup label="Back Pockets (Type)" options={["Pocket Flap", "Button Loop", "Kaaj"]}
                    value={trouser.backPocketsType} onChange={(v) => setT("backPocketsType", v)} />
                </div>

                <OptionGroup label="Inside Lining" options={["Half Lining", "Full Lining", "No Lining"]}
                  value={trouser.insideLining} onChange={(v) => setT("insideLining", v)} />

                <OptionGroup label="Loops" options={["8 Loops", "6 Loops", "No Loops"]}
                  value={trouser.loops} onChange={(v) => setT("loops", v)} />

                <OptionGroup label="Side Adjuster" options={["Yes", "No", "Back Elastic", "Side Invisible Elastic"]}
                  value={trouser.sideAdjuster} onChange={(v) => setT("sideAdjuster", v)} />

                <OptionGroup label="Front Pocket" options={["Cross", "Straight", "Jeans Style", "No Pockets"]}
                  value={trouser.frontPocket} onChange={(v) => setT("frontPocket", v)} />

                <OptionGroup label="Bottom Style" options={["Cuff Fold", "Normal Hemming", "Fold & Stitch"]}
                  value={trouser.bottomStyle} onChange={(v) => setT("bottomStyle", v)} />

                <OptionGroup label="Button / Hook" options={["Long Belt", "Hook", "Button", "Double Button 2\" Belt"]}
                  value={trouser.buttonHook} onChange={(v) => setT("buttonHook", v)} />

                <OptionGroup label="Coin Pocket" options={["Inside Belt", "Inside Right Pocket", "None"]}
                  value={trouser.coinPocket} onChange={(v) => setT("coinPocket", v)} />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <SecLabel>Waist Size</SecLabel>
                    <Input placeholder="e.g. 34" value={trouser.waistSize} onChange={(e) => setT("waistSize", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <SecLabel>Full Length</SecLabel>
                    <Input placeholder="e.g. 42" value={trouser.fullLength} onChange={(e) => setT("fullLength", e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>

                <div>
                  <SecLabel>More Comments</SecLabel>
                  <Textarea placeholder="Additional comments or special instructions..." rows={3} value={trouser.comments} onChange={(e) => setT("comments", e.target.value)} className="text-sm resize-none" />
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

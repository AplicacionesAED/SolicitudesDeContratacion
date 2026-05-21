"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResumenLicitacionProps {
  consecutivo: string;
  terceroNombre: string | null;
  valorFinal: number | null;
  formaPago: string | null;
  descripcionActividad: string | null;
  fechaInicioContrato: string | null;
  fechaFinContrato: string | null;
  etapas: number[];
  frentes: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toDate(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ─── HTML template ────────────────────────────────────────────────────────────

function buildHtml(p: ResumenLicitacionProps, origin: string): string {
  const fi = toDate(p.fechaInicioContrato);
  const ff = toDate(p.fechaFinContrato);
  // Liquidation: 45 calendar days after end date (standard AED practice)
  const fl = ff ? addDays(ff, 45) : null;

  const valorStr = p.valorFinal != null ? formatCurrency(p.valorFinal) : "—";
  const etapaStr = p.etapas.length
    ? p.etapas.map((e) => `ETAPA ${e}`).join(" / ")
    : "—";
  const frenteStr = p.frentes.length ? p.frentes.join(", ") : "—";
  const actividad = esc(p.descripcionActividad ?? "—").replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>GeneradorGastos_${esc(p.consecutivo)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1e293b; background: #fff; }
    @page { size: A4 portrait; margin: 0; }

    .accent { height: 6px; background: #0f2d4a; }
    .accent-teal { height: 3px; background: #00b5a0; }

    /* ── Header ── */
    .hdr {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 20px 36px 16px;
      border-bottom: 1px solid #e2e8f0;
    }
    .hdr-eyebrow {
      font-size: 8px;
      font-weight: 700;
      color: #00b5a0;
      text-transform: uppercase;
      letter-spacing: 2.5px;
      margin-bottom: 5px;
    }
    .hdr-title {
      font-size: 19px;
      font-weight: 900;
      color: #0f2d4a;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .hdr-consecutivo {
      font-family: 'Courier New', monospace;
      font-size: 10.5px;
      font-weight: 700;
      color: #64748b;
      margin-top: 6px;
    }
    .logo { max-height: 48px; width: auto; display: block; margin-left: auto; }
    .logo-sub { font-size: 8px; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; text-align: right; }

    /* ── Content ── */
    .body { padding: 22px 36px 32px; }

    .sec-hd {
      background: #0f2d4a;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 7px 14px;
      margin-bottom: 0;
    }

    /* ── Main table ── */
    table.t { width: 100%; border-collapse: collapse; }
    td.lbl {
      background: #f8fafc;
      font-weight: 700;
      font-size: 8.5px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #475569;
      width: 30%;
      padding: 11px 14px;
      vertical-align: middle;
      border: 1px solid #e2e8f0;
      border-left: 3px solid #00b5a0;
    }
    td.val {
      font-size: 11px;
      color: #1e293b;
      padding: 11px 16px;
      vertical-align: middle;
      border: 1px solid #e2e8f0;
      line-height: 1.5;
    }
    td.val.center { text-align: center; }

    /* ── Duration cells ── */
    table.dur { width: 100%; border-collapse: collapse; }
    table.dur td { text-align: center; padding: 4px 10px; border-right: 1px solid #e2e8f0; }
    table.dur td:last-child { border-right: none; }
    .dv { font-size: 12px; font-weight: 700; color: #0f2d4a; display: block; }
    .dl { font-size: 8px; font-weight: 700; color: #94a3b8; letter-spacing: 1.2px; text-transform: uppercase; display: block; margin-top: 4px; }

    /* ── Footer ── */
    .footer { margin-top: 72px; }
    .sig-line { border-top: 1.5px solid #0f2d4a; width: 260px; margin-top: 64px; }
    .sig-nombre { font-size: 10px; font-weight: 700; color: #1e293b; margin-top: 6px; }
    .sig-cargo  { font-size: 9px; color: #64748b; margin-top: 2px; }
  </style>
</head>
<body>

  <div class="accent"></div>
  <div class="accent-teal"></div>

  <div class="hdr">
    <div>
      <div class="hdr-eyebrow">Compras y Contrataciones</div>
      <div class="hdr-title">Generador de Gastos</div>
      <div class="hdr-consecutivo">${esc(p.consecutivo)}</div>
    </div>
    <div>
      <img class="logo" src="${origin}/aed-logo%20degrade%201.png" alt="AED" />
      <div class="logo-sub">Constructores</div>
    </div>
  </div>

  <div class="body">
    <div class="sec-hd">Licitación</div>
    <table class="t">
      <tr>
        <td class="lbl">Contratista</td>
        <td class="val">${esc(p.terceroNombre ?? "—")}</td>
      </tr>
      <tr>
        <td class="lbl">Valor de Contratación</td>
        <td class="val">${esc(valorStr)}</td>
      </tr>
      <tr>
        <td class="lbl">Forma de Pago</td>
        <td class="val">${esc(p.formaPago ?? "—")}</td>
      </tr>
      <tr>
        <td class="lbl">Actividad a Ejecutar</td>
        <td class="val">${actividad}</td>
      </tr>
      <tr>
        <td class="lbl">Duración de la Contratación</td>
        <td class="val center">
          <table class="dur">
            <tr>
              <td><span class="dv">${esc(fi ? formatDate(fi) : "—")}</span><span class="dl">Inicio</span></td>
              <td><span class="dv">${esc(ff ? formatDate(ff) : "—")}</span><span class="dl">Fin</span></td>
              <td><span class="dv">${esc(fl ? formatDate(fl) : "—")}</span><span class="dl">Liquidación</span></td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td class="lbl">Etapa</td>
        <td class="val">${esc(etapaStr)}</td>
      </tr>
      <tr>
        <td class="lbl">Frente</td>
        <td class="val">${esc(frenteStr)}</td>
      </tr>
    </table>

    <div class="footer">
      <div class="sig-line"></div>
      <div class="sig-nombre">Nombre: _______________________________</div>
      <div class="sig-cargo">Gerente de Compras y Contrataciones</div>
    </div>
  </div>

</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ResumenLicitacionButton(props: ResumenLicitacionProps) {
  const [loading, setLoading] = useState(false);

  function handleExport() {
    if (loading) return;
    setLoading(true);

    try {
      const html = buildHtml(props, window.location.origin);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const iframe = document.createElement("iframe");
      iframe.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;";
      document.body.appendChild(iframe);

      iframe.onload = () => {
        const prevTitle = document.title;
        document.title = `GeneradorGastos_${props.consecutivo}`;
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.title = prevTitle;
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
          setLoading(false);
        }, 3000);
      };

      iframe.src = url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-60"
    >
      <Download size={15} className="shrink-0" />
      {loading ? "Generando…" : "Exportar Generador de Gastos"}
    </button>
  );
}

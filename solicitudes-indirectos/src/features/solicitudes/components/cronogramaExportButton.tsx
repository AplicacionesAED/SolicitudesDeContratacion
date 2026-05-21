"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { formatDate } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActividadExport {
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  responsable?: string | null;
}

interface FaseExport {
  numeroFase: number;
  nombreFase: string;
  fechaInicio: string;
  fechaFin: string;
  actividades: ActividadExport[];
}

export interface CronogramaExportProps {
  consecutivo: string;
  terceroNombre: string | null;
  proyectoNombre: string;
  frentes: string[];
  fechaInicio: string;
  fechaFin: string;
  tieneFases: boolean;
  fases: FaseExport[];
  actividades: ActividadExport[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── HTML template ────────────────────────────────────────────────────────────

function buildHtml(p: CronogramaExportProps, origin: string): string {
  const fiStr = formatDate(p.fechaInicio);
  const ffStr = formatDate(p.fechaFin);
  const frenteStr = p.frentes.length ? p.frentes.join(", ") : "—";

  function actividadRows(acts: ActividadExport[]): string {
    if (acts.length === 0) return "";
    return acts
      .map(
        (a) => `
      <tr>
        <td class="td-desc">${esc(a.descripcion)}</td>
        <td class="td-date">${esc(formatDate(a.fechaInicio))}</td>
        <td class="td-date">${esc(formatDate(a.fechaFin))}</td>
      </tr>`
      )
      .join("");
  }

  const tableBody = p.tieneFases
    ? p.fases
        .map(
          (fase) => `
      <tr class="fase-row">
        <td colspan="4">FASE ${fase.numeroFase}: ${esc(fase.nombreFase)}
          <span class="fase-dates">${esc(formatDate(fase.fechaInicio))} → ${esc(formatDate(fase.fechaFin))}</span>
        </td>
      </tr>
      ${actividadRows(fase.actividades)}`
        )
        .join("")
    : actividadRows(p.actividades);

  const emptyRow =
    !tableBody.trim()
      ? `<tr><td colspan="4" class="td-empty">Sin actividades registradas</td></tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cronograma_${esc(p.consecutivo)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1e293b; background: #fff; }
    @page { size: A4 landscape; margin: 0; }

    .accent { height: 6px; background: #0f2d4a; }
    .accent-teal { height: 3px; background: #00b5a0; }

    /* ── Header ── */
    .hdr {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16px 32px 14px;
      border-bottom: 1px solid #e2e8f0;
    }
    .hdr-eyebrow {
      font-size: 8px;
      font-weight: 700;
      color: #00b5a0;
      text-transform: uppercase;
      letter-spacing: 2.5px;
      margin-bottom: 4px;
    }
    .hdr-title {
      font-size: 18px;
      font-weight: 900;
      color: #0f2d4a;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .hdr-consecutivo {
      font-family: 'Courier New', monospace;
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      margin-top: 5px;
    }
    .logo { max-height: 48px; width: auto; display: block; margin-left: auto; }
    .logo-sub { font-size: 8px; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; margin-top: 3px; text-align: right; }

    /* ── Body ── */
    .body { padding: 16px 32px 28px; }

    /* ── Info grid ── */
    table.info { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    table.info td { padding: 8px 12px; border: 1px solid #e2e8f0; }
    table.info td.lbl {
      background: #f8fafc;
      font-weight: 700;
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #475569;
      width: 12%;
      border-left: 3px solid #00b5a0;
    }
    table.info td.val { font-size: 11px; color: #1e293b; width: 38%; }

    /* ── Activities table ── */
    table.t { width: 100%; border-collapse: collapse; }
    table.t thead tr { background: #0f2d4a; }
    table.t thead th {
      padding: 9px 12px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #fff;
      text-align: left;
      border: 1px solid #0f2d4a;
    }
    table.t thead th.center { text-align: center; }

    .fase-row td {
      background: #e8f0f8;
      font-weight: 700;
      font-size: 9.5px;
      color: #0f2d4a;
      padding: 7px 12px;
      border: 1px solid #c5d8ed;
      border-left: 3px solid #0f2d4a;
      letter-spacing: 0.3px;
    }
    .fase-dates {
      font-weight: 400;
      color: #4a6a8a;
      margin-left: 10px;
      font-size: 9px;
    }

    .td-desc {
      padding: 8px 12px;
      font-size: 10.5px;
      color: #1e293b;
      border: 1px solid #e2e8f0;
      width: 48%;
      line-height: 1.45;
    }
    .td-date {
      padding: 8px 10px;
      font-size: 10.5px;
      color: #334155;
      border: 1px solid #e2e8f0;
      text-align: center;
      width: 13%;
      white-space: nowrap;
    }
    .td-resp {
      padding: 8px 12px;
      font-size: 10px;
      color: #475569;
      border: 1px solid #e2e8f0;
      width: 26%;
    }
    .td-empty {
      padding: 18px 12px;
      text-align: center;
      color: #94a3b8;
      font-style: italic;
      border: 1px solid #e2e8f0;
    }
    table.t tbody tr:nth-child(even):not(.fase-row) { background: #f8fafc; }

    /* ── Footer ── */
    .footer { margin-top: 52px; }
    .sig-line { border-top: 1.5px solid #0f2d4a; width: 260px; margin-top: 56px; }
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
      <div class="hdr-title">Cronograma</div>
      <div class="hdr-consecutivo">${esc(p.consecutivo)}</div>
    </div>
    <div>
      <img class="logo" src="${origin}/aed-logo%20degrade%201.png" alt="AED" />
      <div class="logo-sub">Constructores</div>
    </div>
  </div>

  <div class="body">
    <table class="info">
      <tr>
        <td class="lbl">Consecutivo</td>
        <td class="val">${esc(p.consecutivo)}</td>
        <td class="lbl">Contratista</td>
        <td class="val">${esc(p.terceroNombre ?? "—")}</td>
      </tr>
      <tr>
        <td class="lbl">Proyecto</td>
        <td class="val">${esc(p.proyectoNombre)}</td>
        <td class="lbl">Frente(s)</td>
        <td class="val">${esc(frenteStr)}</td>
      </tr>
      <tr>
        <td class="lbl">Fecha Inicio</td>
        <td class="val">${esc(fiStr)}</td>
        <td class="lbl">Fecha Fin</td>
        <td class="val">${esc(ffStr)}</td>
      </tr>
    </table>

    <table class="t">
      <thead>
        <tr>
          <th>Descripción de la Actividad</th>
          <th class="center">Fecha Inicio</th>
          <th class="center">Fecha Fin</th>
        </tr>
      </thead>
      <tbody>
        ${tableBody}
        ${emptyRow}
      </tbody>
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

export function CronogramaExportButton(props: CronogramaExportProps) {
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
        document.title = `Cronograma_${props.consecutivo}`;
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
      {loading ? "Generando…" : "Exportar Cronograma"}
    </button>
  );
}

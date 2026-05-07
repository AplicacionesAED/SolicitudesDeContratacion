import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

type TipoSolicitud = string;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Consecutivo ─────────────────────────────────────────────────────────────

const TIPO_ABREV: Record<TipoSolicitud, string> = {
  ORDEN_SERVICIO: "ODS",
  CONTRATO: "CONT",
  OTROSI_TIEMPO: "OST",
  OTROSI_TIEMPO_CANTIDAD: "OSTC",
  TRAMITE_CUENTA: "TCC",
  TRAMITE_FACTURAS: "TFC",
  TRAMITE_CUENTAS_RECURRENTES: "TCR",
  TRAMITE_CUENTAS_OCASIONALES: "TCO",
  TRAMITE_BONIFICACIONES_COMISIONES: "TBC",
};

// Returns first `letterLength` uppercase letters of a name.
// If `appendDigits` is true, all digits from the name are appended after the letters.
// Accents, spaces and special characters are stripped. Result is always deterministic.
export function abbreviate(name: string, letterLength: number, appendDigits = false): string {
  const normalized = name
    .normalize("NFD")
    .split("")
    .filter((ch) => {
      const cp = ch.codePointAt(0) ?? 0;
      return cp < 0x0300 || cp > 0x036f; // strip combining diacritical marks
    })
    .join("")
    .toUpperCase();

  const letters = normalized.replace(/[^A-Z]/g, "").slice(0, letterLength).padEnd(letterLength, "X");
  if (!appendDigits) return letters;

  const digits = normalized.replace(/[^0-9]/g, "");
  return letters + digits;
}

export function buildConsecutivo(
  tipo: TipoSolicitud,
  proyAbbr: string,
  frenAbbr: string,
  numero: number
): string {
  const abrev = TIPO_ABREV[tipo] ?? tipo;
  const num = String(numero).padStart(3, "0");
  return `SOL-${abrev}-${proyAbbr}-${frenAbbr}-${num}`;
}

// ─── Formateo ────────────────────────────────────────────────────────────────

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "$0";
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(num);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

// ─── Valor en letras (COP) ───────────────────────────────────────────────────

const UNIDADES = [
  "", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE",
  "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS",
  "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE", "VEINTIÚN", "VEINTIDÓS",
  "VEINTITRÉS", "VEINTICUATRO", "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE",
  "VEINTIOCHO", "VEINTINUEVE",
];

const DECENAS = [
  "", "", "VEINTI", "TREINTA", "CUARENTA", "CINCUENTA",
  "SESENTA", "SETENTA", "OCHENTA", "NOVENTA",
];

const CENTENAS = [
  "", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
  "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS",
];

function cientos(n: number): string {
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100);
  const d = n % 100;
  const dec = Math.floor(d / 10);
  const uni = d % 10;
  let res = CENTENAS[c];
  if (d > 0) {
    if (d < 30) {
      res += (res ? " " : "") + UNIDADES[d];
    } else {
      res += (res ? " " : "") + DECENAS[dec];
      if (uni > 0) res += " Y " + UNIDADES[uni];
    }
  }
  return res;
}

export function numeroALetras(valor: number): string {
  if (valor === 0) return "CERO PESOS M/CTE";
  const entero = Math.floor(valor);
  const millones = Math.floor(entero / 1_000_000);
  const miles = Math.floor((entero % 1_000_000) / 1_000);
  const resto = entero % 1_000;
  let resultado = "";
  if (millones > 0) {
    resultado += (millones === 1 ? "UN MILLÓN" : cientos(millones) + " MILLONES");
  }
  if (miles > 0) {
    resultado += (resultado ? " " : "") + (miles === 1 ? "MIL" : cientos(miles) + " MIL");
  }
  if (resto > 0) {
    resultado += (resultado ? " " : "") + cientos(resto);
  }
  return resultado + " PESOS M/CTE";
}

// ─── Labels ──────────────────────────────────────────────────────────────────

export const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  APROBADA_DIRECTOR: "Aprobada por Director",
  EN_REVISION: "En Revisión",
  EN_TRAMITE_CONTRATOS: "En Trámite Contratos",
  CREACION_MINUTA: "Creación de Minuta",
  ENVIO_CONTRATO_POLIZAS: "Envío Contrato y Pólizas",
  EN_CONTROLES: "Agregar Minuta",
  APROBACION_FINAL: "Aprobación Final",
  COMPLETADA: "Completada",
  DEVUELTA: "Devuelta",
};

export const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: "bg-gray-100 text-gray-700",
  ENVIADA: "bg-blue-100 text-blue-700",
  APROBADA_DIRECTOR: "bg-indigo-100 text-indigo-700",
  EN_REVISION: "bg-yellow-100 text-yellow-700",
  EN_TRAMITE_CONTRATOS: "bg-purple-100 text-purple-700",
  CREACION_MINUTA: "bg-orange-100 text-orange-700",
  ENVIO_CONTRATO_POLIZAS: "bg-cyan-100 text-cyan-700",
  EN_CONTROLES: "bg-teal-100 text-teal-700",
  APROBACION_FINAL: "bg-lime-100 text-lime-700",
  COMPLETADA: "bg-green-100 text-green-700",
  DEVUELTA: "bg-red-100 text-red-700",
};

export const TIPO_SOLICITUD_LABELS: Record<string, string> = {
  ORDEN_SERVICIO: "Orden de Servicio",
  CONTRATO: "Contrato",
  OTROSI_TIEMPO: "Otrosí por Tiempo",
  OTROSI_TIEMPO_CANTIDAD: "Otrosí Tiempo, Cantidad y/o Modificación",
  TRAMITE_CUENTA: "Trámite de Cuenta",
  TRAMITE_FACTURAS: "Trámite de Facturas",
  TRAMITE_CUENTAS_RECURRENTES: "Trámite de Cuentas Recurrentes",
  TRAMITE_CUENTAS_OCASIONALES: "Trámite de Cuentas Ocasionales",
  TRAMITE_BONIFICACIONES_COMISIONES: "Trámite de Bonificaciones y Comisiones",
};

export const ACCION_LABELS: Record<string, string> = {
  ENVIAR: "Solicitud enviada para aprobación",
  APROBAR_DIRECTOR: "Aprobada por Director de Proyecto",
  DEVOLVER: "Devuelta al solicitante",
  REVISAR: "Enviada a revisión por el solicitante",
  TRAMITAR_OK: "Documentación revisada — En creación de minuta",
  AVANZAR_CONTRATOS: "Anexos adjuntados — Enviada a Controles",
  PASAR_CONTROLES: "Contrato y pólizas enviados a Controles",
  REGISTRAR_ADPRO: "Número de contrato Adpro registrado",
  APROBAR_FINAL: "Aprobación definitiva por Director de Controles",
  REENVIAR: "Solicitud reenviada para aprobación",
};

// Color del indicador según el tipo de acción
export const ACCION_COLOR: Record<string, string> = {
  ENVIAR: "bg-blue-400",
  APROBAR_DIRECTOR: "bg-green-500",
  DEVOLVER: "bg-red-400",
  REVISAR: "bg-yellow-400",
  TRAMITAR_OK: "bg-green-500",
  AVANZAR_CONTRATOS: "bg-green-500",
  PASAR_CONTROLES: "bg-green-500",
  REGISTRAR_ADPRO: "bg-indigo-400",
  APROBAR_FINAL: "bg-green-600",
  REENVIAR: "bg-blue-400",
};

// Estado al que queda la solicitud después de cada acción
export const ACCION_ESTADO_DESTINO: Record<string, string> = {
  ENVIAR: "ENVIADA",
  APROBAR_DIRECTOR: "EN_TRAMITE_CONTRATOS",
  DEVOLVER: "DEVUELTA",
  REVISAR: "EN_REVISION",
  TRAMITAR_OK: "CREACION_MINUTA",
  AVANZAR_CONTRATOS: "EN_CONTROLES",
  PASAR_CONTROLES: "EN_CONTROLES",
  REGISTRAR_ADPRO: "APROBACION_FINAL",
  APROBAR_FINAL: "COMPLETADA",
  REENVIAR: "ENVIADA",
};

export const ROL_LABELS: Record<string, string> = {
  SOLICITANTE: "Solicitante",
  DIRECTOR_PROYECTO: "Director de Proyecto",
  CONTRATOS: "Contratos",
  CONTROLES: "Coordinador Controles",
  DIRECTOR_CONTROLES: "Director de Controles",
  ADMIN: "Administrador",
};

// Funcionalidades por rol (base)
export const FUNCIONALIDADES_POR_ROL: Record<string, string[]> = {
  SOLICITANTE: [
    "crear_enviar_solicitudes",
    "reenviar_solicitudes",
    "ver_solicitudes_propias",
  ],
  DIRECTOR_PROYECTO: [
    "crear_enviar_solicitudes",
    "reenviar_solicitudes",
    "ver_solicitudes_propias",
    "aprobar_solicitudes_frente",
    "devolver_solicitudes",
    "ver_solicitudes_frentes",
  ],
  CONTRATOS: [
    "ver_todas_solicitudes",
    "devolver_solicitudes",
    "revisar_contratos",
    "tramitar_solicitudes",
    "crear_minutas",
    "pasar_controles",
  ],
  CONTROLES: [
    "ver_todas_solicitudes",
    "registrar_adpro",
    "revisar_contratos_polizas",
  ],
  DIRECTOR_CONTROLES: [
    "ver_todas_solicitudes",
    "aprobacion_final",
    "revisar_contratos_polizas",
  ],
  ADMIN: [
    "acceso_total",
    "gestionar_usuarios",
    "configurar_frentes",
    "asignar_aprobadores",
    "ver_todas_solicitudes",
    "crear_terceros",
  ],
};

/**
 * Verifica si un usuario tiene una funcionalidad específica
 * @param roles Array de roles del usuario
 * @param funcionalidadesSeleccionadas Array de funcionalidades seleccionadas (del BD)
 * @param funcionalidad El slug de la funcionalidad a verificar
 * @returns true si el usuario tiene la funcionalidad
 */
export function tienePermiso(
  roles: string[],
  funcionalidadesSeleccionadas: string[],
  funcionalidad: string
): boolean {
  // Si tiene ADMIN, tiene todo
  if (roles.includes("ADMIN")) return true;

  // Verificar si tiene la funcionalidad en su rol base
  const funcionalidadesDelRol = roles.flatMap(
    (rol) => FUNCIONALIDADES_POR_ROL[rol] || []
  );

  // Retorna true si está en su rol o en las seleccionadas (esto incluye si se agregaron o desactivaron)
  return funcionalidadesDelRol.includes(funcionalidad) ||
    funcionalidadesSeleccionadas.includes(funcionalidad);
}

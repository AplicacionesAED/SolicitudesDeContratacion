"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft,
  Activity,
  RefreshCw,
  Download,
  Search,
  X,
  Calendar,
  Clock,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Filter,
  LogIn,
  LogOut,
  Eye,
  MousePointer,
  Zap,
  Pause,
} from "lucide-react";
import { Spinner } from "@/shared/ui/spinner";
import { ROL_LABELS, formatDateTime } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Estado = "activo" | "ausente" | "desconectado";
type Tab = "presencia" | "historial" | "sesiones" | "estadisticas";

interface UsuarioPresencia {
  id: string;
  nombre: string;
  email: string;
  cargo: string | null;
  roles: string[];
  frentes: { id: number; nombre: string }[];
  ultimaConexion: string | null;
  ultimaActividad: string | null;
  estado: Estado;
}

interface ActividadRegistro {
  id: number;
  userId: string;
  tipo: string;
  descripcion: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  creadoEn: string;
  user: { id: string; nombre: string; email: string; cargo: string | null };
}

interface SesionRegistro {
  id: number;
  userId: string;
  inicio: string;
  fin: string | null;
  duracionSeg: number | null;
  ip: string | null;
  dispositivo: string | null;
  navegador: string | null;
  sistemaOp: string | null;
  userAgent: string | null;
  user: { id: string; nombre: string; email: string; cargo: string | null };
}

interface Stats {
  resumen: {
    totalUsuarios: number;
    usuariosActivos: number;
    usuariosConSesion: number;
    totalSesiones: number;
    sesionesCompletadas: number;
    duracionMediaMinutos: number;
  };
  actividadesPorTipo: { tipo: string; count: number }[];
  sesionesPorDia: { dia: string; total: number }[];
  horasPico: { hora: number; total: number }[];
}

const ESTADO_CONFIG: Record<Estado, { label: string; dot: string; pill: string; orden: number }> = {
  activo: { label: "Activo", dot: "bg-green-500", pill: "bg-green-50 text-green-700", orden: 0 },
  ausente: { label: "Ausente", dot: "bg-amber-400", pill: "bg-amber-50 text-amber-700", orden: 1 },
  desconectado: { label: "Desconectado", dot: "bg-gray-300", pill: "bg-gray-100 text-gray-500", orden: 2 },
};

const TIPO_ACTIVIDAD_CONFIG: Record<string, { label: string; icon: typeof LogIn; color: string }> = {
  login: { label: "Inicio de sesión", icon: LogIn, color: "text-green-600 bg-green-50" },
  logout: { label: "Cierre de sesión", icon: LogOut, color: "text-red-600 bg-red-50" },
  heartbeat: { label: "Actividad", icon: Zap, color: "text-blue-600 bg-blue-50" },
  idle: { label: "Inactivo", icon: Pause, color: "text-amber-600 bg-amber-50" },
  active: { label: "Activo de nuevo", icon: Zap, color: "text-green-600 bg-green-50" },
  page_view: { label: "Página visitada", icon: Eye, color: "text-purple-600 bg-purple-50" },
  action: { label: "Acción realizada", icon: MousePointer, color: "text-blue-600 bg-blue-50" },
};

const TAB_CONFIG: { key: Tab; label: string; icon: typeof Activity }[] = [
  { key: "presencia", label: "Presencia", icon: Activity },
  { key: "historial", label: "Historial", icon: Clock },
  { key: "sesiones", label: "Sesiones", icon: Monitor },
  { key: "estadisticas", label: "Estadísticas", icon: Calendar },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tiempoRelativo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Hace instantes";
  if (mins < 60) return `Hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `Hace ${dias} día${dias !== 1 ? "s" : ""}`;
}

function formatDuracion(seg: number | null): string {
  if (!seg) return "—";
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function parseUserAgent(ua: string | null) {
  if (!ua) return { dispositivo: "—", navegador: "—", so: "—" };
  const lower = ua.toLowerCase();
  let dispositivo = "Desktop";
  if (/mobile|android|iphone/.test(lower)) dispositivo = /ipad/.test(lower) ? "Tablet" : "Móvil";
  let navegador = "Otro";
  if (lower.includes("edg/")) navegador = "Edge";
  else if (lower.includes("chrome/")) navegador = "Chrome";
  else if (lower.includes("firefox/")) navegador = "Firefox";
  else if (lower.includes("safari/")) navegador = "Safari";
  let so = "Otro";
  if (lower.includes("windows")) so = "Windows";
  else if (lower.includes("mac os")) so = "macOS";
  else if (lower.includes("linux")) so = "Linux";
  else if (lower.includes("android")) so = "Android";
  else if (lower.includes("ios") || lower.includes("iphone") || lower.includes("ipad")) so = "iOS";
  return { dispositivo, navegador, so };
}

// ─── Components ───────────────────────────────────────────────────────────────

function UserDetailModal({
  userId,
  userName,
  onClose,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
}) {
  const [actividades, setActividades] = useState<ActividadRegistro[]>([]);
  const [sesiones, setSesiones] = useState<SesionRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [actividadPage, setActividadPage] = useState(1);
  const [sesionPage, setSesionPage] = useState(1);
  const [actividadTotal, setActividadTotal] = useState(0);
  const [sesionTotal, setSesionTotal] = useState(0);

  const fetchUserActivity = useCallback(async () => {
    setLoading(true);
    try {
      const [actRes, sesRes] = await Promise.all([
        fetch(`/api/actividad/historial?userId=${userId}&page=${actividadPage}&limit=15`),
        fetch(`/api/actividad/sesiones?userId=${userId}&page=${sesionPage}&limit=10`),
      ]);
      if (actRes.ok) {
        const d = await actRes.json();
        setActividades(d.data);
        setActividadTotal(d.pagination.total);
      }
      if (sesRes.ok) {
        const d = await sesRes.json();
        setSesiones(d.data);
        setSesionTotal(d.pagination.total);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, actividadPage, sesionPage]);

  useEffect(() => {
    fetchUserActivity();
  }, [fetchUserActivity]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{userName}</h2>
            <p className="text-xs text-gray-400">Actividad reciente y sesiones</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Timeline de actividad</h3>
                  <span className="text-xs text-gray-400">{actividadTotal} registros</span>
                </div>
                <div className="space-y-2">
                  {actividades.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">Sin actividad registrada</p>
                  )}
                  {actividades.map((a) => {
                    const cfg = TIPO_ACTIVIDAD_CONFIG[a.tipo] || TIPO_ACTIVIDAD_CONFIG.action;
                    const Icon = cfg.icon;
                    return (
                      <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                        <div className={`p-1.5 rounded-lg ${cfg.color} shrink-0`}>
                          <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700">{cfg.label}</p>
                          {a.descripcion && (
                            <p className="text-xs text-gray-500 truncate">{a.descripcion}</p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(a.creadoEn).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                            {a.ip && a.ip !== "unknown" && <span className="ml-2">· {a.ip}</span>}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {actividadTotal > 15 && (
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <button
                      onClick={() => setActividadPage((p) => Math.max(1, p - 1))}
                      disabled={actividadPage === 1}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs text-gray-400">
                      {actividadPage} / {Math.ceil(actividadTotal / 15)}
                    </span>
                    <button
                      onClick={() => setActividadPage((p) => p + 1)}
                      disabled={actividadPage * 15 >= actividadTotal}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Sesiones</h3>
                  <span className="text-xs text-gray-400">{sesionTotal} sesiones</span>
                </div>
                <div className="space-y-2">
                  {sesiones.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">Sin sesiones registradas</p>
                  )}
                  {sesiones.map((s) => {
                    const info = parseUserAgent(s.dispositivo ? `${s.dispositivo} ${s.navegador} ${s.sistemaOp}` : s.userAgent);
                    return (
                      <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                        <div className={`p-1.5 rounded-lg ${s.fin ? "bg-gray-100 text-gray-500" : "bg-green-50 text-green-600"} shrink-0`}>
                          <Monitor size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-gray-700">
                              {new Date(s.inicio).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                            </p>
                            {!s.fin && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
                                <span className="h-1 w-1 rounded-full bg-green-500 animate-pulse" /> En curso
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {info.navegador} · {info.so} · {info.dispositivo}
                            {s.ip && s.ip !== "unknown" && <span className="ml-1">· {s.ip}</span>}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-medium text-gray-600">{formatDuracion(s.duracionSeg)}</p>
                          {s.fin && (
                            <p className="text-[10px] text-gray-400">
                              hasta {new Date(s.fin).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {sesionTotal > 10 && (
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <button
                      onClick={() => setSesionPage((p) => Math.max(1, p - 1))}
                      disabled={sesionPage === 1}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs text-gray-400">
                      {sesionPage} / {Math.ceil(sesionTotal / 10)}
                    </span>
                    <button
                      onClick={() => setSesionPage((p) => p + 1)}
                      disabled={sesionPage * 10 >= sesionTotal}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatsPanel({ desde, hasta }: { desde: string; hasta: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/actividad/stats?desde=${desde}&hasta=${hasta}`)
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, [desde, hasta]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-sm text-gray-400 text-center py-8">Error al cargar estadísticas</p>;
  }

  const maxSesionesDia = Math.max(...stats.sesionesPorDia.map((d) => d.total), 1);
  const maxHora = Math.max(...stats.horasPico.map((h) => h.total), 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Usuarios totales", value: stats.resumen.totalUsuarios },
          { label: "Actualmente activos", value: stats.resumen.usuariosActivos },
          { label: "Con sesión en periodo", value: stats.resumen.usuariosConSesion },
          { label: "Sesiones totales", value: stats.resumen.totalSesiones },
          { label: "Sesiones completadas", value: stats.resumen.sesionesCompletadas },
          { label: "Duración media", value: `${stats.resumen.duracionMediaMinutos} min` },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Sesiones por día</h4>
        <div className="flex items-end gap-1 h-32">
          {stats.sesionesPorDia.map((d) => (
            <div key={d.dia} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-blue-500 rounded-t"
                style={{ height: `${(d.total / maxSesionesDia) * 100}%`, minHeight: 2 }}
                title={`${d.dia}: ${d.total} sesiones`}
              />
              <span className="text-[9px] text-gray-400 truncate w-full text-center">
                {d.dia.slice(5)}
              </span>
            </div>
          ))}
          {stats.sesionesPorDia.length === 0 && (
            <p className="text-xs text-gray-400 w-full text-center py-4">Sin datos en el periodo</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Actividad por tipo</h4>
        <div className="space-y-2">
          {stats.actividadesPorTipo.map((a) => {
            const cfg = TIPO_ACTIVIDAD_CONFIG[a.tipo] || TIPO_ACTIVIDAD_CONFIG.action;
            const maxCount = Math.max(...stats.actividadesPorTipo.map((x) => x.count), 1);
            return (
              <div key={a.tipo} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-28 shrink-0">{cfg.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(a.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600 w-10 text-right">{a.count}</span>
              </div>
            );
          })}
          {stats.actividadesPorTipo.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">Sin datos en el periodo</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Horas pico</h4>
        <div className="flex items-end gap-0.5 h-28">
          {Array.from({ length: 24 }, (_, i) => {
            const found = stats.horasPico.find((h) => h.hora === i);
            const total = found?.total || 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-purple-500 rounded-t"
                  style={{ height: `${maxHora > 0 ? (total / maxHora) * 100 : 0}%`, minHeight: total > 0 ? 2 : 0 }}
                  title={`${i}:00 — ${total} sesiones`}
                />
                {i % 3 === 0 && (
                  <span className="text-[8px] text-gray-400">{i}h</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PresenciaPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.rol;

  const [usuarios, setUsuarios] = useState<UsuarioPresencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("presencia");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<Estado | "todos">("todos");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [selectedUser, setSelectedUser] = useState<{ id: string; nombre: string } | null>(null);

  const [historial, setHistorial] = useState<ActividadRegistro[]>([]);
  const [historialPage, setHistorialPage] = useState(1);
  const [historialTotal, setHistorialTotal] = useState(0);
  const [filtroTipoActividad, setFiltroTipoActividad] = useState("todos");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [historialLoading, setHistorialLoading] = useState(false);

  const [sesiones, setSesiones] = useState<SesionRegistro[]>([]);
  const [sesionPage, setSesionPage] = useState(1);
  const [sesionTotal, setSesionTotal] = useState(0);
  const [sesionLoading, setSesionLoading] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    const es = new EventSource("/api/presence/stream");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          setUsuarios(data);
          setConnected(true);
          setError(null);
        }
      } catch {
        // parse error
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      setTimeout(connectSSE, 5000);
    };
  }, []);

  useEffect(() => {
    connectSSE();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connectSSE]);

  const fetchHistorial = useCallback(async () => {
    setHistorialLoading(true);
    try {
      const params = new URLSearchParams({ page: historialPage.toString(), limit: "20" });
      if (filtroTipoActividad !== "todos") params.set("tipo", filtroTipoActividad);
      if (filtroFechaDesde) params.set("desde", filtroFechaDesde);
      if (filtroFechaHasta) params.set("hasta", filtroFechaHasta);
      const res = await fetch(`/api/actividad/historial?${params}`);
      if (res.ok) {
        const d = await res.json();
        setHistorial(d.data);
        setHistorialTotal(d.pagination.total);
      }
    } finally {
      setHistorialLoading(false);
    }
  }, [historialPage, filtroTipoActividad, filtroFechaDesde, filtroFechaHasta]);

  const fetchSesiones = useCallback(async () => {
    setSesionLoading(true);
    try {
      const params = new URLSearchParams({ page: sesionPage.toString(), limit: "20" });
      if (filtroFechaDesde) params.set("desde", filtroFechaDesde);
      if (filtroFechaHasta) params.set("hasta", filtroFechaHasta);
      const res = await fetch(`/api/actividad/sesiones?${params}`);
      if (res.ok) {
        const d = await res.json();
        setSesiones(d.data);
        setSesionTotal(d.pagination.total);
      }
    } finally {
      setSesionLoading(false);
    }
  }, [sesionPage, filtroFechaDesde, filtroFechaHasta]);

  useEffect(() => {
    if (activeTab === "historial") fetchHistorial();
    if (activeTab === "sesiones") fetchSesiones();
  }, [activeTab, fetchHistorial, fetchSesiones]);

  const handleExport = (tipo: "actividades" | "sesiones") => {
    const params = new URLSearchParams({ tipo, formato: "csv" });
    if (filtroFechaDesde) params.set("desde", filtroFechaDesde);
    if (filtroFechaHasta) params.set("hasta", filtroFechaHasta);
    window.open(`/api/actividad/export?${params}`, "_blank");
  };

  const conteos = usuarios.reduce(
    (acc, u) => { acc[u.estado]++; return acc; },
    { activo: 0, ausente: 0, desconectado: 0 } as Record<Estado, number>
  );

  const rolesUnicos = [...new Set(usuarios.flatMap((u) => u.roles))].sort();

  const filtrados = usuarios.filter((u) => {
    if (filtroEstado !== "todos" && u.estado !== filtroEstado) return false;
    if (filtroRol !== "todos" && !u.roles.includes(filtroRol)) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (!u.nombre.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const ordenados = [...filtrados].sort((a, b) => {
    const d = ESTADO_CONFIG[a.estado].orden - ESTADO_CONFIG[b.estado].orden;
    return d !== 0 ? d : a.nombre.localeCompare(b.nombre);
  });

  if (userRole && userRole !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center max-w-sm">
          <Activity size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No tienes permiso para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <Link
          href="/configuracion"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Volver a Configuración
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Actividad de usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitoreo de presencia y actividad en tiempo real</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-400"}`} />
          {connected ? "En tiempo real" : "Reconectando…"}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Resumen + filtros (solo en tab presencia) */}
      {activeTab === "presencia" && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(ESTADO_CONFIG) as Estado[]).map((estado) => (
              <div
                key={estado}
                className={`bg-white border rounded-xl p-4 cursor-pointer transition-all ${
                  filtroEstado === estado ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-200"
                }`}
                onClick={() => setFiltroEstado(filtroEstado === estado ? "todos" : estado)}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${ESTADO_CONFIG[estado].dot}`} />
                  <span className="text-xs font-medium text-gray-500">{ESTADO_CONFIG[estado].label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-1.5">{conteos[estado]}</p>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o email…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              />
              {busqueda && (
                <button onClick={() => setBusqueda("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>
            <select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="todos">Todos los roles</option>
              {rolesUnicos.map((r) => (
                <option key={r} value={r}>{ROL_LABELS[r] ?? r}</option>
              ))}
            </select>
            <button
              onClick={() => handleExport("actividades")}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={14} />
              Exportar
            </button>
          </div>
        </>
      )}

      {/* Filtros de fecha para historial y sesiones */}
      {(activeTab === "historial" || activeTab === "sesiones") && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <input
            type="date"
            value={filtroFechaDesde}
            onChange={(e) => setFiltroFechaDesde(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <span className="text-xs text-gray-400">a</span>
          <input
            type="date"
            value={filtroFechaHasta}
            onChange={(e) => setFiltroFechaHasta(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {(filtroFechaDesde || filtroFechaHasta) && (
            <button
              onClick={() => { setFiltroFechaDesde(""); setFiltroFechaHasta(""); }}
              className="text-xs text-blue-600 hover:underline"
            >
              Limpiar fechas
            </button>
          )}
          <div className="ml-auto">
            <button
              onClick={() => handleExport(activeTab === "historial" ? "actividades" : "sesiones")}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={14} />
              Exportar CSV
            </button>
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* TAB: Presencia */}
        {activeTab === "presencia" && (
          <>
            {error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <p className="text-sm text-red-600">{error}</p>
                <button onClick={connectSSE} className="mt-3 text-sm text-blue-600 hover:underline">
                  Reconectar
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["Estado", "Nombre", "Perfiles", "Frentes", "Última actividad", "Última conexión", ""].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ordenados.map((u) => {
                      const cfg = ESTADO_CONFIG[u.estado];
                      return (
                        <tr key={u.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedUser({ id: u.id, nombre: u.nombre })}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.pill}`}>
                              <span className={`h-2 w-2 rounded-full ${cfg.dot} ${u.estado === "activo" ? "animate-pulse" : ""}`} />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-sm font-medium text-gray-900">{u.nombre}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {(Array.isArray(u.roles) ? u.roles : []).map((r) => (
                                <span
                                  key={r}
                                  className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 whitespace-nowrap"
                                >
                                  {ROL_LABELS[r] ?? r}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {u.frentes?.slice(0, 2).map((f) => (
                                <span key={f.id} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 whitespace-nowrap">
                                  {f.nombre}
                                </span>
                              ))}
                              {(u.frentes?.length || 0) > 2 && (
                                <span className="text-[10px] text-gray-400">+{u.frentes.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {tiempoRelativo(u.ultimaActividad)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {u.ultimaConexion
                              ? formatDateTime(u.ultimaConexion)
                              : <span className="text-gray-300 italic">Nunca</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button className="text-xs text-blue-600 hover:underline">Ver detalle</button>
                          </td>
                        </tr>
                      );
                    })}
                    {ordenados.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                          No se encontraron usuarios
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* TAB: Historial */}
        {activeTab === "historial" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <select
                value={filtroTipoActividad}
                onChange={(e) => { setFiltroTipoActividad(e.target.value); setHistorialPage(1); }}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="todos">Todos los tipos</option>
                {Object.entries(TIPO_ACTIVIDAD_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400">{historialTotal} registros</span>
            </div>
            {historialLoading ? (
              <div className="flex items-center justify-center py-12"><Spinner /></div>
            ) : (
              <div className="space-y-1">
                {historial.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">Sin registros</p>
                )}
                {historial.map((a) => {
                  const cfg = TIPO_ACTIVIDAD_CONFIG[a.tipo] || TIPO_ACTIVIDAD_CONFIG.action;
                  const Icon = cfg.icon;
                  return (
                    <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`p-2 rounded-lg ${cfg.color} shrink-0`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-900">{a.user.nombre}</span>
                          <span className="text-xs text-gray-500">{cfg.label}</span>
                        </div>
                        {a.descripcion && <p className="text-xs text-gray-500 mt-0.5">{a.descripcion}</p>}
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(a.creadoEn).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                          {a.ip && a.ip !== "unknown" && <span className="ml-2">· {a.ip}</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {historialTotal > 20 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setHistorialPage((p) => Math.max(1, p - 1))}
                  disabled={historialPage === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-gray-400">{historialPage} / {Math.ceil(historialTotal / 20)}</span>
                <button
                  onClick={() => setHistorialPage((p) => p + 1)}
                  disabled={historialPage * 20 >= historialTotal}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB: Sesiones */}
        {activeTab === "sesiones" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">{sesionTotal} sesiones</span>
            </div>
            {sesionLoading ? (
              <div className="flex items-center justify-center py-12"><Spinner /></div>
            ) : (
              <div className="space-y-1">
                {sesiones.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">Sin sesiones</p>
                )}
                {sesiones.map((s) => {
                  const info = parseUserAgent(s.userAgent);
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`p-2 rounded-lg ${s.fin ? "bg-gray-100 text-gray-500" : "bg-green-50 text-green-600"} shrink-0`}>
                        <Monitor size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-900">{s.user.nombre}</span>
                          {!s.fin && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
                              <span className="h-1 w-1 rounded-full bg-green-500 animate-pulse" /> En curso
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {info.navegador} · {info.so} · {info.dispositivo}
                          {s.ip && s.ip !== "unknown" && <span className="ml-1">· {s.ip}</span>}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium text-gray-600">{formatDuracion(s.duracionSeg)}</p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(s.inicio).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                        {s.fin && (
                          <p className="text-[10px] text-gray-400">
                            → {new Date(s.fin).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {sesionTotal > 20 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setSesionPage((p) => Math.max(1, p - 1))}
                  disabled={sesionPage === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-gray-400">{sesionPage} / {Math.ceil(sesionTotal / 20)}</span>
                <button
                  onClick={() => setSesionPage((p) => p + 1)}
                  disabled={sesionPage * 20 >= sesionTotal}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB: Estadísticas */}
        {activeTab === "estadisticas" && (
          <div className="p-4">
            <StatsPanel
              desde={filtroFechaDesde || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
              hasta={filtroFechaHasta || new Date().toISOString().split("T")[0]}
            />
          </div>
        )}
      </div>

      {/* Modal detalle usuario */}
      {selectedUser && (
        <UserDetailModal
          userId={selectedUser.id}
          userName={selectedUser.nombre}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
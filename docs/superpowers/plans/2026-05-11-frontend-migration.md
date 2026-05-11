# Frontend Migration Plan (solicitudes-indirectos → nuevo-proyecto)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all 16 pages + components from the Next.js `solicitudes-indirectos` app into the React+Vite `nuevo-proyecto/frontend/`, calling the Express backend at `http://localhost:4000`.

**Architecture:** React 18 SPA with React Router v7, MSAL for Azure AD auth, and a centralized fetch wrapper that attaches Bearer tokens. Every page that was a Next.js Server Component becomes a client component that fetches from the API on mount. Next-auth `useSession` is replaced by a custom `AuthContext` built on MSAL's `useMsal`.

**Tech Stack:** React 18 · Vite · React Router DOM v7 · @azure/msal-react · Tailwind CSS v4 · react-hook-form · lucide-react · clsx · tailwind-merge

---

## File Map

```
nuevo-proyecto/frontend/src/
  lib/
    api.js               ← centralized fetch wrapper (Bearer token)
    utils.js             ← cn(), formatDate, formatCurrency, constants (ESTADO_LABELS, etc.)
  contexts/
    AuthContext.jsx      ← wraps MSAL, provides { user, roles, funcionalidades }
  components/
    ProtectedRoute.jsx   ← updated: uses AuthContext
    layout/
      AppLayout.jsx      ← sidebar + header + user menu
      NotificacionesBell.jsx ← SSE bell
    ui/
      button.jsx
      input.jsx
      select.jsx
      textarea.jsx
      modal.jsx
      badge.jsx
      spinner.jsx
      toaster.jsx        ← includes useToast hook
      card.jsx
    solicitudes/
      SolicitudBadge.jsx
      SolicitudActions.jsx
      EstadoTimeline.jsx
  pages/
    Login.jsx            ← already exists, keep
    Dashboard.jsx        ← rewrite
    solicitudes/
      SolicitudesPage.jsx
      NuevaSolicitudPage.jsx    ← tipo selector
      SolicitudContratoForm.jsx ← the big 800-line form
      SolicitudDetallePage.jsx
      SolicitudEditarPage.jsx
    terceros/
      TercerosPage.jsx
      NuevoTerceroPage.jsx
      TerceroDetallePage.jsx
    configuracion/
      ConfiguracionPage.jsx
      FrentesPage.jsx
      FrenteDetallePage.jsx
      UsuariosPage.jsx
      AprobadoresPage.jsx
    PerfilPage.jsx
  App.jsx                ← all routes wired
```

---

## Task 1: Install dependencies

**Files:**
- Modify: `nuevo-proyecto/frontend/package.json`

- [ ] **Step 1: Install missing packages**

```bash
cd nuevo-proyecto/frontend
npm install clsx tailwind-merge react-hook-form
```

- [ ] **Step 2: Verify package.json has these deps**

Check `package.json` dependencies include `clsx`, `tailwind-merge`, `react-hook-form`.

- [ ] **Step 3: Commit**

```bash
git add nuevo-proyecto/frontend/package.json nuevo-proyecto/frontend/package-lock.json
git commit -m "chore: add clsx, tailwind-merge, react-hook-form to frontend"
```

---

## Task 2: Create `src/lib/utils.js`

**Files:**
- Create: `nuevo-proyecto/frontend/src/lib/utils.js`

- [ ] **Step 1: Create the file**

```js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value) {
  if (value === null || value === undefined) return "$0";
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(num);
}

export function formatDate(date) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date) {
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

export const ESTADO_LABELS = {
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

export const ESTADO_COLORS = {
  BORRADOR: "bg-gray-100 text-gray-700",
  ENVIADA: "bg-blue-100 text-blue-700",
  APROBADA_DIRECTOR: "bg-indigo-100 text-indigo-700",
  EN_REVISION: "bg-yellow-100 text-yellow-700",
  EN_TRAMITE_CONTRATOS: "bg-purple-100 text-purple-700",
  CREACION_MINUTA: "bg-orange-100 text-orange-700",
  ENVIO_CONTRATO_POLIZAS: "bg-cyan-100 text-cyan-700",
  EN_CONTROLES: "bg-teal-100 text-teal-700",
  APROBACION_FINAL: "bg-lime-100 text-lime-700",
  COMPLETADA: "bg-green-600 text-white",
  DEVUELTA: "bg-red-100 text-red-700",
};

export const TIPO_SOLICITUD_LABELS = {
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

export const ACCION_LABELS = {
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

export const ACCION_COLOR = {
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

export const ACCION_ESTADO_DESTINO = {
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

export const ROL_LABELS = {
  SOLICITANTE: "Solicitante",
  DIRECTOR_PROYECTO: "Director de Proyecto",
  CONTRATOS: "Contratos",
  CONTROLES: "Coordinador Controles",
  DIRECTOR_CONTROLES: "Director de Controles",
  ADMIN: "Administrador",
};

export const FUNCIONALIDADES_POR_ROL = {
  SOLICITANTE: ["crear_enviar_solicitudes", "reenviar_solicitudes", "ver_solicitudes_propias"],
  DIRECTOR_PROYECTO: [
    "crear_enviar_solicitudes", "reenviar_solicitudes", "ver_solicitudes_propias",
    "aprobar_solicitudes_frente", "devolver_solicitudes", "ver_solicitudes_frentes",
  ],
  CONTRATOS: [
    "ver_todas_solicitudes", "devolver_solicitudes", "revisar_contratos",
    "tramitar_solicitudes", "crear_minutas", "pasar_controles",
  ],
  CONTROLES: ["ver_todas_solicitudes", "registrar_adpro"],
  DIRECTOR_CONTROLES: ["ver_todas_solicitudes", "aprobacion_final"],
  ADMIN: ["*"],
};

export function tienePermiso(roles, funcionalidadesAdicionales, slug) {
  if (roles.includes("ADMIN")) return true;
  const base = roles.flatMap((r) => FUNCIONALIDADES_POR_ROL[r] ?? []);
  const all = [...new Set([...base, ...(funcionalidadesAdicionales ?? [])])];
  return all.includes(slug);
}
```

- [ ] **Step 2: Commit**

```bash
git add nuevo-proyecto/frontend/src/lib/utils.js
git commit -m "feat: add frontend utils (cn, formatters, constants)"
```

---

## Task 3: Create `src/lib/api.js`

**Files:**
- Create: `nuevo-proyecto/frontend/src/lib/api.js`

This module exports a function that returns a fetch wrapper pre-loaded with the MSAL Bearer token.

- [ ] **Step 1: Create the file**

```js
import { msalInstance } from "../main.jsx";
import { loginRequest } from "../auth/msalConfig.js";

async function getToken() {
  const accounts = msalInstance.getAllAccounts();
  if (!accounts.length) throw new Error("No account");
  const result = await msalInstance.acquireTokenSilent({
    ...loginRequest,
    account: accounts[0],
  });
  return result.accessToken;
}

const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function apiFetch(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || res.statusText), { status: res.status, body });
  }
  // Some endpoints return non-JSON (blobs)
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return res.json();
  return res;
}

export async function apiGet(path) {
  return apiFetch(path, { method: "GET" });
}

export async function apiPost(path, body) {
  return apiFetch(path, { method: "POST", body: JSON.stringify(body) });
}

export async function apiPatch(path, body) {
  return apiFetch(path, { method: "PATCH", body: JSON.stringify(body) });
}

export async function apiDelete(path) {
  return apiFetch(path, { method: "DELETE" });
}

export async function apiUpload(path, formData) {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || res.statusText), { status: res.status });
  }
  return res.json();
}

export async function getBearerToken() {
  return getToken();
}
```

- [ ] **Step 2: Export msalInstance from main.jsx**

Open `nuevo-proyecto/frontend/src/main.jsx` and export the instance:

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "./auth/msalConfig.js";
import App from "./App.jsx";
import "./index.css";

export const msalInstance = new PublicClientApplication(msalConfig);

msalInstance.initialize().then(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <App instance={msalInstance} />
  );
});
```

- [ ] **Step 3: Commit**

```bash
git add nuevo-proyecto/frontend/src/lib/api.js nuevo-proyecto/frontend/src/main.jsx
git commit -m "feat: add API fetch wrapper with MSAL Bearer token"
```

---

## Task 4: Auth context

**Files:**
- Create: `nuevo-proyecto/frontend/src/contexts/AuthContext.jsx`
- Modify: `nuevo-proyecto/frontend/src/components/ProtectedRoute.jsx`

- [ ] **Step 1: Create AuthContext**

```jsx
import { createContext, useContext, useMemo } from "react";
import { useMsal } from "@azure/msal-react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { accounts } = useMsal();
  const account = accounts[0];

  const user = useMemo(() => {
    if (!account) return null;
    const claims = account.idTokenClaims ?? {};
    // Backend stores extra claims; we parse them from the token if present,
    // otherwise they'll come from /api/usuarios/me on first load.
    return {
      id: claims.oid ?? account.localAccountId,
      name: account.name ?? claims.name,
      email: account.username,
      roles: claims.roles ?? [],
      funcionalidades: claims.funcionalidades ?? [],
    };
  }, [account]);

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
```

> Note: The backend's `/api/usuarios/me` returns `{ roles, funcionalidadesAdicionales }` from the DB. Pages that need roles should call this endpoint on mount and store the result in state, not rely solely on the JWT claims (which won't have app-specific roles). See Task 5 for the `useMe` hook.

- [ ] **Step 2: Create `src/hooks/useMe.js`**

```js
import { useState, useEffect } from "react";
import { apiGet } from "../lib/api.js";

export function useMe() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/api/usuarios/me")
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  return { me, loading };
}
```

- [ ] **Step 3: Update ProtectedRoute.jsx**

```jsx
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { Navigate } from "react-router-dom";
import { Spinner } from "./ui/spinner.jsx";

export function ProtectedRoute({ children }) {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress } = useMsal();

  if (inProgress !== "none") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
```

- [ ] **Step 4: Commit**

```bash
git add nuevo-proyecto/frontend/src/contexts/ nuevo-proyecto/frontend/src/hooks/ nuevo-proyecto/frontend/src/components/ProtectedRoute.jsx
git commit -m "feat: add AuthContext and useMe hook"
```

---

## Task 5: UI primitives

**Files:**
- Create: `nuevo-proyecto/frontend/src/components/ui/button.jsx`
- Create: `nuevo-proyecto/frontend/src/components/ui/input.jsx`
- Create: `nuevo-proyecto/frontend/src/components/ui/select.jsx`
- Create: `nuevo-proyecto/frontend/src/components/ui/textarea.jsx`
- Create: `nuevo-proyecto/frontend/src/components/ui/modal.jsx`
- Create: `nuevo-proyecto/frontend/src/components/ui/badge.jsx`
- Create: `nuevo-proyecto/frontend/src/components/ui/spinner.jsx`
- Create: `nuevo-proyecto/frontend/src/components/ui/toaster.jsx`
- Create: `nuevo-proyecto/frontend/src/components/ui/card.jsx`

- [ ] **Step 1: Create `button.jsx`**

```jsx
import { cn } from "../../lib/utils.js";

const VARIANTS = {
  default: "bg-blue-600 text-white hover:bg-blue-700",
  outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
  ghost: "text-gray-600 hover:bg-gray-100",
  destructive: "bg-red-600 text-white hover:bg-red-700",
  success: "bg-green-600 text-white hover:bg-green-700",
};

const SIZES = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-10 px-5 text-sm",
};

export function Button({ variant = "default", size = "md", className, disabled, children, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        VARIANTS[variant],
        SIZES[size],
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Create `spinner.jsx`**

```jsx
import { cn } from "../../lib/utils.js";

export function Spinner({ className }) {
  return (
    <svg
      className={cn("animate-spin h-5 w-5 text-blue-600", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}
```

- [ ] **Step 3: Create `input.jsx`**

```jsx
import { cn } from "../../lib/utils.js";
import { forwardRef } from "react";

export const Input = forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
```

- [ ] **Step 4: Create `textarea.jsx`**

```jsx
import { cn } from "../../lib/utils.js";
import { forwardRef } from "react";

export const Textarea = forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 resize-y",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
```

- [ ] **Step 5: Create `select.jsx`**

```jsx
import { cn } from "../../lib/utils.js";
import { forwardRef } from "react";

export const Select = forwardRef(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
```

- [ ] **Step 6: Create `badge.jsx`**

```jsx
import { cn } from "../../lib/utils.js";

export function Badge({ className, children }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", className)}>
      {children}
    </span>
  );
}
```

- [ ] **Step 7: Create `card.jsx`**

```jsx
import { cn } from "../../lib/utils.js";

export function Card({ className, children }) {
  return (
    <div className={cn("bg-white rounded-xl border border-gray-200 p-6", className)}>
      {children}
    </div>
  );
}
```

- [ ] **Step 8: Create `modal.jsx`**

```jsx
import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils.js";

export function Modal({ open, onClose, title, children, className }) {
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className={cn("relative z-50 w-full max-w-md rounded-xl bg-white shadow-xl", className)}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Create `toaster.jsx`**

```jsx
import { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "../../lib/utils.js";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, description, variant = "default" }) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, description, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const remove = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const ICONS = { success: CheckCircle, destructive: AlertCircle, default: Info };
  const COLORS = {
    success: "border-green-200 bg-green-50 text-green-800",
    destructive: "border-red-200 bg-red-50 text-red-800",
    default: "border-blue-200 bg-blue-50 text-blue-800",
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
        {toasts.map((t) => {
          const Icon = ICONS[t.variant] ?? Info;
          return (
            <div key={t.id} className={cn("flex items-start gap-3 rounded-xl border p-4 shadow-lg", COLORS[t.variant])}>
              <Icon size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                {t.title && <p className="text-sm font-semibold leading-snug">{t.title}</p>}
                {t.description && <p className="text-xs mt-0.5 opacity-80">{t.description}</p>}
              </div>
              <button onClick={() => remove(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
```

- [ ] **Step 10: Commit**

```bash
git add nuevo-proyecto/frontend/src/components/ui/
git commit -m "feat: add UI primitives (button, input, select, textarea, modal, badge, spinner, toaster, card)"
```

---

## Task 6: AppLayout + NotificacionesBell

**Files:**
- Create: `nuevo-proyecto/frontend/src/components/layout/NotificacionesBell.jsx`
- Create: `nuevo-proyecto/frontend/src/components/layout/AppLayout.jsx`

- [ ] **Step 1: Create `NotificacionesBell.jsx`**

Adapt source `solicitudes-indirectos/src/components/layout/NotificacionesBell.tsx`:
- Replace `useRouter` from next with `useNavigate` from react-router-dom
- Replace `fetch("/api/...")` with `apiFetch("/api/...")` from lib/api
- SSE URL becomes `http://localhost:4000/api/notificaciones/stream` with Bearer header (EventSource doesn't support headers — use a workaround: pass token as query param, or use fetch+ReadableStream)

```jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { apiFetch, getBearerToken } from "../../lib/api.js";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function NotificacionesBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [totalNoLeidas, setTotalNoLeidas] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const [newPulse, setNewPulse] = useState(false);
  const panelRef = useRef(null);
  const prevCountRef = useRef(0);
  const abortRef = useRef(null);

  const fetchNotificaciones = useCallback(async () => {
    try {
      const data = await apiFetch("/api/notificaciones");
      setNotificaciones(data.notificaciones?.slice(0, 10) ?? []);
      setTotalNoLeidas(data.totalNoLeidas ?? 0);
      prevCountRef.current = data.totalNoLeidas ?? 0;
    } catch { /* silent */ }
  }, []);

  // SSE via fetch (supports Authorization header)
  useEffect(() => {
    fetchNotificaciones();
    let active = true;
    let retryTimeout;

    async function connect() {
      try {
        const token = await getBearerToken();
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        const res = await fetch(`${BASE}/api/notificaciones/stream`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        });
        if (!res.body) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (active) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop();
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            try {
              const { totalNoLeidas: newCount } = JSON.parse(line.slice(5).trim());
              if (newCount > prevCountRef.current) {
                fetchNotificaciones();
                setNewPulse(true);
                setTimeout(() => setNewPulse(false), 2000);
              }
              setTotalNoLeidas(newCount);
              prevCountRef.current = newCount;
            } catch { /* ignore malformed */ }
          }
        }
      } catch (err) {
        if (!active) return;
        retryTimeout = setTimeout(connect, 15_000);
      }
    }

    connect();
    return () => {
      active = false;
      abortRef.current?.abort();
      clearTimeout(retryTimeout);
    };
  }, [fetchNotificaciones]);

  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleNotificacionClick(notif) {
    if (!notif.leida) {
      try {
        await apiFetch("/api/notificaciones", {
          method: "PATCH",
          body: JSON.stringify({ id: notif.id }),
        });
        setNotificaciones((prev) => prev.map((n) => (n.id === notif.id ? { ...n, leida: true } : n)));
        setTotalNoLeidas((c) => { const next = Math.max(0, c - 1); prevCountRef.current = next; return next; });
      } catch { /* ignore */ }
    }
    setOpen(false);
    if (notif.url) navigate(notif.url);
  }

  async function handleMarkAll() {
    setMarkingAll(true);
    try {
      await apiFetch("/api/notificaciones", { method: "PATCH", body: JSON.stringify({ all: true }) });
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setTotalNoLeidas(0);
      prevCountRef.current = 0;
    } catch { /* ignore */ } finally { setMarkingAll(false); }
  }

  function formatRelative(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Ahora";
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} día${days !== 1 ? "s" : ""}`;
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label={`Notificaciones${totalNoLeidas > 0 ? ` (${totalNoLeidas} sin leer)` : ""}`}
      >
        <Bell size={20} className={newPulse ? "animate-bounce text-blue-500" : undefined} />
        {totalNoLeidas > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4">
            {newPulse && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />}
            <span className="relative flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {totalNoLeidas > 99 ? "99+" : totalNoLeidas}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 z-50 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Notificaciones</h3>
            {totalNoLeidas > 0 && (
              <button onClick={handleMarkAll} disabled={markingAll}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50">
                <CheckCheck size={13} />Marcar todas como leídas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {notificaciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell size={28} className="text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No tienes notificaciones</p>
              </div>
            ) : notificaciones.map((notif) => (
              <button key={notif.id} onClick={() => handleNotificacionClick(notif)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${!notif.leida ? "bg-blue-50/60" : ""}`}>
                <div className="flex items-start gap-2">
                  {!notif.leida && <span className="mt-1.5 shrink-0 h-2 w-2 rounded-full bg-blue-500" />}
                  <div className={`flex-1 min-w-0 ${notif.leida ? "pl-4" : ""}`}>
                    <p className="text-sm font-medium text-gray-900 leading-snug truncate">{notif.titulo}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">{notif.mensaje}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatRelative(notif.creadoEn)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `AppLayout.jsx`**

Adapt `solicitudes-indirectos/src/components/layout/AppLayout.tsx`:
- Replace `Link` from next/link → `Link` from react-router-dom
- Replace `usePathname()` → `useLocation().pathname`
- Replace `useRouter()` + `signOut()` → `useMsal()` + `instance.logoutPopup()`
- Replace `useSession()` → `useMe()` hook for DB user, `useMsal()` for name/email

```jsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import {
  LayoutDashboard, Plus, FileText, Users, Settings,
  LogOut, Menu, X, ChevronDown, UserCircle,
} from "lucide-react";
import { NotificacionesBell } from "./NotificacionesBell.jsx";
import { ROL_LABELS, tienePermiso } from "../../lib/utils.js";
import { useMe } from "../../hooks/useMe.js";

const NAV_ITEMS = [
  { label: "Dashboard",       href: "/dashboard",        icon: LayoutDashboard },
  { label: "Nueva Solicitud", href: "/solicitudes/nueva", icon: Plus },
  { label: "Solicitudes",     href: "/solicitudes",       icon: FileText },
  { label: "Terceros",        href: "/terceros",          icon: Users },
  { label: "Configuración",   href: "/configuracion",     icon: Settings, roles: ["ADMIN", "DIRECTOR_CONTROLES"] },
  { label: "Mi Perfil",       href: "/perfil",            icon: UserCircle },
];

function getInitials(name) {
  if (!name) return "U";
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function NavLink({ item, active, collapsed, onClick }) {
  const Icon = item.icon;
  return (
    <Link to={item.href} onClick={onClick} title={collapsed ? item.label : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 group
        ${active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}
        ${collapsed ? "justify-center" : ""}`}>
      <Icon size={18} className={`shrink-0 ${active ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`} />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function Sidebar({ collapsed, userRoles, funcionalidades, pathname, onClose }) {
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles && !item.permission) return true;
    const roleMatch = item.roles ? item.roles.some((r) => userRoles.includes(r)) : false;
    const permMatch = item.permission ? tienePermiso(userRoles, funcionalidades, item.permission) : false;
    return roleMatch || permMatch;
  });

  return (
    <aside className={`flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-200 ${collapsed ? "w-16" : "w-60"}`}>
      <div className={`flex items-center gap-3 px-4 h-16 border-b border-gray-100 shrink-0 ${collapsed ? "justify-center" : ""}`}>
        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">BK</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">Baia Kristal</p>
            <p className="text-xs text-gray-400 truncate">Indirectos</p>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        {visibleItems.map((item) => {
          const active = item.href === "/dashboard"
            ? pathname === "/" || pathname === "/dashboard"
            : pathname.startsWith(item.href);
          return <NavLink key={item.href} item={item} active={active} collapsed={collapsed} onClick={onClose} />;
        })}
      </nav>
    </aside>
  );
}

export function AppLayout({ children }) {
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { me } = useMe();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userRoles = me?.roles ?? [];
  const funcionalidades = me?.funcionalidadesAdicionales ?? [];
  const userName = account?.name;
  const userEmail = account?.username;

  async function handleLogout() {
    try { await instance.logoutPopup(); } catch { /* ignore */ }
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden lg:flex flex-shrink-0 sticky top-0 h-screen">
        <Sidebar collapsed={sidebarCollapsed} userRoles={userRoles} funcionalidades={funcionalidades} pathname={pathname} />
      </div>

      {mobileSidebarOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-40 lg:hidden">
            <Sidebar collapsed={false} userRoles={userRoles} funcionalidades={funcionalidades} pathname={pathname}
              onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 shrink-0 gap-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileSidebarOpen(true)} className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100">
              <Menu size={20} />
            </button>
            <button onClick={() => setSidebarCollapsed((v) => !v)} className="hidden lg:flex p-2 rounded-md text-gray-500 hover:bg-gray-100">
              {sidebarCollapsed ? <Menu size={18} /> : <X size={18} />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <NotificacionesBell />
            <div className="relative">
              <button onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                  {getInitials(userName)}
                </span>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900 leading-tight max-w-[120px] truncate">{userName ?? "Usuario"}</p>
                  <p className="text-xs text-gray-400 leading-tight max-w-[140px] truncate">
                    {userRoles.map((r) => ROL_LABELS[r] ?? r).join(" · ")}
                  </p>
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 z-20 w-56 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">{userName ?? "Usuario"}</p>
                      <p className="text-xs text-gray-400 truncate">{userEmail}</p>
                    </div>
                    <Link to="/perfil" onClick={() => setUserMenuOpen(false)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      <UserCircle size={15} />Mi Perfil
                    </Link>
                    <button onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                      <LogOut size={15} />Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 min-h-[calc(100vh-64px)]">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add nuevo-proyecto/frontend/src/components/layout/
git commit -m "feat: add AppLayout with collapsible sidebar and NotificacionesBell SSE"
```

---

## Task 7: Wire up App.jsx + ToastProvider

**Files:**
- Modify: `nuevo-proyecto/frontend/src/App.jsx`

- [ ] **Step 1: Rewrite App.jsx with all routes**

```jsx
import { MsalProvider } from "@azure/msal-react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { AppLayout } from "./components/layout/AppLayout.jsx";
import { ToastProvider } from "./components/ui/toaster.jsx";
import { Login } from "./pages/Login.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { SolicitudesPage } from "./pages/solicitudes/SolicitudesPage.jsx";
import { NuevaSolicitudPage } from "./pages/solicitudes/NuevaSolicitudPage.jsx";
import { SolicitudContratoForm } from "./pages/solicitudes/SolicitudContratoForm.jsx";
import { SolicitudDetallePage } from "./pages/solicitudes/SolicitudDetallePage.jsx";
import { SolicitudEditarPage } from "./pages/solicitudes/SolicitudEditarPage.jsx";
import { TercerosPage } from "./pages/terceros/TercerosPage.jsx";
import { NuevoTerceroPage } from "./pages/terceros/NuevoTerceroPage.jsx";
import { TerceroDetallePage } from "./pages/terceros/TerceroDetallePage.jsx";
import { ConfiguracionPage } from "./pages/configuracion/ConfiguracionPage.jsx";
import { FrentesPage } from "./pages/configuracion/FrentesPage.jsx";
import { FrenteDetallePage } from "./pages/configuracion/FrenteDetallePage.jsx";
import { UsuariosPage } from "./pages/configuracion/UsuariosPage.jsx";
import { AprobadoresPage } from "./pages/configuracion/AprobadoresPage.jsx";
import { PerfilPage } from "./pages/PerfilPage.jsx";

function AuthenticatedApp() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/solicitudes" element={<SolicitudesPage />} />
        <Route path="/solicitudes/nueva" element={<NuevaSolicitudPage />} />
        <Route path="/solicitudes/nueva/CONTRATO" element={<SolicitudContratoForm />} />
        <Route path="/solicitudes/nueva/:tipo" element={<SolicitudContratoForm />} />
        <Route path="/solicitudes/:id" element={<SolicitudDetallePage />} />
        <Route path="/solicitudes/:id/editar" element={<SolicitudEditarPage />} />
        <Route path="/terceros" element={<TercerosPage />} />
        <Route path="/terceros/nuevo" element={<NuevoTerceroPage />} />
        <Route path="/terceros/:id" element={<TerceroDetallePage />} />
        <Route path="/configuracion" element={<ConfiguracionPage />} />
        <Route path="/configuracion/frentes" element={<FrentesPage />} />
        <Route path="/configuracion/frentes/:id" element={<FrenteDetallePage />} />
        <Route path="/configuracion/usuarios" element={<UsuariosPage />} />
        <Route path="/configuracion/aprobadores" element={<AprobadoresPage />} />
        <Route path="/perfil" element={<PerfilPage />} />
      </Routes>
    </AppLayout>
  );
}

export default function App({ instance }) {
  return (
    <MsalProvider instance={instance}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<ProtectedRoute><AuthenticatedApp /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </MsalProvider>
  );
}
```

- [ ] **Step 2: Create placeholder files for all pages** (so the app compiles)

Create each page file with a minimal export. Run `npm run dev` and verify the app loads to `/login`.

```bash
# Create all page directories
mkdir -p nuevo-proyecto/frontend/src/pages/solicitudes
mkdir -p nuevo-proyecto/frontend/src/pages/terceros
mkdir -p nuevo-proyecto/frontend/src/pages/configuracion
```

For each page, create a stub:
```jsx
// Example: src/pages/solicitudes/SolicitudesPage.jsx
export function SolicitudesPage() { return <div>Solicitudes</div>; }
```

Stub all 16 page exports listed in the routes above.

- [ ] **Step 3: Run dev and verify app loads**

```bash
cd nuevo-proyecto/frontend && npm run dev
```

Open http://localhost:5173 — should redirect to /login.

- [ ] **Step 4: Commit**

```bash
git add nuevo-proyecto/frontend/src/App.jsx nuevo-proyecto/frontend/src/pages/
git commit -m "feat: wire up all routes and add page stubs"
```

---

## Task 8: Dashboard page

**Files:**
- Modify: `nuevo-proyecto/frontend/src/pages/Dashboard.jsx`

Source: `solicitudes-indirectos/src/app/(app)/dashboard/page.tsx`

The source is a server component that queries Prisma directly. Here it becomes a client component calling `GET /api/dashboard/stats`.

- [ ] **Step 1: Implement Dashboard.jsx**

```jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FileText, Clock, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { SolicitudBadge } from "../components/solicitudes/SolicitudBadge.jsx";
import { Spinner } from "../components/ui/spinner.jsx";
import { TIPO_SOLICITUD_LABELS, formatDate } from "../lib/utils.js";
import { apiGet } from "../lib/api.js";

function StatCard({ label, value, icon: Icon, colorClass, href }) {
  const inner = (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4 transition-colors hover:border-blue-200">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 leading-snug">{label}</p>
      </div>
    </div>
  );
  if (href) return <Link to={href}>{inner}</Link>;
  return inner;
}

export function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recientes, setRecientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet("/api/dashboard/stats"),
      apiGet("/api/solicitudes?limit=5&page=0"),
    ])
      .then(([s, r]) => {
        setStats(s);
        setRecientes(r.solicitudes ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen de actividad de solicitudes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total solicitudes" value={stats?.total ?? 0} icon={FileText}
          colorClass="bg-blue-50 text-blue-600" href="/solicitudes" />
        <StatCard label="En proceso" value={stats?.activas ?? 0} icon={Clock}
          colorClass="bg-yellow-50 text-yellow-600" href="/solicitudes" />
        <StatCard label="Requieren acción" value={stats?.pendientes ?? 0} icon={AlertCircle}
          colorClass="bg-red-50 text-red-600" />
        <StatCard label="Completadas este mes" value={stats?.completadasMes ?? 0} icon={CheckCircle2}
          colorClass="bg-green-50 text-green-600" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Solicitudes recientes</h2>
          <Link to="/solicitudes" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Ver todas <ArrowRight size={13} />
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recientes.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-gray-400 text-sm">
              <FileText size={28} className="mb-2 text-gray-200" />
              No hay solicitudes aún
            </div>
          ) : recientes.map((s) => (
            <Link key={s.id} to={`/solicitudes/${s.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{s.consecutivo}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {TIPO_SOLICITUD_LABELS[s.tipo] ?? s.tipo} · {s.solicitante?.nombre} · {formatDate(s.fechaSolicitud)}
                </p>
              </div>
              <SolicitudBadge estado={s.estado} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/solicitudes/SolicitudBadge.jsx`**

```jsx
import { Badge } from "../ui/badge.jsx";
import { ESTADO_LABELS, ESTADO_COLORS } from "../../lib/utils.js";

export function SolicitudBadge({ estado }) {
  return (
    <Badge className={ESTADO_COLORS[estado] ?? "bg-gray-100 text-gray-700"}>
      {ESTADO_LABELS[estado] ?? estado}
    </Badge>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add nuevo-proyecto/frontend/src/pages/Dashboard.jsx nuevo-proyecto/frontend/src/components/solicitudes/SolicitudBadge.jsx
git commit -m "feat: implement Dashboard page with stats and recent solicitudes"
```

---

## Task 9: Solicitudes list page

**Files:**
- Modify: `nuevo-proyecto/frontend/src/pages/solicitudes/SolicitudesPage.jsx`

Source: `solicitudes-indirectos/src/app/(app)/solicitudes/page.tsx`

- [ ] **Step 1: Implement SolicitudesPage.jsx**

```jsx
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, Search, ChevronLeft, ChevronRight, FileText,
  SlidersHorizontal, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { SolicitudBadge } from "../../components/solicitudes/SolicitudBadge.jsx";
import { Button } from "../../components/ui/button.jsx";
import { Spinner } from "../../components/ui/spinner.jsx";
import { ESTADO_LABELS, TIPO_SOLICITUD_LABELS, formatCurrency, formatDate } from "../../lib/utils.js";
import { apiGet } from "../../lib/api.js";

const ESTADO_OPTIONS = Object.entries(ESTADO_LABELS).map(([value, label]) => ({ value, label }));
const TIPO_OPTIONS = Object.entries(TIPO_SOLICITUD_LABELS).map(([value, label]) => ({ value, label }));
const PAGE_SIZE = 15;

export function SolicitudesPage() {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [frentes, setFreentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterProyecto, setFilterProyecto] = useState("");
  const [filterFrente, setFilterFrente] = useState("");
  const [filterFechaDesde, setFilterFechaDesde] = useState("");
  const [filterFechaHasta, setFilterFechaHasta] = useState("");
  const [filterValorMin, setFilterValorMin] = useState("");
  const [filterValorMax, setFilterValorMax] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    Promise.all([apiGet("/api/proyectos"), apiGet("/api/frentes")])
      .then(([p, f]) => { setProyectos(p ?? []); setFreentes(f ?? []); })
      .catch(console.error);
  }, []);

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page);
      params.set("limit", PAGE_SIZE);
      if (search) params.set("search", search);
      if (filterEstado) params.set("estado", filterEstado);
      if (filterTipo) params.set("tipo", filterTipo);
      if (filterProyecto) params.set("proyectoId", filterProyecto);
      if (filterFrente) params.set("frenteId", filterFrente);
      if (filterFechaDesde) params.set("fechaDesde", filterFechaDesde);
      if (filterFechaHasta) params.set("fechaHasta", filterFechaHasta);
      if (filterValorMin) params.set("valorMin", filterValorMin);
      if (filterValorMax) params.set("valorMax", filterValorMax);
      const data = await apiGet(`/api/solicitudes?${params}`);
      setSolicitudes(data.solicitudes ?? []);
      setTotal(data.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, filterEstado, filterTipo, filterProyecto, filterFrente, filterFechaDesde, filterFechaHasta, filterValorMin, filterValorMax]);

  useEffect(() => { fetchSolicitudes(); }, [fetchSolicitudes]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const filteredFreentes = filterProyecto
    ? frentes.filter((f) => String(f.proyecto?.id) === filterProyecto)
    : frentes;

  function clearFilters() {
    setSearch(""); setFilterEstado(""); setFilterTipo("");
    setFilterProyecto(""); setFilterFrente(""); setFilterFechaDesde("");
    setFilterFechaHasta(""); setFilterValorMin(""); setFilterValorMax("");
    setPage(0);
  }

  const hasActiveFilters = search || filterEstado || filterTipo || filterProyecto ||
    filterFrente || filterFechaDesde || filterFechaHasta || filterValorMin || filterValorMax;

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes</h1>
          <p className="text-sm text-gray-500 mt-1">{total} solicitudes encontradas</p>
        </div>
        <Button onClick={() => navigate("/solicitudes/nueva")}>
          <Plus size={16} />Nueva solicitud
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Buscar por consecutivo, tipo, tercero..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <select value={filterEstado} onChange={(e) => { setFilterEstado(e.target.value); setPage(0); }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Todos los estados</option>
            {ESTADO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filterTipo} onChange={(e) => { setFilterTipo(e.target.value); setPage(0); }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Todos los tipos</option>
            {TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            <SlidersHorizontal size={14} />Filtros
            {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
              <X size={13} />Limpiar
            </button>
          )}
        </div>

        {showAdvanced && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
            <select value={filterProyecto} onChange={(e) => { setFilterProyecto(e.target.value); setFilterFrente(""); setPage(0); }}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2">
              <option value="">Todos los proyectos</option>
              {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <select value={filterFrente} onChange={(e) => { setFilterFrente(e.target.value); setPage(0); }}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2">
              <option value="">Todos los frentes</option>
              {filteredFreentes.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
            <div className="flex gap-2">
              <input type="date" value={filterFechaDesde} onChange={(e) => { setFilterFechaDesde(e.target.value); setPage(0); }}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2" placeholder="Desde" />
              <input type="date" value={filterFechaHasta} onChange={(e) => { setFilterFechaHasta(e.target.value); setPage(0); }}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2" placeholder="Hasta" />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner className="h-7 w-7" /></div>
        ) : solicitudes.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <FileText size={32} className="mb-2 text-gray-200" />
            <p className="text-sm">No se encontraron solicitudes</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Consecutivo", "Tipo", "Tercero", "Solicitante", "Valor", "Estado", "Fecha"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {solicitudes.map((s) => (
                <tr key={s.id} onClick={() => navigate(`/solicitudes/${s.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{s.consecutivo}</td>
                  <td className="px-4 py-3 text-gray-600">{TIPO_SOLICITUD_LABELS[s.tipo] ?? s.tipo}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{s.tercero?.razonSocial ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{s.solicitante?.nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.valorFinal ? formatCurrency(s.valorFinal) : "—"}</td>
                  <td className="px-4 py-3"><SolicitudBadge estado={s.estado} /></td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(s.fechaSolicitud)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
            </p>
            <div className="flex gap-1">
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add nuevo-proyecto/frontend/src/pages/solicitudes/SolicitudesPage.jsx
git commit -m "feat: implement Solicitudes list page with filters and pagination"
```

---

## Task 10: Nueva solicitud — tipo selector

**Files:**
- Modify: `nuevo-proyecto/frontend/src/pages/solicitudes/NuevaSolicitudPage.jsx`

Source: `solicitudes-indirectos/src/app/(app)/solicitudes/nueva/page.tsx`

- [ ] **Step 1: Implement NuevaSolicitudPage.jsx**

```jsx
import { useNavigate } from "react-router-dom";
import { FileText, ArrowRight } from "lucide-react";
import { TIPO_SOLICITUD_LABELS } from "../../lib/utils.js";

const TIPOS = Object.keys(TIPO_SOLICITUD_LABELS);

export function NuevaSolicitudPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Solicitud</h1>
        <p className="text-sm text-gray-500 mt-1">Selecciona el tipo de solicitud a crear</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TIPOS.map((tipo) => (
          <button key={tipo} onClick={() => navigate(`/solicitudes/nueva/${tipo}`)}
            className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5 text-left hover:border-blue-300 hover:shadow-sm transition-all">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <FileText size={18} className="text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-900">{TIPO_SOLICITUD_LABELS[tipo]}</span>
            </div>
            <ArrowRight size={15} className="text-gray-400 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add nuevo-proyecto/frontend/src/pages/solicitudes/NuevaSolicitudPage.jsx
git commit -m "feat: implement Nueva Solicitud tipo selector page"
```

---

## Task 11: SolicitudContratoForm (the big form)

**Files:**
- Modify: `nuevo-proyecto/frontend/src/pages/solicitudes/SolicitudContratoForm.jsx`

Source: `solicitudes-indirectos/src/app/(app)/solicitudes/nueva/CONTRATO/page.tsx` + `src/components/forms/CronogramaBuilder.tsx`

This is the largest single component (~800 lines). The strategy:
1. Copy the source JSX structure directly.
2. Replace all Next.js-specific imports with React equivalents.
3. Replace API calls with `apiPost`/`apiGet`.
4. Replace `useRouter().push()` with `useNavigate()`.

- [ ] **Step 1: Read the source form page fully**

Read `solicitudes-indirectos/src/app/(app)/solicitudes/nueva/CONTRATO/page.tsx` and `solicitudes-indirectos/src/components/forms/CronogramaBuilder.tsx`.

- [ ] **Step 2: Create SolicitudContratoForm.jsx**

The form handles ALL tipos (not just CONTRATO). It reads `:tipo` from the URL param.

Key adaptations:
- `useParams()` from react-router-dom to get `tipo`
- `useNavigate()` instead of `useRouter()`
- `apiFetch` for uploads (FormData)
- `apiPost("/api/solicitudes", body)` to create
- `apiGet("/api/terceros?aprobados=true")` for tercero list
- `apiGet("/api/proyectos")` and `apiGet("/api/frentes")` for dropdowns

Skeleton structure:

```jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, Upload, Calendar, ChevronDown } from "lucide-react";
import { Button } from "../../components/ui/button.jsx";
import { Input } from "../../components/ui/input.jsx";
import { Textarea } from "../../components/ui/textarea.jsx";
import { Select } from "../../components/ui/select.jsx";
import { Spinner } from "../../components/ui/spinner.jsx";
import { useToast } from "../../components/ui/toaster.jsx";
import { TIPO_SOLICITUD_LABELS, formatCurrency } from "../../lib/utils.js";
import { apiGet, apiPost, apiUpload } from "../../lib/api.js";

// Copy all form sections from source, translating TypeScript → JS
// and next/* imports → react-router-dom / local utils

export function SolicitudContratoForm() {
  const { tipo } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  // ... copy full form implementation from source
  // See solicitudes-indirectos/src/app/(app)/solicitudes/nueva/CONTRATO/page.tsx
}
```

> **Implementation note:** Copy the form body from the source file directly. The source is ~800 lines. Replace every `import ... from "next/..."` with the react-router-dom equivalent, every `useSession()` usage with `useMe()`, and every `/api/...` fetch with `apiGet`/`apiPost`. The form schema (fields, validation, sections) stays identical.

- [ ] **Step 3: Create `CronogramaBuilder.jsx`**

Copy source `solicitudes-indirectos/src/components/forms/CronogramaBuilder.tsx` → JSX, removing TypeScript annotations, keeping full logic for fases/actividades date management and the 13 business days validation.

```jsx
// nuevo-proyecto/frontend/src/components/forms/CronogramaBuilder.jsx
// Port of CronogramaBuilder.tsx — strip all : Type annotations
// Export: export function CronogramaBuilder({ value, onChange, readOnly })
```

- [ ] **Step 4: Commit**

```bash
git add nuevo-proyecto/frontend/src/pages/solicitudes/SolicitudContratoForm.jsx
git add nuevo-proyecto/frontend/src/components/forms/CronogramaBuilder.jsx
git commit -m "feat: implement SolicitudContratoForm and CronogramaBuilder"
```

---

## Task 12: Solicitud detail page + SolicitudActions + EstadoTimeline

**Files:**
- Modify: `nuevo-proyecto/frontend/src/pages/solicitudes/SolicitudDetallePage.jsx`
- Create: `nuevo-proyecto/frontend/src/components/solicitudes/SolicitudActions.jsx`
- Create: `nuevo-proyecto/frontend/src/components/solicitudes/EstadoTimeline.jsx`

Sources:
- `solicitudes-indirectos/src/app/(app)/solicitudes/[id]/page.tsx`
- `solicitudes-indirectos/src/components/solicitudes/SolicitudActions.tsx`
- `solicitudes-indirectos/src/components/solicitudes/EstadoTimeline.tsx`

- [ ] **Step 1: Create `EstadoTimeline.jsx`**

```jsx
// Port of EstadoTimeline.tsx → remove TypeScript, keep visual stepper logic
// Source: solicitudes-indirectos/src/components/solicitudes/EstadoTimeline.tsx
// Props: { historial: Array<{ accion, nota, ejecutadoPor, creadoEn }> }
import { ACCION_LABELS, ACCION_COLOR, formatDateTime } from "../../lib/utils.js";

export function EstadoTimeline({ historial }) {
  if (!historial?.length) return null;
  return (
    <div className="space-y-4">
      {historial.map((h, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`h-3 w-3 rounded-full shrink-0 mt-1 ${ACCION_COLOR[h.accion] ?? "bg-gray-300"}`} />
            {i < historial.length - 1 && <div className="flex-1 w-px bg-gray-200 mt-1" />}
          </div>
          <div className="pb-4 min-w-0">
            <p className="text-sm font-medium text-gray-900">{ACCION_LABELS[h.accion] ?? h.accion}</p>
            {h.nota && <p className="text-xs text-gray-500 mt-0.5 italic">"{h.nota}"</p>}
            <p className="text-xs text-gray-400 mt-1">
              {h.ejecutadoPor?.nombre ?? "Sistema"} · {formatDateTime(h.creadoEn)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `SolicitudActions.jsx`**

Port `SolicitudActions.tsx` → JSX. Key changes:
- Replace `useRouter()` → `useNavigate()` + `window.location.reload()` after action
- Replace `fetch("/api/...")` → `apiFetch("/api/...")`
- Keep all action visibility logic, modal logic, and file upload for AVANZAR_CONTRATOS

```jsx
// Port of solicitudes-indirectos/src/components/solicitudes/SolicitudActions.tsx
// Remove TypeScript type annotations
// Replace useRouter with useNavigate
// Replace fetch with apiFetch from ../../lib/api.js
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, CheckCircle, RotateCcw, ClipboardCheck, Hash, ThumbsUp, Upload, FileCheck, PenLine } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button.jsx";
import { Modal } from "../ui/modal.jsx";
import { useToast } from "../ui/toaster.jsx";
import { Spinner } from "../ui/spinner.jsx";
import { apiFetch, apiUpload } from "../../lib/api.js";

export function SolicitudActions({ solicitud, me }) {
  // Port all state, visibility rules, and handlers from source
  // me = result of useMe() hook (replaces userSession?.user)
  // me.id replaces userId, me.roles replaces userRoles
}
```

- [ ] **Step 3: Implement `SolicitudDetallePage.jsx`**

```jsx
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Calendar, Building2, FileText, Clock, DollarSign, Hash, Paperclip, Layers } from "lucide-react";
import { SolicitudBadge } from "../../components/solicitudes/SolicitudBadge.jsx";
import { SolicitudActions } from "../../components/solicitudes/SolicitudActions.jsx";
import { EstadoTimeline } from "../../components/solicitudes/EstadoTimeline.jsx";
import { Spinner } from "../../components/ui/spinner.jsx";
import { TIPO_SOLICITUD_LABELS, ESTADO_LABELS, ROL_LABELS, formatCurrency, formatDate } from "../../lib/utils.js";
import { apiGet } from "../../lib/api.js";
import { useMe } from "../../hooks/useMe.js";

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 shrink-0">
          <Icon size={13} className="text-gray-500" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide leading-none mb-0.5">{label}</p>
        <p className="text-sm text-gray-900 leading-snug">{value ?? <span className="text-gray-400 italic">—</span>}</p>
      </div>
    </div>
  );
}

export function SolicitudDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { me, loading: meLoading } = useMe();
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchSolicitud() {
    try {
      const data = await apiGet(`/api/solicitudes/${id}`);
      setSolicitud(data);
    } catch (e) {
      if (e.status === 404) navigate("/solicitudes", { replace: true });
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchSolicitud(); }, [id]);

  if (loading || meLoading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;
  if (!solicitud) return null;

  const frentesIds = typeof solicitud.frentesIds === "string"
    ? JSON.parse(solicitud.frentesIds)
    : (solicitud.frentesIds ?? []);
  const archivosAnexos = typeof solicitud.archivosAnexos === "string"
    ? JSON.parse(solicitud.archivosAnexos)
    : (solicitud.archivosAnexos ?? []);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/solicitudes" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{solicitud.consecutivo}</h1>
            <SolicitudBadge estado={solicitud.estado} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{TIPO_SOLICITUD_LABELS[solicitud.tipo] ?? solicitud.tipo}</p>
        </div>
        <div className="flex gap-2">
          {solicitud.estado === "BORRADOR" && me && (
            <Link to={`/solicitudes/${id}/editar`}>
              <Button variant="outline" size="sm">Editar</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Información General</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Solicitante" value={solicitud.solicitante?.nombre} icon={User} />
              <InfoRow label="Fecha solicitud" value={formatDate(solicitud.fechaSolicitud)} icon={Calendar} />
              <InfoRow label="Tercero" value={solicitud.tercero?.razonSocial} icon={Building2} />
              <InfoRow label="NIT" value={solicitud.tercero?.nit} icon={Hash} />
              <InfoRow label="Valor" value={solicitud.valorFinal ? formatCurrency(solicitud.valorFinal) : null} icon={DollarSign} />
              <InfoRow label="Objeto" value={solicitud.objeto} icon={FileText} />
            </div>
            {solicitud.descripcionActividad && (
              <div className="mt-4">
                <InfoRow label="Descripción de la actividad" value={solicitud.descripcionActividad} icon={FileText} />
              </div>
            )}
          </div>

          {/* Archivos anexos */}
          {archivosAnexos.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Archivos Anexos</h2>
              <div className="space-y-2">
                {archivosAnexos.map((a, i) => (
                  <a key={i} href={`http://localhost:4000${a.url}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                    <Paperclip size={14} />
                    {a.nombre ?? a.url}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {solicitud.historial?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Historial</h2>
              <EstadoTimeline historial={solicitud.historial} />
            </div>
          )}
        </div>

        {/* Actions sidebar */}
        <div className="space-y-4">
          <SolicitudActions solicitud={{ ...solicitud, archivosAnexos: JSON.stringify(archivosAnexos) }} me={me}
            onActionDone={fetchSolicitud} />
        </div>
      </div>
    </div>
  );
}
```

> Note: Add `onActionDone` prop to `SolicitudActions` so the detail page can refetch after an action is taken, instead of a full page reload.

- [ ] **Step 4: Commit**

```bash
git add nuevo-proyecto/frontend/src/pages/solicitudes/SolicitudDetallePage.jsx
git add nuevo-proyecto/frontend/src/components/solicitudes/
git commit -m "feat: implement Solicitud detail page with SolicitudActions and EstadoTimeline"
```

---

## Task 13: Solicitud editar page

**Files:**
- Modify: `nuevo-proyecto/frontend/src/pages/solicitudes/SolicitudEditarPage.jsx`

Source: `solicitudes-indirectos/src/app/(app)/solicitudes/[id]/editar/page.tsx`

- [ ] **Step 1: Implement SolicitudEditarPage.jsx**

This page loads an existing solicitud (must be BORRADOR) and renders `SolicitudContratoForm` in edit mode, pre-populating all fields. The form calls `PATCH /api/solicitudes/:id` instead of `POST /api/solicitudes`.

```jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Spinner } from "../../components/ui/spinner.jsx";
import { apiGet } from "../../lib/api.js";
// Re-use SolicitudContratoForm with an `initialData` and `solicitudId` prop
import { SolicitudContratoForm } from "./SolicitudContratoForm.jsx";

export function SolicitudEditarPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet(`/api/solicitudes/${id}`)
      .then((data) => {
        if (data.estado !== "BORRADOR") navigate(`/solicitudes/${id}`, { replace: true });
        else setSolicitud(data);
      })
      .catch(() => navigate("/solicitudes", { replace: true }))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;
  if (!solicitud) return null;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/solicitudes/${id}`} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Editar {solicitud.consecutivo}</h1>
      </div>
      <SolicitudContratoForm initialData={solicitud} solicitudId={Number(id)} />
    </div>
  );
}
```

> For this to work, `SolicitudContratoForm` must accept optional `initialData` and `solicitudId` props. When `solicitudId` is present, it calls `PATCH /api/solicitudes/:id` instead of `POST /api/solicitudes`.

- [ ] **Step 2: Commit**

```bash
git add nuevo-proyecto/frontend/src/pages/solicitudes/SolicitudEditarPage.jsx
git commit -m "feat: implement Solicitud edit page"
```

---

## Task 14: Terceros pages

**Files:**
- Modify: `nuevo-proyecto/frontend/src/pages/terceros/TercerosPage.jsx`
- Modify: `nuevo-proyecto/frontend/src/pages/terceros/NuevoTerceroPage.jsx`
- Modify: `nuevo-proyecto/frontend/src/pages/terceros/TerceroDetallePage.jsx`

Sources:
- `solicitudes-indirectos/src/app/(app)/terceros/page.tsx`
- `solicitudes-indirectos/src/app/(app)/terceros/nuevo/page.tsx`
- `solicitudes-indirectos/src/app/(app)/terceros/[id]/page.tsx`

- [ ] **Step 1: Implement TercerosPage.jsx**

List + search + create button. Calls `GET /api/terceros`. Each row links to `/terceros/:id`.

```jsx
// Port of terceros/page.tsx → client component
// Replace next/link with Link from react-router-dom
// Replace fetch with apiGet
// Remove all TypeScript annotations
export function TercerosPage() { /* ... */ }
```

- [ ] **Step 2: Implement NuevoTerceroPage.jsx**

Form with all tercero fields. Calls `POST /api/terceros`. On success, navigate to `/terceros/:id`.

```jsx
// Port of terceros/nuevo/page.tsx
// All 6 DD boolean fields (debida diligencia checks) must be included
export function NuevoTerceroPage() { /* ... */ }
```

- [ ] **Step 3: Implement TerceroDetallePage.jsx**

Shows tercero info, all DD fields, PATCH for editing inline or via a form. Also shows which solicitudes reference this tercero. Calls `GET /api/terceros/:id`.

```jsx
export function TerceroDetallePage() { /* ... */ }
```

- [ ] **Step 4: Commit**

```bash
git add nuevo-proyecto/frontend/src/pages/terceros/
git commit -m "feat: implement Terceros pages (list, create, detail)"
```

---

## Task 15: Configuración pages

**Files:**
- Modify: `nuevo-proyecto/frontend/src/pages/configuracion/ConfiguracionPage.jsx`
- Modify: `nuevo-proyecto/frontend/src/pages/configuracion/FrentesPage.jsx`
- Modify: `nuevo-proyecto/frontend/src/pages/configuracion/FrenteDetallePage.jsx`
- Modify: `nuevo-proyecto/frontend/src/pages/configuracion/UsuariosPage.jsx`
- Modify: `nuevo-proyecto/frontend/src/pages/configuracion/AprobadoresPage.jsx`

Sources:
- `solicitudes-indirectos/src/app/(app)/configuracion/page.tsx`
- `solicitudes-indirectos/src/app/(app)/configuracion/frentes/page.tsx`
- `solicitudes-indirectos/src/app/(app)/configuracion/frentes/[id]/page.tsx`
- `solicitudes-indirectos/src/app/(app)/configuracion/usuarios/page.tsx`
- `solicitudes-indirectos/src/app/(app)/configuracion/aprobadores/page.tsx`

All pages: guard with `me.roles.includes("ADMIN") || me.roles.includes("DIRECTOR_CONTROLES")` — redirect to `/dashboard` if not authorized.

- [ ] **Step 1: Implement ConfiguracionPage.jsx** — hub page with links to sub-sections

```jsx
import { Link } from "react-router-dom";
import { Users, Layers, UserCheck } from "lucide-react";
import { useMe } from "../../hooks/useMe.js";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export function ConfiguracionPage() {
  const { me, loading } = useMe();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && me && !me.roles.some((r) => ["ADMIN", "DIRECTOR_CONTROLES"].includes(r))) {
      navigate("/dashboard", { replace: true });
    }
  }, [me, loading, navigate]);

  const items = [
    { href: "/configuracion/frentes", icon: Layers, label: "Frentes", desc: "Gestión de frentes por proyecto" },
    { href: "/configuracion/usuarios", icon: Users, label: "Usuarios", desc: "Roles y permisos de usuarios" },
    { href: "/configuracion/aprobadores", icon: UserCheck, label: "Aprobadores", desc: "Asignar aprobadores por frente" },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
      <div className="grid gap-4">
        {items.map((item) => (
          <Link key={item.href} to={item.href}
            className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <item.icon size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement FrentesPage.jsx** — list frentes grouped by proyecto, links to `/configuracion/frentes/:id`

Port `solicitudes-indirectos/src/app/(app)/configuracion/frentes/page.tsx`. Calls `GET /api/frentes` and `GET /api/proyectos`.

- [ ] **Step 3: Implement FrenteDetallePage.jsx** — show frente info, users assigned, aprobador config

Port `solicitudes-indirectos/src/app/(app)/configuracion/frentes/[id]/page.tsx`. Calls `GET /api/frentes/:id`, `GET /api/config/aprobadores?frenteId=`.

- [ ] **Step 4: Implement UsuariosPage.jsx** — user management with role assignment and frente bulk assignment

Port `solicitudes-indirectos/src/app/(app)/configuracion/usuarios/page.tsx`. Calls `GET /api/usuarios`, `PATCH /api/usuarios/:id`, `POST /api/usuarios/bulk`.

- [ ] **Step 5: Implement AprobadoresPage.jsx** — per-frente approver configuration

Port `solicitudes-indirectos/src/app/(app)/configuracion/aprobadores/page.tsx`. Calls `GET /api/config/aprobadores`, `POST /api/config/aprobadores`.

- [ ] **Step 6: Commit**

```bash
git add nuevo-proyecto/frontend/src/pages/configuracion/
git commit -m "feat: implement Configuración pages (frentes, usuarios, aprobadores)"
```

---

## Task 16: Perfil page

**Files:**
- Create: `nuevo-proyecto/frontend/src/pages/PerfilPage.jsx`

Source: `solicitudes-indirectos/src/app/(app)/perfil/page.tsx`

- [ ] **Step 1: Implement PerfilPage.jsx**

```jsx
import { useState } from "react";
import { useMsal } from "@azure/msal-react";
import { useMe } from "../hooks/useMe.js";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { useToast } from "../components/ui/toaster.jsx";
import { ROL_LABELS } from "../lib/utils.js";
import { apiPatch } from "../lib/api.js";
import { Spinner } from "../components/ui/spinner.jsx";

export function PerfilPage() {
  const { accounts } = useMsal();
  const { me, loading } = useMe();
  const { addToast } = useToast();
  const account = accounts[0];

  const [saving, setSaving] = useState(false);
  const [cargo, setCargo] = useState(me?.cargo ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPatch("/api/usuarios/me", { cargo });
      addToast({ title: "Perfil actualizado", variant: "success" });
    } catch (err) {
      addToast({ title: "Error al guardar", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold">
            {(account?.name ?? "U").split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{account?.name ?? me?.nombre}</p>
            <p className="text-sm text-gray-500">{account?.username ?? me?.email}</p>
            <p className="text-xs text-blue-600 font-medium mt-0.5">
              {(me?.roles ?? []).map((r) => ROL_LABELS[r] ?? r).join(" · ")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
            <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Tu cargo" />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? <Spinner className="h-4 w-4" /> : null}
            Guardar cambios
          </Button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Frentes asignados</h2>
        {me?.frentes?.length > 0 ? (
          <ul className="space-y-1">
            {me.frentes.map((f) => (
              <li key={f.id} className="text-sm text-gray-700">
                {f.nombre} <span className="text-xs text-gray-400">({f.proyecto?.nombre})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">Sin frentes asignados</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add nuevo-proyecto/frontend/src/pages/PerfilPage.jsx
git commit -m "feat: implement Perfil page"
```

---

## Task 17: End-to-end smoke test

- [ ] **Step 1: Start backend and frontend**

```bash
# Terminal 1
cd nuevo-proyecto/backend && npm run dev

# Terminal 2
cd nuevo-proyecto/frontend && npm run dev
```

- [ ] **Step 2: Run through golden path**

1. Open http://localhost:5173 — should redirect to /login
2. Log in with any Microsoft account — MSAL popup should appear
3. After login, verify Dashboard loads with stats
4. Navigate to Solicitudes — list should load (empty if fresh DB)
5. Create a new solicitud — pick a tipo, fill form, submit
6. Verify the new solicitud appears in the list
7. Open the solicitud — verify detail view, actions panel appears
8. Send the solicitud (ENVIAR action) — verify estado changes to ENVIADA

- [ ] **Step 3: Verify notifications bell**

After ENVIAR, the assigned director should receive a notification. Verify the bell counter updates.

- [ ] **Step 4: Fix any issues found during smoke test**

- [ ] **Step 5: Final commit**

```bash
git add -u
git commit -m "feat: complete frontend migration — all 16 pages functional"
```

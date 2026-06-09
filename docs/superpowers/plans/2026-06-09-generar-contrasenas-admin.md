# Admin Password Generation & Excel Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to select users via checkboxes and generate secure temporary passwords for them, then export the results to Excel.

**Architecture:** Two parts — (1) a new API route `POST /api/users/reset-passwords` that accepts plain-text passwords, hashes them with bcrypt, and updates the DB; (2) additions to the existing `configuracion/usuarios/page.tsx` that generate passwords client-side using a utility in `src/lib/password.ts`, call the API, display results in an amber banner, and export to Excel with SheetJS.

**Tech Stack:** Next.js 16 App Router, TypeScript, bcryptjs, xlsx (SheetJS, already installed), lucide-react, Jest + ts-jest

---

### Task 1: Password utility function + tests

**Files:**
- Create: `solicitudes-indirectos/src/lib/password.ts`
- Create: `solicitudes-indirectos/src/lib/__tests__/password.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
// solicitudes-indirectos/src/lib/__tests__/password.test.ts
import { generatePassword } from '../password';

describe('generatePassword', () => {
  it('returns a string of length 10', () => {
    expect(generatePassword()).toHaveLength(10);
  });

  it('contains at least one uppercase letter', () => {
    expect(/[A-Z]/.test(generatePassword())).toBe(true);
  });

  it('contains at least one lowercase letter', () => {
    expect(/[a-z]/.test(generatePassword())).toBe(true);
  });

  it('contains at least one digit', () => {
    expect(/[0-9]/.test(generatePassword())).toBe(true);
  });

  it('contains at least one special character', () => {
    expect(/[!@#$%]/.test(generatePassword())).toBe(true);
  });

  it('generates unique passwords across multiple calls', () => {
    const passwords = Array.from({ length: 20 }, generatePassword);
    expect(new Set(passwords).size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd solicitudes-indirectos && npx jest src/lib/__tests__/password.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../password' from 'src/lib/__tests__/password.test.ts'`

- [ ] **Step 3: Create the password utility**

```typescript
// solicitudes-indirectos/src/lib/password.ts
export function generatePassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const nums = '0123456789';
  const special = '!@#$%';
  const all = upper + lower + nums + special;

  const chars = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    nums[Math.floor(Math.random() * nums.length)],
    special[Math.floor(Math.random() * special.length)],
  ];

  for (let i = 4; i < 10; i++) {
    chars.push(all[Math.floor(Math.random() * all.length)]);
  }

  return chars.sort(() => Math.random() - 0.5).join('');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd solicitudes-indirectos && npx jest src/lib/__tests__/password.test.ts --no-coverage
```

Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
cd solicitudes-indirectos && git add src/lib/password.ts src/lib/__tests__/password.test.ts
git commit -m "feat: add generatePassword utility with tests"
```

---

### Task 2: API endpoint POST /api/users/reset-passwords

**Files:**
- Create: `solicitudes-indirectos/src/app/api/users/reset-passwords/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// solicitudes-indirectos/src/app/api/users/reset-passwords/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const userRoles: string[] = session.user.roles ?? [session.user.rol];
    if (!userRoles.includes("ADMIN")) {
      return Response.json({ error: "Solo ADMIN puede resetear contraseñas" }, { status: 403 });
    }

    const body = await request.json();
    const { users } = body as { users: { id: string; password: string }[] };

    if (!Array.isArray(users) || users.length === 0) {
      return Response.json({ error: "Se requiere al menos un usuario" }, { status: 400 });
    }

    await Promise.all(
      users.map(async ({ id, password }) => {
        const hashed = await bcrypt.hash(password, 12);
        await prisma.user.update({ where: { id }, data: { password: hashed } });
      })
    );

    return Response.json({ success: true, count: users.length });
  } catch (error) {
    console.error("POST /api/users/reset-passwords error:", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify the app compiles without errors**

```bash
cd solicitudes-indirectos && npm run dev
```

Expected: Server starts on `http://localhost:3000` with no TypeScript/compilation errors in the terminal. Stop the server (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
git add solicitudes-indirectos/src/app/api/users/reset-passwords/route.ts
git commit -m "feat: add POST /api/users/reset-passwords endpoint"
```

---

### Task 3: UI — imports, state, and handler functions

**Files:**
- Modify: `solicitudes-indirectos/src/app/(app)/configuracion/usuarios/page.tsx`

- [ ] **Step 1: Add new imports**

Replace the existing lucide-react import line:

```typescript
// Before:
import { Plus, Pencil, UserCheck, UserX, X, Settings, Search, Filter } from "lucide-react";

// After:
import { Plus, Pencil, UserCheck, UserX, X, Settings, Search, Filter, KeyRound, AlertTriangle, FileDown } from "lucide-react";
```

After the lucide-react import, add these two imports:

```typescript
import * as XLSX from "xlsx";
import { generatePassword } from "@/lib/password";
```

- [ ] **Step 2: Add new state variables**

Inside `UsuariosPage`, after the existing `const [bulkFrentesIds, setBulkFrentesIds] = useState<number[]>([]);` line, add:

```typescript
const [generatedPasswords, setGeneratedPasswords] = useState<
  { nombre: string; email: string; password: string }[]
>([]);
const [generatingPasswords, setGeneratingPasswords] = useState(false);
```

- [ ] **Step 3: Add handleGenerarContrasenas function**

Add this function after `handleBulkAssignFrentes`:

```typescript
async function handleGenerarContrasenas() {
  const targets = users.filter((u) => selectedIds.includes(u.id));
  if (targets.length === 0) return;

  setGeneratingPasswords(true);
  try {
    const pairs = targets.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      password: generatePassword(),
    }));

    const res = await fetch("/api/users/reset-passwords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: pairs.map(({ id, password }) => ({ id, password })),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Error al resetear contraseñas");
    }

    setGeneratedPasswords(
      pairs.map(({ nombre, email, password }) => ({ nombre, email, password }))
    );
    setSelectedIds([]);
  } catch (err) {
    alert(err instanceof Error ? err.message : "Error desconocido");
  } finally {
    setGeneratingPasswords(false);
  }
}
```

- [ ] **Step 4: Add exportarContrasenas function**

Add this function after `handleGenerarContrasenas`:

```typescript
function exportarContrasenas() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(
    generatedPasswords.map((p) => ({
      Nombre: p.nombre,
      Email: p.email,
      "Contraseña Temporal": p.password,
    }))
  );
  XLSX.utils.book_append_sheet(wb, ws, "Contraseñas");
  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `contraseñas-usuarios-${today}.xlsx`);
}
```

- [ ] **Step 5: Add the button to the header**

In the JSX, find the block `{selectedIds.length > 0 && (` that renders the "Asignar Frentes" button. Add the new button **after** it (and before the "Nuevo Usuario" button):

```tsx
{selectedIds.length > 0 && (
  <button
    onClick={handleGenerarContrasenas}
    disabled={generatingPasswords}
    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-md shadow-emerald-100"
  >
    {generatingPasswords ? <Spinner size="sm" /> : <KeyRound size={16} />}
    Generar contraseñas ({selectedIds.length})
  </button>
)}
```

- [ ] **Step 6: Verify button appears in browser**

```bash
cd solicitudes-indirectos && npm run dev
```

Log in as `admin@baiak.com` / `Admin123!`. Go to `/configuracion/usuarios`. Check one user — verify "Generar contraseñas (1)" button appears in green next to "Asignar Frentes (1)". Stop the server.

- [ ] **Step 7: Commit**

```bash
git add solicitudes-indirectos/src/app/(app)/configuracion/usuarios/page.tsx
git commit -m "feat: add password generation handler and button to usuarios page"
```

---

### Task 4: UI — results banner

**Files:**
- Modify: `solicitudes-indirectos/src/app/(app)/configuracion/usuarios/page.tsx`

- [ ] **Step 1: Add the results banner**

In the JSX, add the following block **between** the closing `</div>` of the `{/* Filtros */}` section and the opening `<div>` of the `{/* Table */}` section:

```tsx
{/* Generated passwords banner */}
{generatedPasswords.length > 0 && (
  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800 font-medium">
          {generatedPasswords.length} contraseña{generatedPasswords.length !== 1 ? "s" : ""} generada{generatedPasswords.length !== 1 ? "s" : ""} — expórtalas antes de salir, no se pueden recuperar después.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={exportarContrasenas}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <FileDown size={13} />
          Exportar Excel
        </button>
        <button
          onClick={() => setGeneratedPasswords([])}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
        >
          <X size={13} />
          Limpiar
        </button>
      </div>
    </div>
    <div className="overflow-x-auto rounded-lg border border-amber-200">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-amber-100/60 border-b border-amber-200">
            <th className="px-3 py-2 text-left font-semibold text-amber-700 whitespace-nowrap">Nombre</th>
            <th className="px-3 py-2 text-left font-semibold text-amber-700 whitespace-nowrap">Email</th>
            <th className="px-3 py-2 text-left font-semibold text-amber-700 whitespace-nowrap">Contraseña Temporal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-amber-100">
          {generatedPasswords.map((p) => (
            <tr key={p.email} className="hover:bg-amber-50/50">
              <td className="px-3 py-2 text-gray-800 whitespace-nowrap">{p.nombre}</td>
              <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{p.email}</td>
              <td className="px-3 py-2 font-mono font-medium text-gray-900 whitespace-nowrap">{p.password}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
```

- [ ] **Step 2: Test the full end-to-end flow**

```bash
cd solicitudes-indirectos && npm run dev
```

1. Log in as `admin@baiak.com` / `Admin123!`.
2. Go to `/configuracion/usuarios`.
3. Select 2–3 users via checkboxes.
4. Click **"Generar contraseñas (N)"**.
5. Verify the amber banner appears with the table showing Nombre, Email, and Contraseña en fuente monospace.
6. Click **"Exportar Excel"** — file `contraseñas-usuarios-YYYY-MM-DD.xlsx` downloads automatically.
7. Open the Excel file — verify 3 columns: `Nombre`, `Email`, `Contraseña Temporal`.
8. Click **"Limpiar"** — banner disappears.
9. Log in as another user (`smercado@baiak.com` / `Abc123!`) with the new password — confirm login works.

Stop the server.

- [ ] **Step 3: Commit**

```bash
git add solicitudes-indirectos/src/app/(app)/configuracion/usuarios/page.tsx
git commit -m "feat: add generated passwords banner and Excel export to usuarios page"
```

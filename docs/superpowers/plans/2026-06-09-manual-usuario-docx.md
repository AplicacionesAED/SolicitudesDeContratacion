# Manual de Usuario .docx — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generar `solicitudes-indirectos/manual-usuario.docx` — manual de usuario completo con capturas automáticas de cada pantalla del sistema, documentación de formularios campo a campo, flujo de estados, y botones por rol/estado.

**Architecture:** Tres scripts independientes ejecutados en secuencia: (1) `setup-test-data.ts` crea solicitudes en cada estado directamente en la BD via Prisma; (2) `capture-screenshots.ts` usa Playwright para navegar el app y guardar PNGs; (3) `generate-docx.ts` ensambla el `.docx` final combinando el contenido de `content.ts` con las imágenes capturadas.

**Tech Stack:** `playwright` (capturas), `docx` v9.6.1 (ya instalado), `tsx` v4.21.0 (ya instalado), `@prisma/adapter-pg` (ya instalado), Prisma Client desde `src/generated/prisma`.

---

## File Structure

```
solicitudes-indirectos/
  scripts/
    generate-docs/
      setup-test-data.ts     ← Prisma: crea solicitudes en cada estado → test-data.json
      capture-screenshots.ts ← Playwright: captura PNGs de cada pantalla
      content.ts             ← Todo el texto del documento (secciones, tablas, descripciones)
      generate-docx.ts       ← Ensambla manual-usuario.docx
      screenshots/           ← Creado automáticamente
      test-data.json         ← Creado automáticamente por setup-test-data.ts
  manual-usuario.docx        ← Output final
```

---

## Task 1: Instalar Playwright y agregar scripts npm

**Files:**
- Modify: `solicitudes-indirectos/package.json`

- [ ] **Step 1.1: Instalar playwright como devDependency**

```bash
cd solicitudes-indirectos
npm install --save-dev playwright
npx playwright install chromium
```

Salida esperada: `Chromium X.X downloaded to ...` sin errores.

- [ ] **Step 1.2: Agregar scripts a package.json**

Dentro de la clave `"scripts"`, agregar al final (antes del cierre `}`):

```json
"docs:setup":       "node --env-file .env node_modules/.bin/tsx scripts/generate-docs/setup-test-data.ts",
"docs:screenshots": "node --env-file .env node_modules/.bin/tsx scripts/generate-docs/capture-screenshots.ts",
"docs:generate":    "node --env-file .env node_modules/.bin/tsx scripts/generate-docs/generate-docx.ts",
"docs:all":         "npm run docs:setup && npm run docs:screenshots && npm run docs:generate"
```

- [ ] **Step 1.3: Crear directorio de scripts**

```bash
mkdir -p solicitudes-indirectos/scripts/generate-docs/screenshots
```

- [ ] **Step 1.4: Commit**

```bash
git add solicitudes-indirectos/package.json solicitudes-indirectos/package-lock.json
git commit -m "chore: install playwright for docs screenshot automation"
```

---

## Task 2: Crear setup-test-data.ts

**Files:**
- Create: `solicitudes-indirectos/scripts/generate-docs/setup-test-data.ts`

Este script crea solicitudes en cada estado directamente en la BD (bypasando validaciones del API) para que las capturas muestren botones de acción reales por estado.

- [ ] **Step 2.1: Crear el archivo**

Crear `solicitudes-indirectos/scripts/generate-docs/setup-test-data.ts` con el siguiente contenido completo:

```typescript
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma";
import * as fs from "fs";
import * as path from "path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

const ESTADOS = [
  "BORRADOR",
  "ENVIADA",
  "EN_TRAMITE_CONTRATOS",
  "CREACION_MINUTA",
  "ENVIO_CONTRATO_POLIZAS",
  "EN_CONTROLES",
  "APROBACION_FINAL",
  "COMPLETADA",
  "DEVUELTA",
  "EN_REVISION",
] as const;

async function main() {
  console.log("🔧 Configurando datos de prueba...");

  // ── Fetch seed entities ────────────────────────────────────────────────────
  const solicitante = await prisma.user.findUniqueOrThrow({
    where: { email: "smercado@baiak.com" },
  });
  const directorProyecto = await prisma.user.findUniqueOrThrow({
    where: { email: "crodriguez@baiak.com" },
  });
  const contratos = await prisma.user.findUniqueOrThrow({
    where: { email: "amorales@baiak.com" },
  });
  const controles = await prisma.user.findUniqueOrThrow({
    where: { email: "ljimenez@baiak.com" },
  });
  const directorControles = await prisma.user.findUniqueOrThrow({
    where: { email: "msuarez@baiak.com" },
  });

  const proyecto = await prisma.proyecto.findFirst({ orderBy: { id: "asc" } });
  if (!proyecto) throw new Error("No hay proyectos — ejecuta npm run db:seed primero");

  const frente = await prisma.frente.findFirst({
    where: { proyectoId: proyecto.id },
    orderBy: { id: "asc" },
  });
  if (!frente) throw new Error("No hay frentes — ejecuta npm run db:seed primero");

  const tercero = await prisma.tercero.findFirst({
    where: { aprobadoDebidaDiligencia: true },
    orderBy: { id: "asc" },
  });
  if (!tercero) {
    throw new Error("No hay terceros con DD aprobada — ejecuta npm run db:seed primero");
  }

  // ── Delete previous test solicitudes ──────────────────────────────────────
  await prisma.solicitud.deleteMany({
    where: { consecutivo: { startsWith: "DOC-TEST-" } },
  });

  // ── Create one solicitud per estado ───────────────────────────────────────
  const created: Record<string, number> = {};

  for (const estado of ESTADOS) {
    const sol = await prisma.solicitud.create({
      data: {
        consecutivo: `DOC-TEST-${estado}`,
        tipo: "ORDEN_SERVICIO",
        estado,
        solicitanteId: solicitante.id,
        aprobadorId: directorProyecto.id,
        responsableContratosTramiteId: contratos.id,
        responsableContratosMinutaId: contratos.id,
        coordinadorControlesId: controles.id,
        directorControlesId: directorControles.id,
        proyectoId: proyecto.id,
        frentesIds: JSON.stringify([frente.id]),
        terceroId: tercero.id,
        descripcionActividad: "Servicio de mantenimiento correctivo de equipos de construcción en la obra.",
        plazoEjecucion: "3 meses",
        formaPago: "Acta de recibo de obra",
        valorFinal: 48500000,
        asunto: `${frente.nombre} – ${tercero.razonSocial} – Mantenimiento de equipos`,
        alcance: "Incluye mano de obra, materiales menores y transporte al sitio de obra.",
        archivoCuadroComparativo: "/uploads/placeholder.pdf",
        archivoCotizacion: "/uploads/placeholder.pdf",
        archivoGeneradorGastos: "/uploads/placeholder.pdf",
        archivoEvaluacionInicial: "/uploads/placeholder.pdf",
      },
    });
    created[estado] = sol.id;
    console.log(`  ✓ ${estado.padEnd(30)} → id=${sol.id}`);
  }

  // ── Write JSON with IDs ────────────────────────────────────────────────────
  const output = {
    solicitudes: created,
    users: {
      solicitante: solicitante.email,
      directorProyecto: directorProyecto.email,
      contratos: contratos.email,
      controles: controles.email,
      directorControles: directorControles.email,
    },
    terceroId: tercero.id,
  };

  const outPath = path.join(__dirname, "test-data.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n✅ test-data.json guardado en ${outPath}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
```

- [ ] **Step 2.2: Verificar que el script funciona**

Con el servidor de desarrollo **detenido** y la BD corriendo, ejecutar:

```bash
cd solicitudes-indirectos
npm run docs:setup
```

Salida esperada:
```
🔧 Configurando datos de prueba...
  ✓ BORRADOR                        → id=X
  ✓ ENVIADA                         → id=X
  ...
✅ test-data.json guardado en ...scripts/generate-docs/test-data.json
```

Si lanza `"No hay proyectos"`, ejecutar primero:
```bash
npm run db:seed
```

- [ ] **Step 2.3: Commit**

```bash
git add solicitudes-indirectos/scripts/generate-docs/setup-test-data.ts
git commit -m "feat(docs): add setup-test-data script for screenshot automation"
```

---

## Task 3: Crear capture-screenshots.ts

**Files:**
- Create: `solicitudes-indirectos/scripts/generate-docs/capture-screenshots.ts`

El servidor de Next.js **debe estar corriendo** en `http://localhost:3000` durante este script.

- [ ] **Step 3.1: Crear el archivo**

Crear `solicitudes-indirectos/scripts/generate-docs/capture-screenshots.ts`:

```typescript
import { chromium, type Page, type BrowserContext } from "playwright";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "http://localhost:3000";
const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");
const TEST_DATA_PATH = path.join(__dirname, "test-data.json");

const VIEWPORT = { width: 1440, height: 900 };

interface TestData {
  solicitudes: Record<string, number>;
  users: Record<string, string>;
  terceroId: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function capture(page: Page, filename: string) {
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, filename),
    fullPage: false,
  });
  console.log(`  📸 ${filename}`);
}

async function loginAs(context: BrowserContext, email: string, password: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(`${BASE_URL}/**`, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  return page;
}

async function goToSolicitud(page: Page, id: number) {
  await page.goto(`${BASE_URL}/solicitudes/${id}`);
  await page.waitForLoadState("networkidle");
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(TEST_DATA_PATH)) {
    console.error("❌ test-data.json no encontrado. Ejecuta npm run docs:setup primero.");
    process.exit(1);
  }

  const data: TestData = JSON.parse(fs.readFileSync(TEST_DATA_PATH, "utf-8"));
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  console.log("🌐 Navegador iniciado\n");

  try {
    // ── Sección 1: Login ─────────────────────────────────────────────────────
    console.log("📂 Sección 1: Login");
    {
      const ctx = await browser.newContext({ viewport: VIEWPORT });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/login`);
      await capture(page, "01-login.png");
      await ctx.close();
    }

    // ── Sección 2: Dashboard ─────────────────────────────────────────────────
    console.log("\n📂 Sección 2: Dashboard");
    {
      const ctx = await browser.newContext({ viewport: VIEWPORT });
      const page = await loginAs(ctx, data.users.solicitante, "Abc123!");
      await page.goto(`${BASE_URL}/`);
      await capture(page, "02-dashboard-solicitante.png");

      // Dashboard como ADMIN
      const ctxAdmin = await browser.newContext({ viewport: VIEWPORT });
      const pageAdmin = await loginAs(ctxAdmin, "admin@baiak.com", "Admin123!");
      await pageAdmin.goto(`${BASE_URL}/`);
      await capture(pageAdmin, "02-dashboard-admin.png");

      await ctx.close();
      await ctxAdmin.close();
    }

    // ── Sección 3: Solicitudes ───────────────────────────────────────────────
    console.log("\n📂 Sección 3: Solicitudes");
    {
      const ctx = await browser.newContext({ viewport: VIEWPORT });
      const page = await loginAs(ctx, data.users.solicitante, "Abc123!");

      // Lista
      await page.goto(`${BASE_URL}/solicitudes`);
      await capture(page, "03-solicitudes-lista.png");

      // Selección de tipo
      await page.goto(`${BASE_URL}/solicitudes/nueva`);
      await capture(page, "04-nueva-tipo.png");

      // Formulario ODS (secciones)
      await page.goto(`${BASE_URL}/solicitudes/nueva/orden-servicio`);
      await page.waitForLoadState("networkidle");
      await capture(page, "05-form-encabezado.png");
      await page.evaluate(() => window.scrollTo(0, 400));
      await page.waitForTimeout(300);
      await capture(page, "05-form-informacion.png");
      await page.evaluate(() => window.scrollTo(0, 900));
      await page.waitForTimeout(300);
      await capture(page, "05-form-contratista.png");
      await page.evaluate(() => window.scrollTo(0, 1400));
      await page.waitForTimeout(300);
      await capture(page, "05-form-contrato.png");
      await page.evaluate(() => window.scrollTo(0, 2000));
      await page.waitForTimeout(300);
      await capture(page, "05-form-documentos.png");
      await page.evaluate(() => window.scrollTo(0, 9999));
      await page.waitForTimeout(300);
      await capture(page, "05-form-cronograma.png");

      await ctx.close();
    }

    // ── Sección 4: Detalle por estado ────────────────────────────────────────
    console.log("\n📂 Sección 4: Detalle de solicitud por estado");

    // BORRADOR — solicitante
    {
      const ctx = await browser.newContext({ viewport: VIEWPORT });
      const page = await loginAs(ctx, data.users.solicitante, "Abc123!");
      await goToSolicitud(page, data.solicitudes.BORRADOR);
      await capture(page, "06-detalle-borrador.png");
      await ctx.close();
    }

    // ENVIADA — director proyecto
    {
      const ctx = await browser.newContext({ viewport: VIEWPORT });
      const page = await loginAs(ctx, data.users.directorProyecto, "Abc123!");
      await goToSolicitud(page, data.solicitudes.ENVIADA);
      await capture(page, "07-detalle-enviada.png");
      await ctx.close();
    }

    // EN_TRAMITE_CONTRATOS — contratos
    {
      const ctx = await browser.newContext({ viewport: VIEWPORT });
      const page = await loginAs(ctx, data.users.contratos, "Abc123!");
      await goToSolicitud(page, data.solicitudes.EN_TRAMITE_CONTRATOS);
      await capture(page, "08-detalle-en-tramite.png");
      await ctx.close();
    }

    // CREACION_MINUTA — contratos (muestra zona de subida de anexos)
    {
      const ctx = await browser.newContext({ viewport: VIEWPORT });
      const page = await loginAs(ctx, data.users.contratos, "Abc123!");
      await goToSolicitud(page, data.solicitudes.CREACION_MINUTA);
      await capture(page, "09-detalle-creacion-minuta.png");
      await ctx.close();
    }

    // ENVIO_CONTRATO_POLIZAS — contratos
    {
      const ctx = await browser.newContext({ viewport: VIEWPORT });
      const page = await loginAs(ctx, data.users.contratos, "Abc123!");
      await goToSolicitud(page, data.solicitudes.ENVIO_CONTRATO_POLIZAS);
      await capture(page, "10-detalle-envio-polizas.png");
      await ctx.close();
    }

    // EN_CONTROLES — controles
    {
      const ctx = await browser.newContext({ viewport: VIEWPORT });
      const page = await loginAs(ctx, data.users.controles, "Abc123!");
      await goToSolicitud(page, data.solicitudes.EN_CONTROLES);
      await capture(page, "11-detalle-en-controles.png");
      await ctx.close();
    }

    // APROBACION_FINAL — director controles
    {
      const ctx = await browser.newContext({ viewport: VIEWPORT });
      const page = await loginAs(ctx, data.users.directorControles, "Abc123!");
      await goToSolicitud(page, data.solicitudes.APROBACION_FINAL);
      await capture(page, "12-detalle-aprobacion-final.png");
      await ctx.close();
    }

    // COMPLETADA — admin
    {
      const ctx = await browser.newContext({ viewport: VIEWPORT });
      const page = await loginAs(ctx, "admin@baiak.com", "Admin123!");
      await goToSolicitud(page, data.solicitudes.COMPLETADA);
      await capture(page, "13-detalle-completada.png");
      await ctx.close();
    }

    // DEVUELTA — solicitante (muestra botón Reenviar)
    {
      const ctx = await browser.newContext({ viewport: VIEWPORT });
      const page = await loginAs(ctx, data.users.solicitante, "Abc123!");
      await goToSolicitud(page, data.solicitudes.DEVUELTA);
      await capture(page, "14-detalle-devuelta.png");
      await ctx.close();
    }

    // EN_REVISION — contratos
    {
      const ctx = await browser.newContext({ viewport: VIEWPORT });
      const page = await loginAs(ctx, data.users.contratos, "Abc123!");
      await goToSolicitud(page, data.solicitudes.EN_REVISION);
      await capture(page, "15-detalle-en-revision.png");
      await ctx.close();
    }

    // ── Sección 5: Terceros ──────────────────────────────────────────────────
    console.log("\n📂 Sección 5: Terceros");
    {
      const ctx = await browser.newContext({ viewport: VIEWPORT });
      const page = await loginAs(ctx, "admin@baiak.com", "Admin123!");

      await page.goto(`${BASE_URL}/terceros`);
      await capture(page, "16-terceros-lista.png");

      await page.goto(`${BASE_URL}/terceros/${data.terceroId}`);
      await capture(page, "17-tercero-detalle.png");

      await page.goto(`${BASE_URL}/terceros/nuevo`);
      await capture(page, "18-tercero-nuevo.png");

      await ctx.close();
    }

    // ── Sección 6: Configuración ─────────────────────────────────────────────
    console.log("\n📂 Sección 6: Configuración");
    {
      const ctx = await browser.newContext({ viewport: VIEWPORT });
      const page = await loginAs(ctx, "admin@baiak.com", "Admin123!");

      await page.goto(`${BASE_URL}/configuracion/usuarios`);
      await capture(page, "19-config-usuarios.png");

      await page.goto(`${BASE_URL}/configuracion/frentes`);
      await capture(page, "20-config-frentes.png");

      await page.goto(`${BASE_URL}/configuracion/aprobadores`);
      await capture(page, "21-config-aprobadores.png");

      await page.goto(`${BASE_URL}/perfil`);
      await capture(page, "22-perfil-vincular.png");

      await ctx.close();
    }

  } finally {
    await browser.close();
    console.log(`\n✅ ${fs.readdirSync(SCREENSHOTS_DIR).length} capturas guardadas en scripts/generate-docs/screenshots/`);
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
```

- [ ] **Step 3.2: Iniciar el servidor de Next.js en una terminal separada**

```bash
cd solicitudes-indirectos
npm run dev
```

Esperar a que muestre: `✓ Ready in X.Xs`

- [ ] **Step 3.3: Ejecutar el script de capturas (en otra terminal)**

```bash
cd solicitudes-indirectos
npm run docs:screenshots
```

Salida esperada (22 líneas de `📸 XX-nombre.png`):
```
🌐 Navegador iniciado
📂 Sección 1: Login
  📸 01-login.png
📂 Sección 2: Dashboard
  📸 02-dashboard-solicitante.png
  ...
✅ 22 capturas guardadas en scripts/generate-docs/screenshots/
```

Si hay error de login (`Timeout waiting for URL`), verificar que el server está corriendo en puerto 3000.

- [ ] **Step 3.4: Commit**

```bash
git add solicitudes-indirectos/scripts/generate-docs/capture-screenshots.ts
git commit -m "feat(docs): add Playwright screenshot capture script"
```

---

## Task 4: Crear content.ts

**Files:**
- Create: `solicitudes-indirectos/scripts/generate-docs/content.ts`

- [ ] **Step 4.1: Crear el archivo**

Crear `solicitudes-indirectos/scripts/generate-docs/content.ts`:

```typescript
// ── Types ─────────────────────────────────────────────────────────────────────

export interface FieldRow {
  campo: string;
  tipo: string;
  obligatorio: string;
  valores: string;
  regla: string;
}

export interface BtnRow {
  estado: string;
  boton: string;
  rol: string;
  resultado: string;
  camposExtra: string;
}

// ── Introducción ──────────────────────────────────────────────────────────────

export const INTRO_TEXT = `El Sistema de Solicitudes de Indirectos es la plataforma oficial de Baia Kristal para gestionar todas las solicitudes de contratación indirecta: órdenes de servicio, contratos, otrosíes y trámites de pago. Centraliza el proceso de aprobación, garantiza trazabilidad completa de cada solicitud y notifica a cada actor en el momento que le corresponde actuar.`;

export const MICROSOFT_WARNING = `IMPORTANTE — Antes de usar el sistema por primera vez, cada usuario debe ir a Perfil (esquina superior derecha) y hacer clic en "Vincular cuenta Microsoft". Este paso es obligatorio para recibir notificaciones en tiempo real y acceder a funcionalidades integradas con Microsoft 365. Sin este vínculo, algunas alertas pueden no llegar a tu correo.`;

// ── Roles ─────────────────────────────────────────────────────────────────────

export interface RolRow {
  rol: string;
  nombre: string;
  puede: string;
  ve: string;
}

export const ROLES_TABLE: RolRow[] = [
  {
    rol: "SOLICITANTE",
    nombre: "Solicitante",
    puede: "Crear solicitudes, enviar, reenviar solicitudes devueltas, descargar documentos.",
    ve: "Solo sus propias solicitudes y las de sus frentes asignados.",
  },
  {
    rol: "TECNICA",
    nombre: "Coordinador Técnico",
    puede: "Crear y enviar solicitudes (pasan primero por Director Técnico). Puede crear solicitudes de diseño.",
    ve: "Sus propias solicitudes.",
  },
  {
    rol: "DIRECTOR_TECNICO",
    nombre: "Director Técnico",
    puede: "Aprobar o devolver solicitudes del coordinador técnico.",
    ve: "Solicitudes en estado PENDIENTE_DIRECTOR_TECNICO.",
  },
  {
    rol: "DIRECTOR_PROYECTO",
    nombre: "Director de Proyecto",
    puede: "Aprobar o devolver solicitudes de su frente.",
    ve: "Solicitudes de los frentes asignados.",
  },
  {
    rol: "CONTRATOS",
    nombre: "Responsable de Contratos",
    puede: "Tramitar solicitudes, crear minutas, subir anexos, enviar a controles.",
    ve: "Todas las solicitudes.",
  },
  {
    rol: "CONTROLES",
    nombre: "Coordinador de Controles",
    puede: "Registrar el número de contrato ADPRO.",
    ve: "Todas las solicitudes.",
  },
  {
    rol: "DIRECTOR_CONTROLES",
    nombre: "Director de Controles",
    puede: "Dar la aprobación final y completar la solicitud.",
    ve: "Todas las solicitudes.",
  },
  {
    rol: "ADMIN",
    nombre: "Administrador",
    puede: "Acceso total: gestionar usuarios, frentes, proyectos, terceros y toda la configuración.",
    ve: "Todo el sistema.",
  },
];

// ── Tipos de solicitud ────────────────────────────────────────────────────────

export const TIPOS_SOLICITUD = [
  { abrev: "ODS",  nombre: "Orden de Servicio",                        descripcion: "Para contratar un servicio puntual sin contrato formal." },
  { abrev: "CONT", nombre: "Contrato",                                 descripcion: "Para formalizar una relación contractual con un tercero." },
  { abrev: "OST",  nombre: "Otrosí por Tiempo",                        descripcion: "Para prorrogar el plazo de un contrato existente." },
  { abrev: "OSTC", nombre: "Otrosí Tiempo, Cantidad y/o Modificación", descripcion: "Para modificar plazo, cantidad o condiciones de un contrato." },
  { abrev: "TCC",  nombre: "Trámite de Cuenta",                        descripcion: "Para tramitar el pago de una cuenta única." },
  { abrev: "TFC",  nombre: "Trámite de Facturas",                      descripcion: "Para tramitar el pago de facturas." },
  { abrev: "TCR",  nombre: "Trámite de Cuentas Recurrentes",           descripcion: "Para pagos que se repiten periódicamente." },
  { abrev: "TCO",  nombre: "Trámite de Cuentas Ocasionales",           descripcion: "Para pagos esporádicos no recurrentes." },
  { abrev: "TBC",  nombre: "Trámite de Bonificaciones y Comisiones",   descripcion: "Para tramitar el pago de bonificaciones o comisiones." },
];

// ── Campos del formulario de solicitud ────────────────────────────────────────

export const CAMPOS_SOLICITUD: FieldRow[] = [
  { campo: "Consecutivo",              tipo: "Texto (automático)", obligatorio: "Auto",    valores: "SOL-{TIPO}-{PROYECTO}-{FRENTE}-{NNN}",       regla: "Se genera al enviar, no al guardar borrador." },
  { campo: "Solicitante",              tipo: "Texto (automático)", obligatorio: "Auto",    valores: "Nombre del usuario en sesión",                 regla: "Solo lectura." },
  { campo: "Fecha",                    tipo: "Fecha (automático)", obligatorio: "Auto",    valores: "DD/MM/YYYY",                                   regla: "Fecha de creación del borrador." },
  { campo: "Frente(s) de trabajo",     tipo: "Selección múltiple", obligatorio: "Sí",     valores: "Lista de frentes activos asignados al usuario", regla: "Mínimo 1 frente. Define quién aprueba." },
  { campo: "Proyecto",                 tipo: "Texto (automático)", obligatorio: "Auto",    valores: "Se asigna según el frente seleccionado",       regla: "Solo lectura." },
  { campo: "Tipo de solicitud",        tipo: "Selección",          obligatorio: "Sí",      valores: "9 opciones (ODS, CONT, OST, OSTC, TCC, TFC, TCR, TCO, TBC)", regla: "Determina qué campos adicionales se muestran." },
  { campo: "Tipo de contrato",         tipo: "Selección",          obligatorio: "Condicional", valores: "OBRA, SUMINISTRO, SERVICIOS, DISEÑO, CONSULTORÍA, ARRENDAMIENTO, OTRO", regla: "Obligatorio solo si Tipo = Contrato." },
  { campo: "Etapa",                    tipo: "Número",             obligatorio: "No",      valores: "Entero positivo",                              regla: "Informativo." },
  { campo: "Tercero (contratista)",    tipo: "Búsqueda + selección", obligatorio: "Sí",   valores: "Terceros con Debida Diligencia completa",      regla: "Solo aparecen terceros con los 6 checks de DD activos." },
  { campo: "Representante legal",      tipo: "Texto",              obligatorio: "Auto",    valores: "Nombre del representante",                     regla: "Se carga desde el tercero; editable en contexto." },
  { campo: "NIT representante",        tipo: "Texto",              obligatorio: "Auto",    valores: "000000000-0",                                  regla: "Se carga desde el tercero." },
  { campo: "Descripción de actividad", tipo: "Área de texto",      obligatorio: "Sí",      valores: "Texto libre",                                  regla: "Describe el objeto del contrato u orden de servicio." },
  { campo: "Plazo de ejecución",       tipo: "Texto",              obligatorio: "Sí",      valores: "Ej: \"3 meses\", \"90 días calendario\"",      regla: "Texto libre, no fecha." },
  { campo: "Forma de pago",            tipo: "Texto",              obligatorio: "Sí",      valores: "Ej: \"Acta de recibo de obra\", \"Mensual\"",   regla: "Texto libre." },
  { campo: "Valor final",              tipo: "Número",             obligatorio: "Sí",      valores: "Número entero en pesos COP",                   regla: "Se muestra automáticamente en letras." },
  { campo: "Valor en letras",          tipo: "Texto (automático)", obligatorio: "Auto",    valores: "Generado desde el valor final",                regla: "Solo lectura." },
  { campo: "Asunto",                   tipo: "Texto",              obligatorio: "No",       valores: "Texto libre",                                  regla: "Se auto-genera como: Frente – Tercero – Descripción." },
  { campo: "Alcance",                  tipo: "Área de texto",      obligatorio: "No",       valores: "Texto libre",                                  regla: "Descripción detallada del alcance." },
  { campo: "Términos de referencia",   tipo: "Área de texto",      obligatorio: "No",       valores: "Texto libre",                                  regla: "Condiciones técnicas del contrato." },
  { campo: "Condiciones especiales",   tipo: "Área de texto",      obligatorio: "No",       valores: "Texto libre",                                  regla: "Cualquier condición particular." },
  { campo: "Cuadro comparativo",       tipo: "Archivo",            obligatorio: "Sí",       valores: "PDF, XLSX, XLS — máx. 10 MB",                  regla: "Obligatorio al enviar." },
  { campo: "Cotización",               tipo: "Archivo",            obligatorio: "Sí",       valores: "PDF, XLSX, XLS — máx. 10 MB",                  regla: "Obligatorio al enviar." },
  { campo: "Generador de gastos",      tipo: "Archivo",            obligatorio: "Sí",       valores: "PDF, XLSX, XLS — máx. 10 MB",                  regla: "Obligatorio al enviar." },
  { campo: "Evaluación inicial",       tipo: "Archivo",            obligatorio: "Sí",       valores: "PDF, XLSX, XLS — máx. 10 MB",                  regla: "Obligatorio al enviar." },
  { campo: "PreBEP",                   tipo: "Archivo",            obligatorio: "No",        valores: "PDF, XLSX, XLS — máx. 10 MB",                  regla: "Opcional." },
  { campo: "Fecha inicio cronograma",  tipo: "Fecha",              obligatorio: "Sí",       valores: "YYYY-MM-DD",                                   regla: "Mínimo 13 días hábiles desde hoy (Colombia). No se cuentan fines de semana ni festivos." },
  { campo: "Fecha fin cronograma",     tipo: "Fecha",              obligatorio: "Sí",       valores: "YYYY-MM-DD",                                   regla: "Debe ser mayor o igual a la fecha de inicio." },
  { campo: "¿Tiene fases?",            tipo: "Toggle Sí/No",       obligatorio: "No",       valores: "Sí / No",                                      regla: "Activa el modo de fases en el cronograma." },
  { campo: "Actividades",              tipo: "Tabla",              obligatorio: "Sí",       valores: "Descripción + Fecha inicio + Fecha fin por fila", regla: "Mínimo 1 actividad con descripción no vacía." },
];

// ── Botones por estado ────────────────────────────────────────────────────────

export const BOTONES_POR_ESTADO: BtnRow[] = [
  { estado: "BORRADOR",               boton: "Guardar borrador",    rol: "Solicitante (propietario)",      resultado: "Guarda sin validar. Queda en BORRADOR.",                          camposExtra: "—" },
  { estado: "BORRADOR",               boton: "Enviar",              rol: "Solicitante (propietario)",      resultado: "Valida todos los campos obligatorios y envía. Pasa a ENVIADA (o PENDIENTE_DIRECTOR_TECNICO si el rol es TECNICA).", camposExtra: "—" },
  { estado: "BORRADOR",               boton: "Editar",              rol: "Solicitante (propietario)",      resultado: "Abre el formulario para editar el borrador.",                      camposExtra: "—" },
  { estado: "PENDIENTE_DIR_TECNICO",  boton: "Aprobar",             rol: "Director Técnico",               resultado: "Aprueba y pasa a ENVIADA para aprobación del Director de Proyecto.", camposExtra: "Nota (opcional)" },
  { estado: "PENDIENTE_DIR_TECNICO",  boton: "Devolver",            rol: "Director Técnico",               resultado: "Devuelve al solicitante. Pasa a DEVUELTA.",                        camposExtra: "Nota (obligatoria)" },
  { estado: "ENVIADA",                boton: "Aprobar",             rol: "Director de Proyecto del frente", resultado: "Aprueba y pasa a EN_TRAMITE_CONTRATOS.",                          camposExtra: "Nota (opcional)" },
  { estado: "ENVIADA",                boton: "Devolver",            rol: "Director de Proyecto del frente", resultado: "Devuelve al solicitante. Pasa a DEVUELTA.",                       camposExtra: "Nota (obligatoria)" },
  { estado: "EN_TRAMITE_CONTRATOS",   boton: "Tramitar (OK)",       rol: "Contratos",                      resultado: "Documentación revisada. Pasa a CREACION_MINUTA.",                 camposExtra: "Nota (opcional)" },
  { estado: "EN_TRAMITE_CONTRATOS",   boton: "Enviar a revisión",   rol: "Contratos",                      resultado: "Solicita correcciones al solicitante. Pasa a EN_REVISION.",        camposExtra: "Nota (obligatoria)" },
  { estado: "EN_TRAMITE_CONTRATOS",   boton: "Devolver",            rol: "Contratos",                      resultado: "Devuelve al solicitante. Pasa a DEVUELTA.",                        camposExtra: "Nota (obligatoria)" },
  { estado: "EN_REVISION",            boton: "Reenviar",            rol: "Solicitante (propietario)",      resultado: "Reenvía tras correcciones. Vuelve a EN_TRAMITE_CONTRATOS.",        camposExtra: "Nota (opcional)" },
  { estado: "CREACION_MINUTA",        boton: "Subir anexo",         rol: "Contratos",                      resultado: "Adjunta un documento (contrato, póliza, etc.) a la solicitud.",   camposExtra: "Archivo + nombre del documento" },
  { estado: "CREACION_MINUTA",        boton: "Avanzar a Controles", rol: "Contratos (requiere ≥1 anexo)",  resultado: "Envía la solicitud con sus anexos al equipo de Controles. Pasa a ENVIO_CONTRATO_POLIZAS.", camposExtra: "—" },
  { estado: "ENVIO_CONTRATO_POLIZAS", boton: "Pasar a Controles",   rol: "Contratos",                      resultado: "Confirma que el contrato y pólizas fueron enviados. Pasa a EN_CONTROLES.", camposExtra: "—" },
  { estado: "EN_CONTROLES",           boton: "Registrar ADPRO",     rol: "Controles",                      resultado: "Registra el número de contrato en ADPRO. Pasa a APROBACION_FINAL.", camposExtra: "Número de contrato ADPRO (obligatorio)" },
  { estado: "APROBACION_FINAL",       boton: "Aprobar definitivo",  rol: "Director de Controles",          resultado: "Aprobación final. La solicitud queda COMPLETADA.",                 camposExtra: "Estado de contratación, nota (opcionales)" },
  { estado: "DEVUELTA",               boton: "Reenviar",            rol: "Solicitante (propietario)",      resultado: "Reenvía la solicitud corregida. Vuelve a ENVIADA.",                camposExtra: "Nota (opcional)" },
  { estado: "DEVUELTA",               boton: "Editar",              rol: "Solicitante (propietario)",      resultado: "Abre el formulario para hacer correcciones antes de reenviar.",    camposExtra: "—" },
];

// ── Campos del formulario de tercero ─────────────────────────────────────────

export const CAMPOS_TERCERO: FieldRow[] = [
  { campo: "Razón social",              tipo: "Texto",   obligatorio: "Sí",  valores: "Nombre legal de la empresa",   regla: "Debe ser único en el sistema." },
  { campo: "NIT",                       tipo: "Texto",   obligatorio: "Sí",  valores: "000000000-0",                  regla: "Formato con dígito de verificación." },
  { campo: "Tipo de contrato",          tipo: "Selección", obligatorio: "Sí", valores: "Obra, Suministro, Servicios, Diseño, Consultoría, Arrendamiento, Otro", regla: "Define la categoría del tercero." },
  { campo: "Confidencialidad",          tipo: "Toggle",  obligatorio: "No",  valores: "Sí / No",                      regla: "Marca si la información del tercero es confidencial." },
  { campo: "Representante legal",       tipo: "Texto",   obligatorio: "Sí",  valores: "Nombre completo",              regla: "—" },
  { campo: "Cédula representante",      tipo: "Texto",   obligatorio: "Sí",  valores: "Número de cédula",             regla: "—" },
  { campo: "Correo de firma",           tipo: "Email",   obligatorio: "Sí",  valores: "correo@dominio.com",           regla: "Usado para envíos de documentos para firma." },
  { campo: "Dirección representante",   tipo: "Texto",   obligatorio: "Sí",  valores: "Dirección completa",           regla: "—" },
  { campo: "Teléfono representante",    tipo: "Texto",   obligatorio: "Sí",  valores: "Número de teléfono",           regla: "—" },
  { campo: "Nombre contacto",           tipo: "Texto",   obligatorio: "No",  valores: "Nombre del contacto operativo", regla: "Persona de contacto para operaciones del día a día." },
  { campo: "Teléfono contacto",         tipo: "Texto",   obligatorio: "No",  valores: "Número de teléfono",           regla: "—" },
  { campo: "Correo contacto",           tipo: "Email",   obligatorio: "No",  valores: "correo@dominio.com",           regla: "—" },
  { campo: "Fecha venc. SAGRILAFT",     tipo: "Fecha",   obligatorio: "No",  valores: "DD/MM/YYYY",                   regla: "Fecha de vencimiento del registro SAGRILAFT." },
  { campo: "DD — Identificación contraparte",     tipo: "Toggle", obligatorio: "No", valores: "✓ / ✗", regla: "Check 1 de 6 de Debida Diligencia." },
  { campo: "DD — Consulta listas restrictivas",   tipo: "Toggle", obligatorio: "No", valores: "✓ / ✗", regla: "Check 2 de 6 de Debida Diligencia." },
  { campo: "DD — Verificación PEP",               tipo: "Toggle", obligatorio: "No", valores: "✓ / ✗", regla: "Check 3 de 6 de Debida Diligencia." },
  { campo: "DD — Conocimiento del cliente",       tipo: "Toggle", obligatorio: "No", valores: "✓ / ✗", regla: "Check 4 de 6 de Debida Diligencia." },
  { campo: "DD — Verificación beneficiarios",     tipo: "Toggle", obligatorio: "No", valores: "✓ / ✗", regla: "Check 5 de 6 de Debida Diligencia." },
  { campo: "DD — Evaluación de riesgo",           tipo: "Toggle", obligatorio: "No", valores: "✓ / ✗", regla: "Check 6 de 6. El tercero queda aprobado cuando los 6 están activos." },
  { campo: "Especialidades",            tipo: "Selección múltiple", obligatorio: "No", valores: "Lista del catálogo de especialidades", regla: "Clasifica al tercero por área de trabajo." },
];

// ── Campos del formulario de usuario ─────────────────────────────────────────

export const CAMPOS_USUARIO: FieldRow[] = [
  { campo: "Nombre completo",               tipo: "Texto",              obligatorio: "Sí",           valores: "Nombre y apellidos",                 regla: "—" },
  { campo: "Cargo",                         tipo: "Texto",              obligatorio: "Sí",           valores: "Ej: \"Coordinador de Obra\"",        regla: "—" },
  { campo: "Email",                         tipo: "Email",              obligatorio: "Sí",           valores: "correo@empresa.com",                 regla: "Debe ser único. Es el usuario de acceso." },
  { campo: "Teléfono",                      tipo: "Texto",              obligatorio: "No",           valores: "Número de contacto",                 regla: "—" },
  { campo: "Rol(es)",                       tipo: "Selección múltiple", obligatorio: "Sí",           valores: "SOLICITANTE, TECNICA, DIRECTOR_TECNICO, DIRECTOR_PROYECTO, CONTRATOS, CONTROLES, DIRECTOR_CONTROLES, ADMIN", regla: "Un usuario puede tener más de un rol." },
  { campo: "Contraseña",                    tipo: "Contraseña",         obligatorio: "Sí (creación)", valores: "Mínimo 6 caracteres",               regla: "En edición, dejar vacío para no cambiar." },
  { campo: "Frentes asignados",             tipo: "Selección múltiple", obligatorio: "No",           valores: "Lista de frentes activos",           regla: "Define qué solicitudes puede ver el usuario." },
  { campo: "Funcionalidades adicionales",   tipo: "Selección múltiple", obligatorio: "No",           valores: "Permisos extra fuera del rol base",  regla: "Permite dar o quitar permisos específicos sin cambiar el rol." },
];

// ── Campos del formulario de frente ──────────────────────────────────────────

export const CAMPOS_FRENTE: FieldRow[] = [
  { campo: "Nombre del frente", tipo: "Texto",    obligatorio: "Sí", valores: "Ej: \"KALA 1\"",          regla: "Se usa en el consecutivo (normalizado, sin tildes ni espacios)." },
  { campo: "Proyecto",          tipo: "Selección", obligatorio: "Sí", valores: "Lista de proyectos activos", regla: "—" },
  { campo: "Etapa",             tipo: "Número",   obligatorio: "No", valores: "Entero positivo",          regla: "Informativo. Permite filtrar frentes por etapa." },
];

export const CAMPOS_PROYECTO: FieldRow[] = [
  { campo: "Nombre del proyecto",    tipo: "Texto", obligatorio: "Sí",  valores: "Nombre completo del proyecto",  regla: "—" },
  { campo: "Código de consecutivo",  tipo: "Texto", obligatorio: "No",  valores: "Ej: \"BK\"",                    regla: "Aparece en el consecutivo de cada solicitud (SOL-ODS-BK-...)." },
];

// ── Sección Aprobadores por frente ────────────────────────────────────────────

export const CAMPOS_APROBADORES: FieldRow[] = [
  { campo: "Director de Proyecto",           tipo: "Selección", obligatorio: "Sí",  valores: "Usuarios con rol DIRECTOR_PROYECTO", regla: "Aprobador primario. Si no se configura, cualquier Director del frente puede aprobar." },
  { campo: "Responsable Contratos – Trámite", tipo: "Selección", obligatorio: "No", valores: "Usuarios con rol CONTRATOS",         regla: "Se asigna automáticamente al crear la solicitud." },
  { campo: "Responsable Contratos – Minuta",  tipo: "Selección", obligatorio: "No", valores: "Usuarios con rol CONTRATOS",         regla: "—" },
  { campo: "Coordinador Controles",           tipo: "Selección", obligatorio: "No", valores: "Usuarios con rol CONTROLES",         regla: "Informativo. Cualquier usuario CONTROLES puede registrar ADPRO." },
  { campo: "Director de Controles",           tipo: "Selección", obligatorio: "No", valores: "Usuarios con rol DIRECTOR_CONTROLES", regla: "Da la aprobación final." },
];
```

- [ ] **Step 4.2: Commit**

```bash
git add solicitudes-indirectos/scripts/generate-docs/content.ts
git commit -m "feat(docs): add document text content module"
```

---

## Task 5: Crear generate-docx.ts

**Files:**
- Create: `solicitudes-indirectos/scripts/generate-docs/generate-docx.ts`

- [ ] **Step 5.1: Crear el archivo**

Crear `solicitudes-indirectos/scripts/generate-docs/generate-docx.ts`:

```typescript
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  TableLayoutType, ImageRun, PageBreak, UnderlineType,
} from "docx";
import * as fs from "fs";
import * as path from "path";
import {
  INTRO_TEXT, MICROSOFT_WARNING, ROLES_TABLE, TIPOS_SOLICITUD,
  CAMPOS_SOLICITUD, BOTONES_POR_ESTADO, CAMPOS_TERCERO,
  CAMPOS_USUARIO, CAMPOS_FRENTE, CAMPOS_PROYECTO, CAMPOS_APROBADORES,
  type FieldRow, type BtnRow, type RolRow,
} from "./content";

const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");
const OUTPUT_PATH     = path.join(__dirname, "../../manual-usuario.docx");

// ── Image helpers ─────────────────────────────────────────────────────────────

const IMG_W = 530; // ~14cm en Word A4 con márgenes estándar
const IMG_H = 332; // mantiene proporción 1440×900

function img(filename: string): ImageRun | null {
  const p = path.join(SCREENSHOTS_DIR, filename);
  if (!fs.existsSync(p)) {
    console.warn(`  ⚠️  Captura no encontrada: ${filename}`);
    return null;
  }
  return new ImageRun({
    data: fs.readFileSync(p) as unknown as string,
    transformation: { width: IMG_W, height: IMG_H },
    type: "png",
  });
}

function imgParagraph(filename: string): Paragraph {
  const image = img(filename);
  if (!image) {
    return new Paragraph({
      children: [new TextRun({ text: `[Captura no disponible: ${filename}]`, italics: true, color: "999999" })],
      spacing: { before: 120, after: 120 },
    });
  }
  return new Paragraph({
    children: [image],
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 200 },
  });
}

// ── Text helpers ──────────────────────────────────────────────────────────────

function h1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, color: "1E3A8A", size: 36 })],
    spacing: { before: 480, after: 200 },
    pageBreakBefore: true,
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, color: "1E3A8A", size: 28 })],
    spacing: { before: 320, after: 120 },
  });
}

function h3(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, bold: true, size: 24 })],
    spacing: { before: 240, after: 80 },
  });
}

function p(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    spacing: { before: 80, after: 80 },
  });
}

function spacer(): Paragraph {
  return new Paragraph({ text: "", spacing: { before: 80, after: 80 } });
}

function warningBox(text: string): Table {
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 6, color: "D97706" },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "D97706" },
      left:   { style: BorderStyle.SINGLE, size: 6, color: "D97706" },
      right:  { style: BorderStyle.SINGLE, size: 6, color: "D97706" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: "FEF3C7", type: ShadingType.CLEAR, color: "auto" },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "⚠️ IMPORTANTE  ", bold: true, size: 22, color: "92400E" }),
                  new TextRun({ text, size: 22, color: "92400E" }),
                ],
                spacing: { before: 60, after: 60 },
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ── Generic table ─────────────────────────────────────────────────────────────

function headerCell(text: string): TableCell {
  return new TableCell({
    shading: { fill: "1E3A8A", type: ShadingType.CLEAR, color: "auto" },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 18 })],
      }),
    ],
  });
}

function dataCell(text: string, shade?: string): TableCell {
  return new TableCell({
    shading: shade ? { fill: shade, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 18 })],
      }),
    ],
  });
}

// ── Field table ───────────────────────────────────────────────────────────────

function fieldTable(rows: FieldRow[]): Table {
  const headers = ["Campo", "Tipo", "Obligatorio", "Valores / Formato", "Regla de negocio"];
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map(headerCell) }),
      ...rows.map((r, i) =>
        new TableRow({
          children: [
            dataCell(r.campo,        i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.tipo,         i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.obligatorio,  i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.valores,      i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.regla,        i % 2 ? "F8FAFC" : "FFFFFF"),
          ],
        })
      ),
    ],
  });
}

// ── Button table ──────────────────────────────────────────────────────────────

function buttonTable(rows: BtnRow[]): Table {
  const headers = ["Estado", "Botón", "Rol requerido", "Resultado", "Campos adicionales"];
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map(headerCell) }),
      ...rows.map((r, i) =>
        new TableRow({
          children: [
            dataCell(r.estado,       i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.boton,        i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.rol,          i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.resultado,    i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.camposExtra,  i % 2 ? "F8FAFC" : "FFFFFF"),
          ],
        })
      ),
    ],
  });
}

// ── Roles table ───────────────────────────────────────────────────────────────

function rolesTable(rows: RolRow[]): Table {
  const headers = ["Rol", "Nombre", "Puede hacer", "Ve en el sistema"];
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map(headerCell) }),
      ...rows.map((r, i) =>
        new TableRow({
          children: [
            dataCell(r.rol,    i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.nombre, i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.puede,  i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.ve,     i % 2 ? "F8FAFC" : "FFFFFF"),
          ],
        })
      ),
    ],
  });
}

// ── Estado flow table ─────────────────────────────────────────────────────────

function estadoFlowTable(): Table {
  const headers = ["Acción", "Estado origen", "Estado destino", "Rol requerido", "Campos adicionales"];
  const rows = [
    ["Enviar",                "BORRADOR",               "ENVIADA (o PENDIENTE_DIR_TECNICO si rol=TECNICA)", "Solicitante / TECNICA",    "—"],
    ["Aprobar Dir. Técnico",  "PENDIENTE_DIR_TECNICO",  "ENVIADA",                                          "Director Técnico",         "Nota (opcional)"],
    ["Aprobar Director",      "ENVIADA",                "EN_TRAMITE_CONTRATOS",                             "Director de Proyecto",     "Nota (opcional)"],
    ["Devolver",              "PENDIENTE / ENVIADA / EN_TRAMITE_CONTRATOS", "DEVUELTA",                    "Dir. Técnico / Dir. Proyecto / Contratos", "Nota (obligatoria)"],
    ["Tramitar OK",           "EN_TRAMITE_CONTRATOS",   "CREACION_MINUTA",                                  "Contratos",                "Nota (opcional)"],
    ["Enviar a revisión",     "EN_TRAMITE_CONTRATOS",   "EN_REVISION",                                      "Contratos",                "Nota (obligatoria)"],
    ["Avanzar a Controles",   "CREACION_MINUTA",        "ENVIO_CONTRATO_POLIZAS",                           "Contratos (≥1 anexo)",     "—"],
    ["Pasar a Controles",     "ENVIO_CONTRATO_POLIZAS", "EN_CONTROLES",                                     "Contratos",                "—"],
    ["Registrar ADPRO",       "EN_CONTROLES",           "APROBACION_FINAL",                                 "Controles",                "N° contrato Adpro (obligatorio)"],
    ["Aprobar definitivo",    "APROBACION_FINAL",       "COMPLETADA",                                       "Director de Controles",    "Estado contratación, nota (opcionales)"],
    ["Reenviar",              "DEVUELTA / EN_REVISION", "ENVIADA",                                          "Solicitante",              "Nota (opcional)"],
  ];
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map(headerCell) }),
      ...rows.map((r, i) =>
        new TableRow({
          children: r.map((cell) => dataCell(cell, i % 2 ? "F8FAFC" : "FFFFFF")),
        })
      ),
    ],
  });
}

// ── Document assembly ─────────────────────────────────────────────────────────

async function main() {
  console.log("📄 Generando manual-usuario.docx...\n");

  const doc = new Document({
    styles: {
      paragraphStyles: [
        { id: "Normal", name: "Normal", run: { size: 22, font: "Calibri" } },
      ],
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 900, right: 720 } },
        },
        children: [

          // ═══════════════════════════════════════════════════════════════════
          // PORTADA
          // ═══════════════════════════════════════════════════════════════════
          new Paragraph({
            children: [new TextRun({ text: "MANUAL DE USUARIO", bold: true, size: 56, color: "1E3A8A" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 2000, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Sistema de Solicitudes de Indirectos", size: 36, color: "374151" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Baia Kristal — AED Constructores S.A.S", size: 28, color: "6B7280" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Versión 1.0  |  Junio 2026", size: 24, color: "9CA3AF" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 800 },
          }),

          // ═══════════════════════════════════════════════════════════════════
          // 1. INTRODUCCIÓN
          // ═══════════════════════════════════════════════════════════════════
          h1("1. Introducción"),
          p(INTRO_TEXT),
          spacer(),
          warningBox(MICROSOFT_WARNING),
          spacer(),
          h2("1.1 Cómo acceder al sistema"),
          p("Ingresa desde tu navegador a la URL del sistema. En la pantalla de inicio de sesión, escribe tu correo corporativo y contraseña asignados por el administrador."),
          imgParagraph("01-login.png"),

          // ═══════════════════════════════════════════════════════════════════
          // 2. ROLES Y ACCESOS
          // ═══════════════════════════════════════════════════════════════════
          h1("2. Roles y Accesos"),
          p("El sistema tiene 8 roles. Cada usuario puede tener uno o más roles asignados. El administrador puede añadir funcionalidades adicionales a un usuario sin cambiar su rol base."),
          spacer(),
          rolesTable(ROLES_TABLE),

          // ═══════════════════════════════════════════════════════════════════
          // 3. FLUJO DEL PROCESO
          // ═══════════════════════════════════════════════════════════════════
          h1("3. Flujo del Proceso"),
          p("Toda solicitud sigue el ciclo de vida que se describe a continuación. Cada estado tiene un color distintivo en el sistema para identificarlo rápidamente."),
          spacer(),

          h2("3.1 Estados de una solicitud"),
          ...([
            ["BORRADOR",                "Gris",    "La solicitud fue creada pero aún no se ha enviado."],
            ["PENDIENTE DIR. TÉCNICO",  "Violeta", "Esperando aprobación del Director Técnico (solo solicitudes de Coordinador Técnico)."],
            ["ENVIADA",                 "Azul",    "Enviada al Director de Proyecto para aprobación."],
            ["EN TRÁMITE CONTRATOS",    "Púrpura", "En revisión y tramitación por el área de Contratos."],
            ["CREACIÓN DE MINUTA",      "Naranja", "Contratos está preparando la minuta del contrato y subiendo anexos."],
            ["ENVÍO CONTRATO Y PÓLIZAS","Cyan",    "El contrato y pólizas fueron enviados, pendiente confirmación."],
            ["EN CONTROLES",            "Verde azulado", "En proceso de registro en ADPRO por Controles."],
            ["APROBACIÓN FINAL",        "Lima",    "Pendiente de aprobación definitiva por el Director de Controles."],
            ["COMPLETADA",              "Verde",   "Solicitud aprobada y cerrada exitosamente."],
            ["DEVUELTA",                "Rojo",    "Devuelta al solicitante para correcciones."],
            ["EN REVISIÓN",             "Amarillo","Enviada de vuelta al solicitante por Contratos para ajustes puntuales."],
          ] as [string, string, string][]).map(([estado, color, desc]) =>
            new Paragraph({
              children: [
                new TextRun({ text: `${estado}  `, bold: true, size: 20 }),
                new TextRun({ text: `(${color})  `, size: 20, color: "6B7280" }),
                new TextRun({ text: desc, size: 20 }),
              ],
              spacing: { before: 60, after: 60 },
              bullet: { level: 0 },
            })
          ),

          spacer(),
          h2("3.2 Tabla de transiciones"),
          p("Esta tabla muestra qué acción lleva de un estado a otro y quién puede ejecutarla."),
          spacer(),
          estadoFlowTable(),

          // ═══════════════════════════════════════════════════════════════════
          // 4. RECORRIDO POR ROL
          // ═══════════════════════════════════════════════════════════════════
          h1("4. Recorrido por Rol"),
          p("Esta sección describe el flujo típico desde la perspectiva de cada rol."),

          // 4.1 Solicitante
          h2("4.1 Solicitante"),
          p("El Solicitante crea solicitudes, las envía y las corrige si son devueltas."),
          h3("Dashboard"),
          p("Al ingresar, el dashboard muestra un resumen de tus solicitudes activas."),
          imgParagraph("02-dashboard-solicitante.png"),
          h3("Paso 1 — Crear nueva solicitud"),
          p("Haz clic en Nueva Solicitud. Elige el tipo de solicitud que corresponde a tu necesidad."),
          imgParagraph("04-nueva-tipo.png"),
          h3("Paso 2 — Llenar el formulario"),
          p("Completa todos los campos obligatorios (marcados con asterisco rojo). Puedes guardar el borrador en cualquier momento con el botón Guardar borrador."),
          imgParagraph("05-form-encabezado.png"),
          imgParagraph("05-form-informacion.png"),
          imgParagraph("05-form-contratista.png"),
          imgParagraph("05-form-contrato.png"),
          imgParagraph("05-form-documentos.png"),
          imgParagraph("05-form-cronograma.png"),
          h3("Paso 3 — Enviar la solicitud"),
          p("Cuando hayas completado todos los campos y subido los archivos requeridos, haz clic en Enviar. Si falta algún campo, el sistema te llevará al primer error."),
          imgParagraph("06-detalle-borrador.png"),
          h3("Paso 4 — Solicitud devuelta"),
          p("Si tu solicitud es devuelta, recibirás una notificación. Abre la solicitud, revisa la nota del aprobador, corrige lo necesario y haz clic en Reenviar."),
          imgParagraph("14-detalle-devuelta.png"),

          // 4.2 Director Técnico
          h2("4.2 Director Técnico"),
          p("El Director Técnico aprueba o devuelve las solicitudes creadas por Coordinadores Técnicos antes de que lleguen al Director de Proyecto."),
          imgParagraph("07-detalle-enviada.png"),
          p("Botones disponibles: Aprobar (pasa a ENVIADA para el Director de Proyecto) o Devolver (regresa al solicitante con una nota)."),

          // 4.3 Director de Proyecto
          h2("4.3 Director de Proyecto"),
          p("El Director de Proyecto recibe las solicitudes de su frente y las aprueba o devuelve."),
          imgParagraph("07-detalle-enviada.png"),
          p("Botones disponibles: Aprobar (pasa a EN_TRAMITE_CONTRATOS) o Devolver (regresa al solicitante con una nota obligatoria)."),

          // 4.4 Contratos
          h2("4.4 Contratos"),
          p("El área de Contratos tramita la solicitud, prepara la minuta y los documentos, y los envía a Controles."),
          h3("En Trámite Contratos"),
          imgParagraph("08-detalle-en-tramite.png"),
          p("Opciones: Tramitar OK (documentación en orden, pasa a CREACION_MINUTA) o Enviar a revisión (solicita correcciones al solicitante)."),
          h3("Creación de Minuta"),
          imgParagraph("09-detalle-creacion-minuta.png"),
          p("En este estado aparece la zona de subida de anexos. Sube el contrato, las pólizas y cualquier documento adicional. Cuando hayas subido todos los documentos, haz clic en Avanzar a Controles."),
          h3("Envío de Contrato y Pólizas"),
          imgParagraph("10-detalle-envio-polizas.png"),
          p("Confirma que el contrato y las pólizas fueron enviados haciendo clic en Pasar a Controles."),

          // 4.5 Controles
          h2("4.5 Controles"),
          p("Controles registra el número de contrato en el sistema ADPRO."),
          imgParagraph("11-detalle-en-controles.png"),
          p("Haz clic en Registrar ADPRO, escribe el número de contrato y confirma. La solicitud pasa a APROBACION_FINAL."),

          // 4.6 Director de Controles
          h2("4.6 Director de Controles"),
          p("El Director de Controles da la aprobación definitiva y cierra el proceso."),
          imgParagraph("12-detalle-aprobacion-final.png"),
          p("Haz clic en Aprobar definitivo. La solicitud queda en estado COMPLETADA."),
          imgParagraph("13-detalle-completada.png"),

          // 4.7 Administrador
          h2("4.7 Administrador"),
          p("El Administrador tiene acceso completo al sistema: usuarios, frentes, proyectos, terceros y toda la configuración."),
          imgParagraph("02-dashboard-admin.png"),

          // ═══════════════════════════════════════════════════════════════════
          // 5. REFERENCIA DE MÓDULOS
          // ═══════════════════════════════════════════════════════════════════
          h1("5. Referencia de Módulos"),

          // 5.1 Lista de solicitudes
          h2("5.1 Lista de Solicitudes"),
          p("Muestra todas las solicitudes a las que tienes acceso según tu rol. Puedes filtrar por estado, tipo y fecha. Haz clic en cualquier fila para ver el detalle."),
          imgParagraph("03-solicitudes-lista.png"),

          // 5.2 Detalle de solicitud
          h2("5.2 Detalle de Solicitud"),
          p("Muestra toda la información de una solicitud: consecutivo, estado (badge de color), tipo, solicitante, tercero, valor, frentes, cronograma, documentos adjuntos, historial de acciones y botones de acción según el estado y tu rol."),
          p("Documentos generables desde el detalle:"),
          new Paragraph({ children: [new TextRun({ text: "Resumen de Licitación — genera un archivo Word (.docx) con los datos de la solicitud.", size: 20 })], bullet: { level: 0 }, spacing: { before: 40, after: 40 } }),
          new Paragraph({ children: [new TextRun({ text: "Cronograma — genera un archivo Excel (.xlsx) con el cronograma de actividades.", size: 20 })],   bullet: { level: 0 }, spacing: { before: 40, after: 40 } }),

          // 5.3 Terceros
          h2("5.3 Módulo de Terceros"),
          h3("Lista de Terceros"),
          p("Muestra todos los terceros registrados. Puedes buscar por nombre o NIT. El ícono verde indica que el tercero tiene Debida Diligencia completa y puede ser seleccionado en solicitudes."),
          imgParagraph("16-terceros-lista.png"),
          h3("Detalle de Tercero"),
          p("Muestra la ficha completa del tercero incluyendo los 6 checks de Debida Diligencia y sus especialidades."),
          imgParagraph("17-tercero-detalle.png"),
          h3("Nuevo Tercero"),
          imgParagraph("18-tercero-nuevo.png"),

          // 5.4 Configuración
          h2("5.4 Módulo de Configuración (solo ADMIN)"),
          h3("Usuarios"),
          p("Crea, edita, activa y desactiva usuarios. Asigna roles, frentes y funcionalidades adicionales."),
          imgParagraph("19-config-usuarios.png"),
          h3("Frentes y Proyectos"),
          p("Crea proyectos y frentes. Cada frente pertenece a un proyecto. El nombre del frente se usa en el consecutivo de las solicitudes."),
          imgParagraph("20-config-frentes.png"),
          h3("Aprobadores por Frente"),
          p("Configura qué usuarios son responsables de aprobar, tramitar y controlar las solicitudes de cada frente."),
          imgParagraph("21-config-aprobadores.png"),

          // 5.5 Perfil
          h2("5.5 Perfil y Ajustes"),
          spacer(),
          warningBox("Para vincular tu cuenta Microsoft: ve a Perfil (haz clic en tu nombre, esquina superior derecha) y busca el botón \"Vincular cuenta Microsoft\". Completa el proceso de autenticación con tu cuenta corporativa. Solo debes hacerlo una vez."),
          spacer(),
          imgParagraph("22-perfil-vincular.png"),

          // ═══════════════════════════════════════════════════════════════════
          // 6. REFERENCIA DE FORMULARIOS
          // ═══════════════════════════════════════════════════════════════════
          h1("6. Referencia de Formularios"),
          p("Las siguientes tablas detallan todos los campos de cada formulario: tipo de dato esperado, si es obligatorio y las reglas de negocio que aplican."),

          h2("6.1 Formulario de Solicitud"),
          p("Este formulario se usa para crear y editar solicitudes. Todos los tipos de solicitud (ODS, Contrato, Otrosíes, Trámites) comparten el mismo formulario con pequeñas variaciones según el tipo."),
          spacer(),
          fieldTable(CAMPOS_SOLICITUD),

          h2("6.2 Botones por Estado"),
          p("Esta tabla muestra exactamente qué botones aparecen en el detalle de una solicitud según su estado y el rol del usuario conectado."),
          spacer(),
          buttonTable(BOTONES_POR_ESTADO),

          h2("6.3 Formulario de Tercero"),
          spacer(),
          fieldTable(CAMPOS_TERCERO),

          h2("6.4 Formulario de Usuario"),
          p("Disponible en Configuración → Usuarios (solo ADMIN)."),
          spacer(),
          fieldTable(CAMPOS_USUARIO),

          h2("6.5 Formulario de Frente"),
          p("Disponible en Configuración → Frentes (solo ADMIN)."),
          spacer(),
          fieldTable(CAMPOS_FRENTE),

          h2("6.6 Formulario de Proyecto"),
          spacer(),
          fieldTable(CAMPOS_PROYECTO),

          h2("6.7 Configuración de Aprobadores por Frente"),
          spacer(),
          fieldTable(CAMPOS_APROBADORES),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUTPUT_PATH, buffer);
  console.log(`✅ manual-usuario.docx generado en: ${OUTPUT_PATH}`);
  console.log(`   Tamaño: ${(buffer.byteLength / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
```

- [ ] **Step 5.2: Commit**

```bash
git add solicitudes-indirectos/scripts/generate-docs/generate-docx.ts
git commit -m "feat(docs): add docx generation script"
```

---

## Task 6: Ejecutar el pipeline completo

- [ ] **Step 6.1: Asegurarse de que la BD tiene datos semilla**

```bash
cd solicitudes-indirectos
npm run db:seed
```

Salida esperada: `Seed completado` (o similar sin errores).

- [ ] **Step 6.2: Crear solicitudes de prueba en cada estado**

```bash
npm run docs:setup
```

Salida esperada:
```
🔧 Configurando datos de prueba...
  ✓ BORRADOR                        → id=X
  ✓ ENVIADA                         → id=X
  ...
✅ test-data.json guardado en ...
```

- [ ] **Step 6.3: Iniciar el servidor Next.js** (en una terminal separada)

```bash
npm run dev
```

Esperar a: `✓ Ready in X.Xs`

- [ ] **Step 6.4: Capturar todas las pantallas** (en otra terminal)

```bash
npm run docs:screenshots
```

Verificar salida:
```
✅ 22 capturas guardadas en scripts/generate-docs/screenshots/
```

Si alguna captura falla con timeout, verificar que:
- El servidor está corriendo en puerto 3000
- La BD tiene los datos del seed y los de prueba
- La solicitud con ese ID existe (re-ejecutar `docs:setup` si se limpió la BD)

- [ ] **Step 6.5: Generar el documento Word**

```bash
npm run docs:generate
```

Salida esperada:
```
📄 Generando manual-usuario.docx...
✅ manual-usuario.docx generado en: .../solicitudes-indirectos/manual-usuario.docx
   Tamaño: XXXX.X KB
```

- [ ] **Step 6.6: Verificar el documento**

Abrir `solicitudes-indirectos/manual-usuario.docx` en Microsoft Word o LibreOffice Writer. Verificar que:
- Tiene portada, índice y todas las secciones
- Las capturas se ven nítidas y encajan en la página A4
- Las tablas de campos y botones tienen todas las filas
- El recuadro de advertencia de Microsoft aparece en la introducción y en la sección de Perfil
- No hay mensajes de `[Captura no disponible: ...]`

- [ ] **Step 6.7: Agregar manual-usuario.docx a .gitignore y hacer commit final**

Agregar al `.gitignore` (o al `.gitignore` de la carpeta `solicitudes-indirectos`):
```
# Generated docs
scripts/generate-docs/screenshots/
scripts/generate-docs/test-data.json
manual-usuario.docx
```

```bash
git add solicitudes-indirectos/.gitignore
git add solicitudes-indirectos/scripts/generate-docs/content.ts
git add solicitudes-indirectos/scripts/generate-docs/generate-docx.ts
git add solicitudes-indirectos/scripts/generate-docs/setup-test-data.ts
git add solicitudes-indirectos/scripts/generate-docs/capture-screenshots.ts
git commit -m "feat: add automated user manual generation scripts (Playwright + docx)"
```

---

## Self-Review

**Cobertura vs. spec:**
- ✅ Portada → Task 5 (generate-docx.ts, sección Portada)
- ✅ Introducción + aviso Microsoft → Task 5 (warningBox en sección 1 y sección 5.5)
- ✅ Roles y accesos → Task 4 (ROLES_TABLE) + Task 5 (rolesTable)
- ✅ Flujo del proceso (13 estados, tabla transiciones) → Task 4 + Task 5
- ✅ Recorrido por rol (7 sub-capítulos) → Task 5 (secciones 4.1–4.7)
- ✅ Referencia de módulos → Task 5 (secciones 5.1–5.5)
- ✅ Referencia de formularios campo a campo → Task 4 (content.ts) + Task 5 (fieldTable calls)
- ✅ Botones por estado → Task 4 (BOTONES_POR_ESTADO) + Task 5 (buttonTable)
- ✅ Capturas automáticas (22 pantallas, todos los estados) → Task 3
- ✅ Setup de datos de prueba → Task 2

**Tipos consistentes:** `FieldRow`, `BtnRow`, `RolRow` definidos en content.ts y usados en generate-docx.ts. Las funciones `fieldTable`, `buttonTable`, `rolesTable` reciben los arrays exactos exportados por content.ts.

**Sin placeholders:** Todo el código es completo. Cada paso tiene comando esperado y salida esperada.

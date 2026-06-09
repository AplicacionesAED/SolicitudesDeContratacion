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

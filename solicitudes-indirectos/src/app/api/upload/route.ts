import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Block only truly dangerous executable extensions
const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".sh", ".ps1", ".msi", ".dll", ".com",
  ".vbs", ".scr", ".pif",
]);

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

// Persistent uploads directory. In production set UPLOADS_DIR to a path on a
// mounted volume (e.g. /app/data/uploads); in dev it falls back to public/uploads.
const UPLOADS_DIR =
  process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return Response.json({ error: "No se encontró ningún archivo" }, { status: 400 });
    }

    const blob = file as File;

    if (blob.size === 0) {
      return Response.json({ error: "El archivo está vacío" }, { status: 400 });
    }

    if (blob.size > MAX_SIZE_BYTES) {
      return Response.json(
        { error: `El archivo excede el tamaño máximo de 20MB (recibido: ${(blob.size / 1024 / 1024).toFixed(2)}MB)` },
        { status: 400 }
      );
    }

    const originalName = blob.name;
    const ext = path.extname(originalName).toLowerCase();

    if (BLOCKED_EXTENSIONS.has(ext)) {
      return Response.json({ error: `Tipo de archivo no permitido: ${ext}` }, { status: 400 });
    }

    // Build safe filename
    const timestamp = Date.now();
    const safeName = originalName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/__+/g, "_")
      .slice(0, 120);
    const filename = `${timestamp}-${safeName}`;

    await mkdir(UPLOADS_DIR, { recursive: true });

    const buffer = Buffer.from(await blob.arrayBuffer());
    await writeFile(path.join(UPLOADS_DIR, filename), buffer);

    // Served through the /api/files handler (not the static public/ folder,
    // which the standalone server does not serve for runtime-written files).
    const url = `/api/files/${filename}`;
    return Response.json({ url, filename, nombre: originalName, size: blob.size }, { status: 201 });
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return Response.json({ error: "Error interno al procesar el archivo" }, { status: 500 });
  }
}

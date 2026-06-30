import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readFile, stat } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Persistent uploads directory. In production set UPLOADS_DIR to a path on a
// mounted volume (e.g. /app/data/uploads); in dev it falls back to public/uploads.
const UPLOADS_DIR =
  process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".csv": "text/csv",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".zip": "application/zip",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const { filename } = await params;

  // Reject anything that could escape the uploads directory.
  if (
    !filename ||
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.includes("\0") ||
    path.basename(filename) !== filename
  ) {
    return Response.json({ error: "Nombre de archivo inválido" }, { status: 400 });
  }

  const filePath = path.join(UPLOADS_DIR, filename);

  // Defense in depth: ensure the resolved path stays inside UPLOADS_DIR.
  const resolved = path.resolve(filePath);
  if (resolved !== path.resolve(UPLOADS_DIR, filename)) {
    return Response.json({ error: "Nombre de archivo inválido" }, { status: 400 });
  }

  try {
    const info = await stat(resolved);
    if (!info.isFile()) {
      return Response.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const buffer = await readFile(resolved);
    const ext = path.extname(filename).toLowerCase();
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

    // Strip the leading "<timestamp>-" prefix for a friendlier download name.
    const downloadName = filename.replace(/^\d+-/, "") || filename;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        "Content-Disposition": `inline; filename="${encodeURIComponent(downloadName)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT" || code === "ENOTDIR") {
      return Response.json({ error: "Archivo no encontrado" }, { status: 404 });
    }
    console.error("GET /api/files/[filename] error:", error);
    return Response.json({ error: "Error al leer el archivo" }, { status: 500 });
  }
}

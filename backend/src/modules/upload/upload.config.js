// Compartido entre upload.controller.js (POST) y files.controller.js (GET) --
// puerto de las constantes de api/upload/route.ts + api/files/[filename]/route.ts.
const path = require('path');

// Blocklist, no allowlist -- solo se rechazan extensiones ejecutables
// realmente peligrosas; todo lo demás (.docx, .csv, imágenes) se acepta,
// igual que el original.
const BLOCKED_EXTENSIONS = new Set(['.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.dll', '.com', '.vbs', '.scr', '.pif']);

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

// En el Next.js original el default era `public/uploads` (relativo a
// process.cwd()); acá no existe ese concepto de `public/` del lado del
// backend (lo sirve Vite del lado del frontend), así que el default pasa a
// ser `uploads/` en la raíz de `backend/` -- ya listado en
// backend/.gitignore. En producción, `UPLOADS_DIR` debe apuntar a un volumen
// montado persistente (ver Dockerfile), igual que documentaba el original.
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

const CONTENT_TYPES = {
  '.pdf': 'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.csv': 'text/csv',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.zip': 'application/zip',
};

module.exports = { BLOCKED_EXTENSIONS, MAX_SIZE_BYTES, UPLOADS_DIR, CONTENT_TYPES };

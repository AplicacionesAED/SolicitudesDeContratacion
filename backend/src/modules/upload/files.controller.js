// Puerto de api/files/[filename]/route.ts -- sirve un archivo subido, nunca
// desde una ruta estática (el filename se sanitiza en upload.controller.js,
// pero acá igual se revalida por defensa en profundidad: cualquier intento
// de escapar UPLOADS_DIR con '..'/rutas absolutas se rechaza).
const path = require('path');
const { readFile, stat } = require('fs/promises');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const googleDrive = require('../../services/googleDrive');
const { UPLOADS_DIR, CONTENT_TYPES } = require('./upload.config');

const servir = asyncHandler(async (req, res) => {
  const { filename } = req.params;

  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('\0') || path.basename(filename) !== filename) {
    throw new ApiError(400, 'Nombre de archivo inválido');
  }

  const filePath = path.join(UPLOADS_DIR, filename);
  const resolved = path.resolve(filePath);
  if (resolved !== path.resolve(UPLOADS_DIR, filename)) {
    throw new ApiError(400, 'Nombre de archivo inválido');
  }

  let info;
  try {
    info = await stat(resolved);
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') throw new ApiError(404, 'Archivo no encontrado');
    throw err;
  }
  if (!info.isFile()) throw new ApiError(404, 'Archivo no encontrado');

  const buffer = await readFile(resolved);
  const ext = path.extname(filename).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';
  const downloadName = filename.replace(/^\d+-/, '') || filename;

  res.set({
    'Content-Type': contentType,
    'Content-Length': String(info.size),
    'Content-Disposition': `inline; filename="${encodeURIComponent(downloadName)}"`,
    'Cache-Control': 'private, max-age=3600',
  });
  res.send(buffer);
});

// Archivos en Google Drive. requireAuth (files.routes.js) es el control de
// acceso real; el fileId lo genera Google y no es adivinable.
const servirDrive = asyncHandler(async (req, res) => {
  let archivo;
  try {
    archivo = await googleDrive.obtenerArchivoStream(req.params.fileId);
  } catch (err) {
    if (err.code === 404) throw new ApiError(404, 'Archivo no encontrado');
    throw err;
  }
  const { stream, mimeType, nombre, size } = archivo;
  // Drive guarda el nombre como "<base>-<sufijo>.<ext>": se muestra tal cual.
  res.set({
    'Content-Type': mimeType || 'application/octet-stream',
    'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(nombre || 'archivo')}`,
    // El id de un archivo de Drive es inmutable: nunca se sirve uno desactualizado.
    'Cache-Control': 'private, max-age=3600',
  });
  if (size) res.set('Content-Length', String(size));
  stream.on('error', (err) => res.destroy(err));
  stream.pipe(res);
});

module.exports = { servir, servirDrive };

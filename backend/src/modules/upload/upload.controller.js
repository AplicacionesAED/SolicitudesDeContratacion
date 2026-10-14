// Subida de archivos a Google Drive (ver services/googleDrive.js). multer en
// memoria para validar tamaño/extensión y armar el nombre seguro ANTES de
// subir, mismo orden de validaciones que el original.
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const { created } = require('../../utils/ApiResponse');
const googleDrive = require('../../services/googleDrive');
const { BLOCKED_EXTENSIONS, MAX_SIZE_BYTES, CONTENT_TYPES } = require('./upload.config');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_SIZE_BYTES } }).single('file');

function runMulter(req, res) {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        reject(new ApiError(400, `El archivo excede el tamaño máximo de 20MB`));
      } else if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

const subir = asyncHandler(async (req, res) => {
  await runMulter(req, res);

  const file = req.file;
  if (!file) throw new ApiError(400, 'No se encontró ningún archivo');
  if (file.size === 0) throw new ApiError(400, 'El archivo está vacío');

  const ext = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) throw new ApiError(400, `Tipo de archivo no permitido: ${ext}`);

  // Nombre legible + sufijo corto para que dos archivos con el mismo nombre
  // en la misma carpeta no se confundan.
  const base = path
    .basename(file.originalname, ext)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/__+/g, '_')
    .slice(0, 100);
  const filename = `${base || 'archivo'}-${crypto.randomBytes(3).toString('hex')}${ext}`;
  const mimeType = file.mimetype && file.mimetype !== 'application/octet-stream' ? file.mimetype : CONTENT_TYPES[ext] ?? 'application/octet-stream';

  const carpetaId = await googleDrive.resolverCarpetaPendientes();
  const subido = await googleDrive.subirArchivo(file.buffer, filename, mimeType, carpetaId);

  // Servido vía GET /files/drive/:fileId (autenticado), nunca un link de Drive.
  created(res, { url: `/files/drive/${subido.id}`, filename, nombre: file.originalname, size: file.size });
});

module.exports = { subir };

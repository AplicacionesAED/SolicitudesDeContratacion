// Puerto de api/upload/route.ts -- multer en memoria (no diskStorage) para
// poder validar tamaño/extensión y construir el nombre seguro ANTES de
// escribir a disco, mismo orden de validaciones que el original.
const path = require('path');
const { mkdir, writeFile } = require('fs/promises');
const multer = require('multer');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const { created } = require('../../utils/ApiResponse');
const { BLOCKED_EXTENSIONS, MAX_SIZE_BYTES, UPLOADS_DIR } = require('./upload.config');

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

  const timestamp = Date.now();
  const safeName = file.originalname
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/__+/g, '_')
    .slice(0, 120);
  const filename = `${timestamp}-${safeName}`;

  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, filename), file.buffer);

  // Servido vía GET /files/:filename (autenticado), nunca como estático --
  // mismo criterio que el original.
  created(res, { url: `/files/${filename}`, filename, nombre: file.originalname, size: file.size });
});

module.exports = { subir };

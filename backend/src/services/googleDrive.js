// Cliente de Google Drive -- almacenamiento real de los archivos de las
// solicitudes (mismo esquema que el HRMS: cuenta de servicio, sin OAuth
// interactivo). Reemplaza el disco local (UPLOADS_DIR), que en Docker se
// pierde en cada redeploy si no hay un volumen persistente.
//
// Jerarquia: <raiz>/<yyyy-mm>/<archivo>, donde <raiz> es la carpeta
// "1. SOLICITUDES DE CONTRATACIÓN" de Drive, exclusiva de este proyecto. El archivo se sube ANTES
// de que exista la solicitud (el consecutivo se genera al crearla), por eso
// la carpeta es por mes y no por consecutivo.
//
// Credencial (mutuamente sustituibles, se prueba primero la primera):
// - GOOGLE_DRIVE_CREDENTIALS_JSON: contenido COMPLETO del .json pegado como
//   variable de entorno (Docker/Coolify, no hay donde montar un archivo).
// - GOOGLE_DRIVE_KEY_FILE: ruta a un .json en disco (dev local, gitignoreado).
// La cuenta de servicio debe ser miembro/editor de GOOGLE_DRIVE_ROOT_FOLDER_ID
// (idealmente en una Unidad Compartida).
const { Readable } = require('stream');
const { google } = require('googleapis');
const ApiError = require('../utils/ApiError');

const FOLDER_MIME = 'application/vnd.google-apps.folder';

let driveClient = null;

// Se resuelve recien en el primer uso real: un servidor sin Drive configurado
// igual arranca y sirve el resto de la app.
function getDriveClient() {
  const { GOOGLE_DRIVE_CREDENTIALS_JSON, GOOGLE_DRIVE_KEY_FILE, GOOGLE_DRIVE_ROOT_FOLDER_ID } = process.env;
  if ((!GOOGLE_DRIVE_CREDENTIALS_JSON && !GOOGLE_DRIVE_KEY_FILE) || !GOOGLE_DRIVE_ROOT_FOLDER_ID) {
    throw new ApiError(
      500,
      'Google Drive no está configurado en este servidor (falta GOOGLE_DRIVE_CREDENTIALS_JSON o GOOGLE_DRIVE_KEY_FILE, y/o GOOGLE_DRIVE_ROOT_FOLDER_ID).'
    );
  }
  if (!driveClient) {
    const authOptions = { scopes: ['https://www.googleapis.com/auth/drive'] };
    if (GOOGLE_DRIVE_CREDENTIALS_JSON) {
      try {
        authOptions.credentials = JSON.parse(GOOGLE_DRIVE_CREDENTIALS_JSON);
      } catch {
        throw new ApiError(500, 'GOOGLE_DRIVE_CREDENTIALS_JSON no es un JSON válido: revisar que se haya pegado el archivo completo.');
      }
    } else {
      authOptions.keyFile = GOOGLE_DRIVE_KEY_FILE;
    }
    driveClient = google.drive({ version: 'v3', auth: new google.auth.GoogleAuth(authOptions) });
  }
  return driveClient;
}

// Drive escapa las comillas simples con `\'` dentro de un literal de `q`.
function escaparParaQuery(texto) {
  return texto.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// Drive no tiene rutas: una carpeta es un archivo con mimeType de carpeta y un
// `parents`, y el mismo nombre se puede repetir. Hay que buscar antes de crear.
async function buscarOCrearCarpeta(nombre, carpetaPadreId) {
  const drive = getDriveClient();
  const q = `name = '${escaparParaQuery(nombre)}' and mimeType = '${FOLDER_MIME}' and '${carpetaPadreId}' in parents and trashed = false`;
  const { data } = await drive.files.list({
    q,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    spaces: 'drive',
  });
  if (data.files?.length > 0) return data.files[0].id;

  const { data: creada } = await drive.files.create({
    requestBody: { name: nombre, mimeType: FOLDER_MIME, parents: [carpetaPadreId] },
    fields: 'id',
    supportsAllDrives: true,
  });
  return creada.id;
}

// <raiz>/<yyyy-mm>
async function resolverCarpetaSolicitudes(fecha = new Date()) {
  const raiz = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
  return buscarOCrearCarpeta(mes, raiz);
}

// Readable.from() porque la API de Drive espera `media.body` como stream.
async function subirArchivo(buffer, nombre, mimeType, carpetaId) {
  const drive = getDriveClient();
  const { data } = await drive.files.create({
    requestBody: { name: nombre, parents: [carpetaId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: 'id, name',
    supportsAllDrives: true,
  });
  return data;
}

// Metadata + stream de contenido en paralelo, para GET /files/drive/:fileId.
// Nunca se expone un link de Drive al frontend: el control de acceso lo decide
// requireAuth de esta app.
async function obtenerArchivoStream(fileId) {
  const drive = getDriveClient();
  const [{ data: meta }, { data: stream }] = await Promise.all([
    drive.files.get({ fileId, fields: 'name, mimeType, size', supportsAllDrives: true }),
    drive.files.get({ fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'stream' }),
  ]);
  return { stream, mimeType: meta.mimeType, nombre: meta.name, size: meta.size };
}

module.exports = { resolverCarpetaSolicitudes, subirArchivo, obtenerArchivoStream };

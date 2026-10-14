// Cliente de Google Drive -- almacenamiento real de los archivos de las
// solicitudes (mismo esquema que el HRMS: cuenta de servicio, sin OAuth
// interactivo). Reemplaza el disco local (UPLOADS_DIR), que en Docker se
// pierde en cada redeploy si no hay un volumen persistente.
//
// Jerarquia (raiz = carpeta "1. SOLICITUDES DE CONTRATACIÓN", exclusiva de este proyecto):
//   <raiz>/_Pendientes/<archivo>                 recien subido, aun sin solicitud
//   <raiz>/<Directas|Indirectas>/<consecutivo>/  al guardar la solicitud
// El archivo se sube ANTES de que exista la solicitud (el consecutivo se genera
// al crearla), por eso entra a _Pendientes y solicitud.archivos.js lo mueve. El archivo se sube ANTES
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
    // googleapis es enorme: se carga recién al primer uso real de Drive para no frenar el arranque del servidor.
    const { google } = require('googleapis');
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

async function resolverCarpetaPendientes() {
  return buscarOCrearCarpeta('_Pendientes', process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID);
}

// <raiz>/<Directas|Indirectas>/<consecutivo>
async function resolverCarpetaSolicitud(categoria, consecutivo) {
  const carpetaCategoria = await buscarOCrearCarpeta(categoria === 'DIRECTA' ? 'Directas' : 'Indirectas', process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID);
  return buscarOCrearCarpeta(consecutivo, carpetaCategoria);
}

// Mover en Drive solo cambia el padre: el fileId (y la URL guardada) no cambia.
// Devuelve false si ya estaba en esa carpeta.
async function moverArchivo(fileId, carpetaDestinoId) {
  const drive = getDriveClient();
  const { data } = await drive.files.get({ fileId, fields: 'parents', supportsAllDrives: true });
  const padres = data.parents ?? [];
  if (padres.includes(carpetaDestinoId)) return false;
  await drive.files.update({
    fileId,
    addParents: carpetaDestinoId,
    removeParents: padres.join(','),
    fields: 'id',
    supportsAllDrives: true,
  });
  return true;
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

// Archivos (no carpetas) directos de una carpeta: sirve para reutilizar uno ya subido en vez de duplicarlo.
async function listarArchivos(carpetaId) {
  const drive = getDriveClient();
  const { data } = await drive.files.list({
    q: `'${carpetaId}' in parents and mimeType != '${FOLDER_MIME}' and trashed = false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    spaces: 'drive',
  });
  return data.files ?? [];
}

module.exports = { listarArchivos, resolverCarpetaPendientes, resolverCarpetaSolicitud, moverArchivo, subirArchivo, obtenerArchivoStream };

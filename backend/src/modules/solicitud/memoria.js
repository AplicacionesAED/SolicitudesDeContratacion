// La Memoria es una tabla pegada desde Excel: el frontend manda el HTML ya
// limpio en `contenidoHtml` y acá se vuelve a limpiar (nunca se confía en el
// cliente) y se guarda como un solo campo de texto, junto con hasta 3 imágenes (URLs de Drive). POST/PUT hacen lo mismo:
// reemplazan la Memoria de la solicitud; sin tabla ni imágenes la quitan.
// Las memorias viejas (columnas/filas) se siguen mostrando pero ya no se
// pueden crear: guardar una nueva borra la vieja.
const asyncHandler = require('../../utils/asyncHandler');
const { created } = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const { sanitizarTablaHtml } = require('../../utils/sanitizarTablaHtml');
const sequelize = require('../../config/db');
const Solicitud = require('./solicitud.model');
const Memoria = require('./memoria.model');
const { getRolesPorCodigo } = require('../../utils/permisos');
const { organizarArchivos } = require('./solicitud.archivos');

const MAX_IMAGENES = 3;
const RE_IMAGEN = /^\/files\/drive\/[\w-]+$/; // lo que devuelve POST /upload

const upsertMemoria = asyncHandler(async (req, res) => {
  const numId = Number(req.params.id);
  if (!Number.isInteger(numId)) throw new ApiError(400, 'ID inválido');

  const solicitud = await Solicitud.findByPk(numId);
  if (!solicitud) throw new ApiError(404, 'Solicitud no encontrada');

  // Mismo criterio de permiso que cronograma.js/cuadroComparativo.js --
  // quien arma la solicitud (el solicitante) o Contratos/Admin pueden
  // fijar/reemplazar la memoria.
  const userId = req.usuario.id;
  const userRoles = req.usuario.roles ?? [];
  // Resuelto por código, no por el string 'CONTRATOS' a secas (2026-09-18) --
  // ver utils/permisos.js#getRolesPorCodigo.
  const nombreContratos = (await getRolesPorCodigo()).CONTRATOS;
  if (solicitud.solicitante_id !== Number(userId) && !userRoles.includes(nombreContratos) && !req.usuario.esAdmin) {
    throw new ApiError(403, 'No tienes permiso para modificar la memoria de esta solicitud');
  }

  let contenidoHtml;
  try {
    contenidoHtml = sanitizarTablaHtml(req.body.contenidoHtml);
  } catch (err) {
    throw new ApiError(400, err.message);
  }

  const imagenes = Array.isArray(req.body.imagenes) ? req.body.imagenes : [];
  if (imagenes.length > MAX_IMAGENES) throw new ApiError(400, `La memoria admite máximo ${MAX_IMAGENES} imágenes`);
  if (!imagenes.every((u) => typeof u === 'string' && RE_IMAGEN.test(u))) throw new ApiError(400, 'Imagen de memoria inválida');

  await sequelize.transaction(async (transaction) => {
    const existente = await Memoria.findOne({ where: { solicitud_id: numId }, transaction });
    if (existente) await existente.destroy({ transaction }); // cascade borra columnas/filas viejas
    if (contenidoHtml || imagenes.length > 0) {
      await Memoria.create({ solicitud_id: numId, contenido_html: contenidoHtml || null, imagenes }, { transaction });
    }
  });

  await organizarArchivos(numId); // imágenes de la memoria: de _Pendientes a la carpeta de la solicitud

  created(res, { contenidoHtml: contenidoHtml || null, imagenes });
});

module.exports = { upsertMemoria };

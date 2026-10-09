// Puerto nuevo (sin equivalente en la app Next.js original -- el "cuadro
// comparativo" ahí era un archivo adjunto, ver CLAUDE.md) -- mismo patrón
// que cronograma.js: POST/PUT hacen lo mismo, borran el CuadroComparativo
// existente de la solicitud y lo recrean completo dentro de una transacción
// (proveedores + items en cascada).
//
// El body manda cada proveedor con un `clientId` string generado en el
// frontend (nunca un id real todavía, ver CuadroComparativoBuilder.jsx) --
// acá se crean los proveedores primero, se arma un mapa clientId -> id real
// con los ids que Postgres acaba de asignar, y recién con ESE mapa se
// remapea el `precios` de cada ítem (que el frontend arma keyed por
// clientId) antes de insertarlo. Los totales (valorTotal por ítem, subtotal/
// AIU/IVA/costo total por proveedor) NUNCA se calculan ni se guardan acá --
// se calculan en el frontend en cada render, mismo criterio que
// valorEnLetras en solicitud.service.js.
const asyncHandler = require('../../utils/asyncHandler');
const { created } = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const sequelize = require('../../config/db');
const Solicitud = require('./solicitud.model');
const CuadroComparativo = require('./cuadroComparativo.model');
const CuadroComparativoProveedor = require('./cuadroComparativoProveedor.model');
const CuadroComparativoItem = require('./cuadroComparativoItem.model');
const { getRolesPorCodigo } = require('../../utils/permisos');

const upsertCuadroComparativo = asyncHandler(async (req, res) => {
  const numId = Number(req.params.id);
  if (!Number.isInteger(numId)) throw new ApiError(400, 'ID inválido');

  const solicitud = await Solicitud.findByPk(numId);
  if (!solicitud) throw new ApiError(404, 'Solicitud no encontrada');

  // Mismo criterio de permiso que cronograma.js -- quien arma la solicitud
  // (el solicitante) o Contratos/Admin pueden fijar/reemplazar el cuadro.
  const userId = req.usuario.id;
  const userRoles = req.usuario.roles ?? [];
  // Resuelto por código, no por el string 'CONTRATOS' a secas (2026-09-18) --
  // ver utils/permisos.js#getRolesPorCodigo.
  const nombreContratos = (await getRolesPorCodigo()).CONTRATOS;
  if (solicitud.solicitante_id !== Number(userId) && !userRoles.includes(nombreContratos) && !req.usuario.esAdmin) {
    throw new ApiError(403, 'No tienes permiso para modificar el cuadro comparativo de esta solicitud');
  }

  const proveedoresBody = Array.isArray(req.body.proveedores) ? req.body.proveedores : [];
  const itemsBody = Array.isArray(req.body.items) ? req.body.items : [];

  const cuadroId = await sequelize.transaction(async (transaction) => {
    const existente = await CuadroComparativo.findOne({ where: { solicitud_id: numId }, transaction });
    if (existente) await existente.destroy({ transaction }); // cascade borra proveedores/items

    const creado = await CuadroComparativo.create({ solicitud_id: numId }, { transaction });

    // clientId -> id real, para remapear `precios` de cada ítem más abajo --
    // se crea uno por uno (no bulkCreate) porque necesitamos el id real de
    // CADA fila apenas se crea, no solo al final.
    const idPorClientId = {};
    for (const [i, p] of proveedoresBody.entries()) {
      if (!p.nombre || !p.nombre.trim()) continue;
      const proveedorCreado = await CuadroComparativoProveedor.create(
        {
          cuadro_id: creado.id,
          nombre: p.nombre.trim(),
          seleccionado: Boolean(p.seleccionado),
          administracion_pct: Number(p.administracionPct) || 0,
          imprevisto_pct: Number(p.imprevistoPct) || 0,
          utilidad_pct: Number(p.utilidadPct) || 0,
          iva_utilidad_pct: Number(p.ivaUtilidadPct) || 0,
          orden: i,
        },
        { transaction }
      );
      if (p.clientId) idPorClientId[p.clientId] = proveedorCreado.id;
    }

    const itemsValidos = itemsBody.filter((it) => it.actividad && it.actividad.trim());
    if (itemsValidos.length > 0) {
      await CuadroComparativoItem.bulkCreate(
        itemsValidos.map((it, i) => ({
          cuadro_id: creado.id,
          codigo_item: it.codigoItem || null,
          codigo_insumo: it.codigoInsumo || null,
          actividad: it.actividad.trim(),
          alcance: it.alcance || null,
          unidad: it.unidad || null,
          cantidad: Number(it.cantidad) || 0,
          // "La cantidad deben ser independiente" -- cantidad_real
          // ("Cantidades reales") es un campo aparte de cantidad
          // ("Pendiente por consumir"), nunca derivado de ella. Ver el
          // comentario grande en cuadroComparativoItem.model.js.
          cantidad_real: Number(it.cantidadReal) || 0,
          // "VR. Unit" de Pendiente por consumir -- el único precio nuevo
          // que se guarda; "V. Total"/"V. Total según PPTO" se calculan en
          // el frontend a partir de este valor (ver cuadroComparativoItem.model.js).
          valor_unitario_pendiente: Number(it.valorUnitarioPendiente) || 0,
          observaciones: it.observaciones || null,
          precios: Object.fromEntries(
            Object.entries(it.precios ?? {})
              .map(([clientId, valor]) => [idPorClientId[clientId], valor])
              .filter(([idReal]) => idReal != null)
          ),
          orden: i,
        })),
        { transaction }
      );
    }

    return creado.id;
  });

  const cuadro = await CuadroComparativo.findByPk(cuadroId, {
    include: [
      { model: CuadroComparativoProveedor, as: 'proveedores', separate: true, order: [['orden', 'ASC']] },
      { model: CuadroComparativoItem, as: 'items', separate: true, order: [['orden', 'ASC']] },
    ],
  });

  created(res, cuadro);
});

module.exports = { upsertCuadroComparativo };

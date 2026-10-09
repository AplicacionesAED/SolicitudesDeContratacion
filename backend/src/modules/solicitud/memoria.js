// Puerto nuevo (sin equivalente en la app Next.js original) -- mismo patrón
// que cuadroComparativo.js: POST/PUT hacen lo mismo, borran la Memoria
// existente de la solicitud y la recrean completa dentro de una transacción
// (columnas + filas en cascada).
//
// El body manda cada columna con un `clientId` string generado en el
// frontend (nunca un id real todavía, ver MemoriaBuilder.jsx) -- acá se
// crean las columnas primero (una por una, en orden), se arma un mapa
// clientId -> id real, y con ESE mapa se hace una 2ª pasada para: (a)
// resolver `formula_columna_a_id`/`formula_columna_b_id` de las columnas
// `CALCULADA` (así una fórmula puede referenciar una columna definida más
// adelante en el body sin problema de orden), y (b) remapear `valores` de
// cada fila de `{clientId: valor}` a `{idReal: valor}` antes de insertarlas.
// Los valores de columnas `CALCULADA` NUNCA se guardan acá, aunque el
// frontend los mande -- se calculan en el frontend en cada render
// (MemoriaBuilder.jsx#calcularValorCalculada).
const asyncHandler = require('../../utils/asyncHandler');
const { created } = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const sequelize = require('../../config/db');
const Solicitud = require('./solicitud.model');
const Memoria = require('./memoria.model');
const MemoriaColumna = require('./memoriaColumna.model');
const MemoriaFila = require('./memoriaFila.model');
const { getRolesPorCodigo } = require('../../utils/permisos');

const TIPOS_VALIDOS = ['TEXTO', 'ENTERO', 'FLOAT', 'FECHA', 'RANGO_FECHAS', 'IMAGEN', 'CALCULADA'];

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

  const columnasBody = Array.isArray(req.body.columnas) ? req.body.columnas : [];
  const filasBody = Array.isArray(req.body.filas) ? req.body.filas : [];

  const memoriaId = await sequelize.transaction(async (transaction) => {
    const existente = await Memoria.findOne({ where: { solicitud_id: numId }, transaction });
    if (existente) await existente.destroy({ transaction }); // cascade borra columnas/filas

    const creada = await Memoria.create({ solicitud_id: numId, titulo: req.body.titulo || null }, { transaction });

    // clientId -> id real, para la 2ª pasada (fórmulas + valores de filas).
    const idPorClientId = {};
    const columnasCreadas = [];
    for (const [i, c] of columnasBody.entries()) {
      if (!c.nombre || !c.nombre.trim() || !TIPOS_VALIDOS.includes(c.tipo)) continue;
      const columnaCreada = await MemoriaColumna.create(
        { memoria_id: creada.id, nombre: c.nombre.trim(), tipo: c.tipo, orden: i, mostrar_total: Boolean(c.mostrarTotal) },
        { transaction }
      );
      if (c.clientId) idPorClientId[c.clientId] = columnaCreada.id;
      columnasCreadas.push({ instancia: columnaCreada, body: c });
    }

    // 2ª pasada -- recién acá existen TODOS los ids reales, así que una
    // columna CALCULADA puede referenciar cualquier otra sin importar el
    // orden en que llegaron en el body.
    for (const { instancia, body } of columnasCreadas) {
      if (body.tipo !== 'CALCULADA') continue;
      const idA = idPorClientId[body.formulaColumnaAClientId];
      const idB = idPorClientId[body.formulaColumnaBClientId];
      if (!idA || !idB || !body.formulaOperador) continue;
      await instancia.update(
        { formula_columna_a_id: idA, formula_operador: body.formulaOperador, formula_columna_b_id: idB },
        { transaction }
      );
    }

    // Nunca guardar un valor para una columna CALCULADA, aunque el
    // frontend lo mande -- se calcula siempre en vivo. `idPorClientId` ya
    // mapea el clientId de ESTAS columnas también (se llenó para todas en
    // el primer loop), así que hace falta este Set aparte para excluirlas
    // a propósito acá.
    const idsColumnasCalculadas = new Set(
      columnasCreadas.filter(({ body }) => body.tipo === 'CALCULADA').map(({ instancia }) => instancia.id)
    );

    if (filasBody.length > 0) {
      await MemoriaFila.bulkCreate(
        filasBody.map((f, i) => ({
          memoria_id: creada.id,
          orden: i,
          valores: Object.fromEntries(
            Object.entries(f.valores ?? {})
              .map(([clientId, valor]) => [idPorClientId[clientId], valor])
              .filter(([idReal]) => idReal != null && !idsColumnasCalculadas.has(idReal))
          ),
        })),
        { transaction }
      );
    }

    return creada.id;
  });

  const memoria = await Memoria.findByPk(memoriaId, {
    include: [
      { model: MemoriaColumna, as: 'columnas', separate: true, order: [['orden', 'ASC']] },
      { model: MemoriaFila, as: 'filas', separate: true, order: [['orden', 'ASC']] },
    ],
  });

  created(res, memoria);
});

module.exports = { upsertMemoria };

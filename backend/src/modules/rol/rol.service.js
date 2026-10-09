const { Op } = require('sequelize');
const ApiError = require('../../utils/ApiError');
const Rol = require('./rol.model');
const Usuario = require('../usuario/usuario.model');
const AprobadorFrente = require('../aprobadorFrente/aprobadorFrente.model');
const WorkflowDesvio = require('../workflow/workflowDesvio.model');

// Los 10 slots de responsabilidad de AprobadorFrente -- cada uno es
// `{ usuarios: [ids], roles: [nombresDeRol] }` (ver aprobadorFrente.model.js).
// Al renombrar un rol hay que reescribir el nombre viejo por el nuevo en
// CUALQUIER slot que lo tenga en su array `roles`, si no, ese slot deja de
// calificar a nadie con el rol recién renombrado (2026-09-18, encontrado en
// la misma auditoría que ya había corregido el mismo hueco para
// usuarios.roles).
const SLOTS_APROBADOR_FRENTE = [
  'director_proyecto',
  'contratos_tramite',
  'contratos_minuta',
  'director_controles',
  'director_tecnico',
  'controles_adpro',
  'controles_proyeccion',
  'residente_administrativo',
  'controles_aprobacion_final',
  'director_obra',
];

// Cada rol incluye `total_usuarios` (cuentas que lo tienen asignado) para la lista de Roles.
async function list() {
  const [roles, usuarios] = await Promise.all([
    Rol.findAll({ order: [['nombre', 'ASC']] }),
    Usuario.findAll({ attributes: ['roles'] }),
  ]);
  const cuentas = new Map();
  for (const u of usuarios) for (const r of u.roles ?? []) cuentas.set(r, (cuentas.get(r) ?? 0) + 1);
  return roles.map((rol) => ({ ...rol.toJSON(), total_usuarios: cuentas.get(rol.nombre) ?? 0 }));
}

async function create(data) {
  const existente = await Rol.findOne({ where: { nombre: data.nombre } });
  if (existente) throw new ApiError(400, 'Ya existe un rol con ese nombre');
  return Rol.create(data);
}

// Renombrar un rol (puerto de Cartera, 2026-09-18, pedido explicito del
// usuario -- "quiero... editar su nombre"). Ya no hay nombres reservados
// aca -- incluido ADMIN: el acceso de administrador ahora se resuelve
// contra `roles.es_admin` (un flag ligado a la fila/id, ver rol.model.js y
// middlewares/auth.js#requireAuth), no contra el string 'ADMIN', asi que
// renombrar esta fila ya no rompe el acceso de nadie. Pedido explicito del
// usuario (2026-09-18): "si renombro ADMIN no tiene nada que ver, tienen
// que estar enlazados mediante el id".
async function update(nombre, data) {
  const rol = await Rol.findOne({ where: { nombre } });
  if (!rol) throw new ApiError(404, 'Rol no encontrado');

  if (data.nombre !== undefined && data.nombre !== rol.nombre) {
    const duplicado = await Rol.findOne({ where: { nombre: data.nombre, id: { [Op.ne]: rol.id } } });
    if (duplicado) throw new ApiError(409, `Ya existe un rol con el nombre "${data.nombre}"`);

    // usuarios.roles sigue guardando nombres de rol, no ids -- al renombrar
    // hay que actualizar el nombre viejo por el nuevo en cada usuario que
    // lo tenga, si no, esos usuarios pierden ese rol en silencio (el
    // acceso de ADMIN especificamente no depende de esto -- ver la nota de
    // arriba -- pero el resto de los permisos del rol si).
    const nombreAnterior = rol.nombre;
    const usuarios = await Usuario.findAll({ where: { roles: { [Op.contains]: [nombreAnterior] } } });
    await Promise.all(
      usuarios.map((u) => u.update({ roles: u.roles.map((r) => (r === nombreAnterior ? data.nombre : r)) }))
    );

    // 2026-09-18: mismo hueco que el de usuarios.roles, encontrado en la
    // misma auditoría -- `aprobador_frentes.<slot>.roles` y
    // `workflow_desvios.condicion_rol` TAMBIÉN guardan el nombre del rol
    // (no su id), y no se actualizaban al renombrar. Sin este fix, un
    // aprobador configurado por rol (ej. "O cualquiera con el rol
    // Coordinador de Controles") o un desvío condicionado a un rol dejaba
    // de calificar a nadie apenas se renombraba ese rol, en silencio.
    const configsAprobador = await AprobadorFrente.findAll();
    await Promise.all(
      configsAprobador.map((config) => {
        const cambios = {};
        for (const slot of SLOTS_APROBADOR_FRENTE) {
          const valor = config[slot];
          if (valor?.roles?.includes(nombreAnterior)) {
            cambios[slot] = { ...valor, roles: valor.roles.map((r) => (r === nombreAnterior ? data.nombre : r)) };
          }
        }
        return Object.keys(cambios).length > 0 ? config.update(cambios) : null;
      })
    );

    await WorkflowDesvio.update({ condicion_rol: data.nombre }, { where: { condicion_rol: nombreAnterior } });
  }

  await rol.update(data);
  return rol;
}

// Solo roles personalizados, sin cuentas y sin uso en la configuracion: usuarios.roles,
// aprobador_frentes.<slot>.roles y workflow_desvios.condicion_rol guardan el NOMBRE del rol, asi que borrar
// uno en uso dejaria referencias que ya no califican a nadie. Se rechaza en vez de limpiar en silencio.
async function remove(nombre) {
  const rol = await Rol.findOne({ where: { nombre } });
  if (!rol) throw new ApiError(404, 'Rol no encontrado');
  if (rol.es_admin) throw new ApiError(400, 'El rol de administrador no se puede eliminar');

  const cuentas = await Usuario.count({ where: { roles: { [Op.contains]: [nombre] } } });
  if (cuentas > 0) throw new ApiError(409, `El rol tiene ${cuentas} cuenta(s) asignada(s). Quítaselo primero.`);

  const configs = await AprobadorFrente.findAll();
  if (configs.some((c) => SLOTS_APROBADOR_FRENTE.some((slot) => c[slot]?.roles?.includes(nombre)))) {
    throw new ApiError(409, 'El rol está configurado como aprobador en uno o más frentes. Quítalo de ahí primero.');
  }
  const desvios = await WorkflowDesvio.count({ where: { condicion_rol: nombre } });
  if (desvios > 0) throw new ApiError(409, 'El rol se usa en un desvío de Workflows. Quítalo de ahí primero.');

  await rol.destroy();
}

module.exports = { list, create, update, remove };

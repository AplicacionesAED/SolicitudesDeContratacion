// PLANTILLA -- base copiable, va en backend/src/modules/usuario/usuario.service.js.
// Sin auto-registro a propósito: solo un admin crea usuarios (`create`). Nunca
// expone `hashed_password` en la respuesta (`_enrich`).
const ApiError = require('../../utils/ApiError');
const { hashPassword } = require('../../utils/security');
const { validatePassword, generateRandomPassword } = require('../../utils/passwordRules');
const { getRolesFuncionalidades, getRolesPorCodigo } = require('../../utils/permisos');
const Usuario = require('./usuario.model');

function _enrich(usuario) {
  const data = usuario.toJSON();
  delete data.hashed_password;
  return data;
}

// El frontend tiene su propio `tienePermiso` (no puede importar código del
// backend), pero hasta ahora siempre lo evaluaba contra el mapa hardcodeado
// FUNCIONALIDADES_POR_ROL -- nunca contra la tabla Rol real. Si un admin
// personalizaba un rol desde RolDetallePage, el backend respetaba el cambio
// (getRolesFuncionalidades() lee la tabla) pero el sidebar/los botones del
// frontend seguían mostrando lo que el mapa hardcodeado decía por default --
// dos fuentes de verdad desincronizadas. Iba `funcionalidadesPorRol` acá para
// que el frontend evalúe exactamente lo mismo que el backend.
async function getMe(usuario) {
  const data = _enrich(usuario);
  data.funcionalidadesPorRol = await getRolesFuncionalidades();
  // 2026-09-18: mismo motivo que funcionalidadesPorRol -- el frontend tiene
  // sus propios chequeos de rol por nombre (ej. SolicitudForm.jsx,
  // FrenteDetallePage.jsx) que dejan de matchear en silencio si un admin
  // renombra ese rol. `rolesPorCodigo` resuelve el nombre ACTUAL de un rol
  // contra su código estable -- ver utils/permisos.js#getRolesPorCodigo.
  data.rolesPorCodigo = await getRolesPorCodigo();
  // `usuario.esAdmin` lo resuelve requireAuth contra roles.es_admin (ver
  // middlewares/auth.js) -- toJSON() de _enrich no lo trae porque no es una
  // columna del modelo Usuario, hay que copiarlo aparte. El frontend lo usa
  // en vez de `roles.includes('ADMIN')` para que renombrar ese rol no le
  // quite acceso a nadie (pedido explicito del usuario, 2026-09-18).
  data.esAdmin = usuario.esAdmin;
  return data;
}

async function list() {
  const usuarios = await Usuario.findAll({ order: [['nombre', 'ASC']] });
  return usuarios.map(_enrich);
}

async function create(data) {
  const existente = await Usuario.findOne({ where: { email: data.email.toLowerCase() } });
  if (existente) throw new ApiError(400, 'Ya existe un usuario con este email');
  validatePassword(data.password);

  const usuario = await Usuario.create({
    email: data.email,
    nombre: data.nombre,
    hashed_password: await hashPassword(data.password),
    roles: data.roles,
    funcionalidades_adicionales: data.funcionalidades_adicionales ?? [],
    cargo: data.cargo ?? null,
    telefono: data.telefono ?? null,
    activo: true,
    debe_cambiar_password: true, // fuerza cambio en el primer login -- ver CambiarPasswordPage
  });
  return getById(usuario.id);
}

async function getById(id) {
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw new ApiError(404, 'Usuario no encontrado');
  return _enrich(usuario);
}

async function update(id, data) {
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw new ApiError(404, 'Usuario no encontrado');

  const values = {};
  if (data.nombre !== undefined) values.nombre = data.nombre;
  if (data.roles !== undefined) values.roles = data.roles;
  if (data.funcionalidades_adicionales !== undefined) values.funcionalidades_adicionales = data.funcionalidades_adicionales;
  if (data.cargo !== undefined) values.cargo = data.cargo;
  if (data.telefono !== undefined) values.telefono = data.telefono;
  if (data.password) {
    validatePassword(data.password);
    values.hashed_password = await hashPassword(data.password);
    values.debe_cambiar_password = true; // reset de contraseña por admin -- fuerza cambio otra vez
  }
  if (data.activo !== undefined) values.activo = data.activo;

  if (Object.keys(values).length > 0) await usuario.update(values);
  return getById(id);
}

// Soft delete -- nunca elimina fisicamente. No permite auto-desactivacion (el
// admin perderia acceso inmediatamente).
async function remove(id, solicitanteId) {
  if (Number(id) === Number(solicitanteId)) throw new ApiError(400, 'No puedes desactivarte a ti mismo');
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw new ApiError(404, 'Usuario no encontrado');
  await usuario.update({ activo: false });
}

// Eliminacion fisica real, distinta del soft delete de remove(). Solo cuentas ya inactivas (nunca una activa)
// y nunca la propia. Si la cuenta tiene registros asociados (solicitudes, historial, notificaciones...) la base
// rechaza el borrado por llave foranea: se responde 409 y la cuenta se conserva inactiva, que es lo correcto
// para no perder la trazabilidad de quien hizo que.
async function removeDefinitivo(id, solicitanteId) {
  if (Number(id) === Number(solicitanteId)) throw new ApiError(400, 'No puedes eliminarte a ti mismo');
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw new ApiError(404, 'Usuario no encontrado');
  if (usuario.activo) throw new ApiError(400, 'El usuario debe estar inactivo antes de poder eliminarlo');
  try {
    await usuario.destroy();
  } catch (err) {
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      throw new ApiError(409, 'No se puede eliminar: la cuenta tiene solicitudes o registros asociados. Déjala inactiva.');
    }
    throw err;
  }
}

// ── Vinculación de cuenta Microsoft (usada por modules/auth/auth.azure.js) ──

async function buscarPorMicrosoftId(microsoftId) {
  return Usuario.findOne({ where: { microsoft_id: microsoftId } });
}

async function vincularMicrosoft(usuarioId, microsoftId, microsoftEmail) {
  const yaVinculada = await Usuario.findOne({ where: { microsoft_id: microsoftId } });
  if (yaVinculada && yaVinculada.id !== Number(usuarioId)) {
    throw new ApiError(409, 'Esta cuenta de Microsoft ya está vinculada a otro usuario.');
  }
  const usuario = await Usuario.findByPk(usuarioId);
  if (!usuario) throw new ApiError(404, 'Usuario no encontrado');
  await usuario.update({ microsoft_id: microsoftId, microsoft_email: microsoftEmail?.toLowerCase() ?? null });
  return _enrich(usuario);
}

async function desvincularMicrosoft(usuarioId) {
  const usuario = await Usuario.findByPk(usuarioId);
  if (!usuario) throw new ApiError(404, 'Usuario no encontrado');
  await usuario.update({ microsoft_id: null, microsoft_email: null });
  return _enrich(usuario);
}

async function registrarConexion(usuario) {
  // No bloquea el login si falla -- ver el mismo criterio en auth.service.js.
  try {
    await usuario.update({ ultima_conexion: new Date() });
  } catch {
    // ignorar errores de registro de conexión
  }
}

// Genera y GUARDA una contrasena temporal nueva (se devuelve una sola vez) y obliga a cambiarla al
// entrar. Para las cuentas que se crean con una clave que el admin no quiere inventar a mano.
async function regenerarPassword(id) {
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw new ApiError(404, 'Usuario no encontrado');
  const password = generateRandomPassword();
  await usuario.update({ hashed_password: await hashPassword(password), debe_cambiar_password: true });
  return { password };
}

// Acciones masivas sobre varias cuentas desde la lista de Usuarios. La cuenta de quien ejecuta la
// accion nunca se toca. Para 'generar-password' devuelve ademas las contrasenas temporales, UNA sola vez.
async function accionMasiva({ ids, accion }, actorId) {
  const unicos = [...new Set(ids)];
  const usuarios = await Usuario.findAll({ where: { id: unicos } });
  const encontrados = new Map(usuarios.map((u) => [u.id, u]));
  const omitidos = [];
  const objetivo = [];
  for (const id of unicos) {
    const usuario = encontrados.get(id);
    if (!usuario) omitidos.push({ id, motivo: 'No existe' });
    else if (id === Number(actorId)) omitidos.push({ id, email: usuario.email, motivo: 'Es tu propia cuenta' });
    else objetivo.push(usuario);
  }

  if (accion === 'generar-password') {
    const resultados = [];
    for (const usuario of objetivo) {
      const password = generateRandomPassword();
      await usuario.update({ hashed_password: await hashPassword(password), debe_cambiar_password: true });
      resultados.push({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, password });
    }
    return { procesados: resultados.length, omitidos, resultados };
  }

  const activo = accion === 'activar';
  for (const usuario of objetivo) await usuario.update({ activo });
  return { procesados: objetivo.length, omitidos };
}

module.exports = {
  regenerarPassword,
  accionMasiva,
  getMe,
  list,
  create,
  getById,
  update,
  remove,
  removeDefinitivo,
  buscarPorMicrosoftId,
  vincularMicrosoft,
  desvincularMicrosoft,
  registrarConexion,
};

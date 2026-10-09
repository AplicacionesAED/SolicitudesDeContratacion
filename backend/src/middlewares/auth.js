// requireAuth va PRIMERO en toda ruta protegida (incluidas las de solo
// lectura). requireAdmin/requirePermiso van DESPUÉS, solo en
// escrituras/rutas restringidas. El rol/los permisos SIEMPRE se re-leen de la
// BD en requireAuth (nunca del claim del JWT), así un token manipulado no
// puede escalar privilegios -- ver createAccessToken en utils/security.js.
const { decodeToken, ACCESS_COOKIE_NAME } = require('../utils/security');
const { tienePermiso, getRolesFuncionalidades } = require('../utils/permisos');
const ApiError = require('../utils/ApiError');
const Usuario = require('../modules/usuario/usuario.model');
const Rol = require('../modules/rol/rol.model');

// `esAdmin` se resuelve UNA VEZ por request aca, no por el string 'ADMIN' en
// usuario.roles -- pedido explicito del usuario (2026-09-18): poder
// renombrar el rol ADMIN sin que eso rompa el acceso de administrador de
// nadie. Se calcula contra `roles.es_admin` (flag ligado a la fila/id, ver
// rol.model.js), y se cuelga en `req.usuario.esAdmin` (propiedad plana, no
// persistida) para que requireAdmin y cualquier modulo que reciba este mismo
// `usuario`/`req.usuario` (solicitud.*, dashboard, presence, tercero.*) lo
// lean de forma sincrona sin tener que repetir esta consulta.
async function requireAuth(req, res, next) {
  const token = req.cookies?.[ACCESS_COOKIE_NAME];
  if (!token) return next(new ApiError(401, 'No autenticado'));

  let payload;
  try {
    payload = decodeToken(token);
  } catch {
    return next(new ApiError(401, 'Token invalido o expirado'));
  }
  if (payload.type !== 'access') return next(new ApiError(401, 'Token invalido'));

  const usuario = await Usuario.findOne({ where: { email: payload.sub, activo: true } });
  if (!usuario) return next(new ApiError(401, 'Usuario no encontrado'));

  const rolesAdmin = await Rol.findAll({ where: { es_admin: true }, attributes: ['nombre'] });
  const nombresAdmin = rolesAdmin.map((r) => r.nombre);
  usuario.esAdmin = (usuario.roles ?? []).some((r) => nombresAdmin.includes(r));

  req.usuario = usuario;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.usuario?.esAdmin) {
    return next(new ApiError(403, 'Acceso restringido a administradores'));
  }
  next();
}

// Exige que el usuario tenga AL MENOS UNO de los slugs dados -- vía su rol
// (tabla Rol, con fallback a FUNCIONALIDADES_POR_ROL) o vía
// funcionalidadesAdicionales concedidas a mano. ADMIN siempre pasa (ver
// tienePermiso). Uso: requirePermiso('gestionar_especialidades') o
// requirePermiso(['slug_a', 'slug_b']) -- ojo con Solicitudes: desde
// "desglose ver/crear" (2026-09-02) listar depende de `ver_solicitudes_
// directas`/`_indirectas` y crear/enviar de `crear_solicitudes_directas`/
// `_indirectas`, ambos resueltos dinámicamente contra `solicitud.categoria`
// -- ver solicitud.autorizacion.js#tieneVerSolicitudes/tieneCrearSolicitudes)
// y aprobar ya NO depende de ningún slug de rol, se resuelve 100% contra
// AprobadorFrente -- nunca
// gatear una ruta de acción de Solicitud con requirePermiso.
function requirePermiso(slugs) {
  const requeridos = Array.isArray(slugs) ? slugs : [slugs];
  return async (req, res, next) => {
    const roles = req.usuario?.roles ?? [];
    const funcionalidadesAdicionales = req.usuario?.funcionalidades_adicionales ?? [];
    const funcionalidadesPorRol = await getRolesFuncionalidades();
    const tiene = requeridos.some((slug) => tienePermiso(roles, funcionalidadesAdicionales, slug, funcionalidadesPorRol, req.usuario?.esAdmin));
    if (!tiene) return next(new ApiError(403, 'No tienes permiso para realizar esta acción'));
    next();
  };
}

module.exports = { requireAuth, requireAdmin, requirePermiso };

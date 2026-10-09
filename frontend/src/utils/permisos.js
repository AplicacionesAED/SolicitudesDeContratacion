// Duplicado a mano de backend/src/utils/permisos.js -- el frontend no puede
// importar código del backend (ver "Conversión de texto libre a lista fija"
// en ARQUITECTURA-BACKEND.md). Mantener los dos en sync a mano si cambian los
// permisos base; la fuente real en runtime es la tabla Rol (GET /roles), este
// mapa es solo el mismo fallback que usa el backend.
export const ROL_LABELS = {
  SOLICITANTE: 'Solicitante',
  TECNICA: 'Coordinador de Técnica',
  DIRECTOR_TECNICO: 'Director Técnico',
  DIRECTOR_PROYECTO: 'Director de Proyecto',
  CONTRATOS: 'Contratos',
  CONTROLES: 'Coordinador Controles',
  DIRECTOR_CONTROLES: 'Director de Controles',
  GERENCIA: 'Gerencia',
  ADMIN: 'Administrador',
};
// "Director de Obra"/"Residente Administrativo" (flujo propio de Directa,
// 2026-09-18) NO se agregan acá -- son roles con nombre humano creados
// directamente desde /configuracion/roles, no constantes SNAKE_CASE; su
// propio `nombre` YA es la etiqueta, un alias acá nunca podría matchear.

// 2026-09-02 "desglose ver/crear": aprobar ya no depende de ningún permiso
// de rol (se resuelve 100% contra AprobadorFrente -- ver
// FrenteDetallePage.jsx). Ver/crear Solicitudes y ver Terceros se
// separaron -- antes de este desglose CUALQUIER autenticado podía listar/
// navegar esas secciones (el filtro real era por registro, no por
// sección), por eso este mapa (el mismo criterio que la migración de datos
// del backend, ver 20260831000513-desglose-ver-crear.js) le da `ver_*` a
// TODOS los roles y reserva `crear_solicitudes_*` solo para quien ya podía
// crear antes.
export const FUNCIONALIDADES_POR_ROL = {
  SOLICITANTE: ['ver_solicitudes_directas', 'crear_solicitudes_directas', 'ver_solicitudes_indirectas', 'crear_solicitudes_indirectas', 'ver_terceros', 'ver_especialidades'],
  TECNICA: ['ver_solicitudes_directas', 'crear_solicitudes_directas', 'ver_solicitudes_indirectas', 'crear_solicitudes_indirectas', 'ver_terceros', 'ver_especialidades'],
  DIRECTOR_PROYECTO: ['ver_solicitudes_directas', 'crear_solicitudes_directas', 'ver_solicitudes_indirectas', 'crear_solicitudes_indirectas', 'ver_terceros', 'ver_especialidades'],
  CONTRATOS: ['ver_solicitudes_directas', 'ver_solicitudes_indirectas', 'ver_terceros', 'ver_especialidades'],
  CONTROLES: ['ver_solicitudes_directas', 'ver_solicitudes_indirectas', 'ver_terceros', 'ver_especialidades'],
  DIRECTOR_TECNICO: ['ver_solicitudes_directas', 'ver_solicitudes_indirectas', 'ver_terceros', 'ver_especialidades'],
  DIRECTOR_CONTROLES: ['ver_solicitudes_directas', 'ver_solicitudes_indirectas', 'ver_terceros', 'ver_especialidades'],
  GERENCIA: ['ver_solicitudes_directas', 'ver_solicitudes_indirectas', 'ver_terceros', 'ver_especialidades'],
  ADMIN: ['crear_terceros', 'gestionar_especialidades', 'ver_terceros', 'ver_especialidades'],
};

// 2026-09-02 "alcance de solicitudes en 3 niveles": reemplaza el checkbox
// único "Ve todas las solicitudes" -- ver
// backend/src/utils/permisos.js#FALLBACK_ALCANCE_SOLICITUDES para el mismo
// mapa y la explicación completa. Usado por RolDetallePage.jsx (el
// `<select>`) y RolesPage.jsx (la columna de la lista).
export const ALCANCE_SOLICITUDES_LABELS = {
  PROPIAS: 'Solo las propias',
  FRENTE: 'Las propias + las de sus frentes asignados',
  TODAS: 'Todas las solicitudes',
};

// esAdmin: resuelto por el backend contra roles.es_admin, no contra el
// string 'ADMIN' (ver GET /usuarios/me#esAdmin) -- pedido explicito del
// usuario (2026-09-18) para que renombrar ese rol no le quite acceso a
// nadie. El default es `false`, no `roles.includes('ADMIN')` -- ese string
// ya no es estable (ver utils/permisos.js del backend#getRolesPorCodigo);
// el único caller real (usuarioTienePermiso) siempre lo pasa explícito.
export function tienePermiso(roles, funcionalidadesAdicionales, funcionalidad, funcionalidadesPorRol = FUNCIONALIDADES_POR_ROL, esAdmin = false) {
  if (esAdmin) return true;
  const funcionalidadesDelRol = roles.flatMap((rol) => funcionalidadesPorRol[rol] || []);
  return funcionalidadesDelRol.includes(funcionalidad) || (funcionalidadesAdicionales ?? []).includes(funcionalidad);
}

// 2026-09-02: GET /usuarios/me ahora manda `funcionalidadesPorRol` -- el
// mapa REAL leído de la tabla Rol en ese momento (mismo que usa el
// backend para autorizar), no el fallback hardcodeado de arriba. Antes,
// CUALQUIER chequeo del frontend (sidebar, botones, ProtectedRoute)
// evaluaba siempre contra el mapa hardcodeado, así que si un admin
// personalizaba un rol desde RolDetallePage el cambio nunca se reflejaba
// en la UI (aunque el backend sí lo respetaba) -- dos fuentes de verdad
// desincronizadas. Usar este helper en vez de llamar tienePermiso() a
// mano evita repetir `usuario.funcionalidadesPorRol` en cada call site y
// olvidarlo por error.
export function usuarioTienePermiso(usuario, funcionalidad) {
  return tienePermiso(usuario.roles, usuario.funcionalidades_adicionales, funcionalidad, usuario.funcionalidadesPorRol, usuario.esAdmin);
}

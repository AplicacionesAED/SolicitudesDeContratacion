// Puerto literal de src/lib/utils.ts (tienePermiso, FUNCIONALIDADES_POR_ROL,
// ROL_LABELS) + src/lib/roles.ts (getRolesFuncionalidades/getRolesVerTodas) de
// la app Next.js original. La tabla `Rol` (modules/rol/) es la fuente real en
// runtime -- estos mapas son solo el fallback cuando esa tabla está vacía.
const ROL_LABELS = {
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

// 2026-09-02 "eliminar permisos de rol para solicitudes": los 16 slugs
// _directa/_indirecta que gateaban crear/aprobar solicitudes se retiraron --
// APROBAR ya no depende de ningún permiso de rol en absoluto: se resuelve
// 100% contra AprobadorFrente (personas o roles específicos por
// frente+categoría, ver solicitud.autorizacion.js).
//
// 2026-09-02 (mismo día, siguiente pedido) "desglose ver/crear": el primer
// corte de este refactor colapsó crear/enviar en un solo permiso de MÓDULO
// por categoría -- pero eso no permitía el caso real "puede ver todas las
// solicitudes directas pero no puede crear una nueva" (ej. CONTRATOS/
// CONTROLES/DIRECTOR_TECNICO/DIRECTOR_CONTROLES/GERENCIA: necesitan
// navegar el listado para actuar sobre lo que tienen asignado, pero nunca
// deberían poder generar una solicitud nueva). Cada módulo (Directas/
// Indirectas/Terceros) se separó en VER (listar/navegar la sección) y
// CREAR (el botón "Nueva solicitud"/"Nuevo tercero" y el POST real) --
// `ver_solicitudes_X` NUNCA reemplaza el filtro de visibilidad por
// registro (dueño/frente/AprobadorFrente/alcance_solicitudes, ver
// solicitud.service.js#getById) -- ese sigue siendo el único que decide SI
// una solicitud puntual es visible; `ver_solicitudes_X` solo decide si el
// usuario puede entrar a la sección/listado general. `ver_terceros` es
// nuevo -- antes CUALQUIER autenticado podía ver el Directorio completo
// (nunca tuvo permiso propio); `crear_terceros` no cambia (ya gateaba
// POST /terceros). `gestionar_especialidades` no tiene relación con este
// desglose, se queda igual.
//
// 2026-09-02 (mismo día, tercer pedido) "permisos por módulo, desglosados":
// el usuario pidió que el acceso se configure módulo por módulo calcado del
// árbol real del sidebar (`frontend/src/utils/navModulos.jsx#NAV_GROUPS`),
// no por slug suelto -- cada ítem navegable del sidebar (ej. "Directorio",
// "Especialidades" dentro de Terceros) necesita su propio slug de VER para
// poder aparecer/ocultarse individualmente. `ver_especialidades` es nuevo
// por esto mismo -- antes esa pantalla no tenía ningún permiso de lectura
// propio (igual que le pasaba a `ver_terceros` antes de existir).
const FUNCIONALIDADES_DISPONIBLES = {
  ver_solicitudes_directas: { nombre: 'Ver Solicitudes Directas', descripcion: 'Ver el listado y el detalle de solicitudes directas' },
  crear_solicitudes_directas: { nombre: 'Crear Solicitudes Directas', descripcion: 'Crear, enviar y reenviar solicitudes directas (contratos, otrosís y diseño)' },
  ver_solicitudes_indirectas: { nombre: 'Ver Solicitudes Indirectas', descripcion: 'Ver el listado y el detalle de solicitudes indirectas' },
  crear_solicitudes_indirectas: { nombre: 'Crear Solicitudes Indirectas', descripcion: 'Crear, enviar y reenviar solicitudes indirectas (contratos, otrosís y diseño)' },
  ver_terceros: { nombre: 'Ver Terceros', descripcion: 'Ver el Directorio de terceros' },
  crear_terceros: { nombre: 'Crear y gestionar terceros', descripcion: 'Crear terceros y editar debida diligencia/tipo de contrato/confidencialidad' },
  ver_especialidades: { nombre: 'Ver Especialidades', descripcion: 'Ver el catálogo de especialidades de terceros' },
  gestionar_especialidades: { nombre: 'Gestionar especialidades', descripcion: 'Crear, editar y eliminar especialidades de terceros' },
  // Configuracion/Accesos -- antes 100% admin-only (requireAdmin puro), ahora
  // un permiso mas que se le puede dar a un rol sin darle ADMIN completo
  // (puerto de HRMS, 2026-09-18, mismo pedido explicito del usuario aplicado
  // a los 3 proyectos). ADVERTENCIA de auto-escalacion, real y
  // deliberadamente no bloqueada: `ver_usuarios` permite crear/editar
  // cuentas, incluida la propia (podria agregarse ADMIN a su propio arreglo
  // de roles); `ver_roles` permite editar los permisos de CUALQUIER rol,
  // incluido el que la cuenta misma tiene. Dar cualquiera de los dos a un
  // rol equivale, en la practica, a un nivel de confianza cercano a ADMIN --
  // otorgar con el mismo criterio. Workflows/Proyectos/Frentes
  // (ver App.jsx) siguen 100% soloAdmin -- no se pidio desglosarlos.
  ver_usuarios: { nombre: 'Usuarios y perfiles', descripcion: 'Ver y administrar cuentas de usuario (crear, editar roles, activar/desactivar)' },
  ver_roles: { nombre: 'Roles y permisos', descripcion: 'Ver y administrar roles: crear, renombrar, editar sus permisos' },
};

// Nadie pierde acceso el día del deploy: antes de este desglose, CUALQUIER
// autenticado podía listar/navegar Solicitudes, Terceros y Especialidades
// (el filtro real era por registro, no por sección) -- por eso el retrofit
// de datos (20260831000513/514) le da `ver_*` a los 9 roles reales, y solo
// los roles que ya tenían el módulo completo conservan además
// `crear_solicitudes_*`. Este mapa es el mismo criterio para cuando la
// tabla Rol está vacía.
const FUNCIONALIDADES_POR_ROL = {
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

// 2026-09-02 "alcance de solicitudes en 3 niveles": reemplaza el booleano
// `ver_todas_solicitudes` -- el pedido explícito fue "que se pueda ver las
// propias, o la de los frentes asignados, o todas" en vez de un único
// interruptor que ataba "propias" y "de mi frente" como un solo paquete sin
// poder separarlos. PROPIAS < FRENTE < TODAS (cada nivel es superset del
// anterior); el rol que antes tenía `ver_todas_solicitudes: false` queda en
// FRENTE (el paquete completo que ya tenía, no el más restrictivo PROPIAS)
// -- ver 20260831000515-alcance-solicitudes.js para el retrofit de datos.
const FALLBACK_ALCANCE_SOLICITUDES = {
  SOLICITANTE: 'FRENTE',
  TECNICA: 'FRENTE',
  DIRECTOR_PROYECTO: 'FRENTE',
  CONTRATOS: 'TODAS',
  CONTROLES: 'TODAS',
  DIRECTOR_TECNICO: 'TODAS',
  DIRECTOR_CONTROLES: 'TODAS',
  GERENCIA: 'TODAS',
  ADMIN: 'TODAS',
};

const ORDEN_ALCANCE = { PROPIAS: 0, FRENTE: 1, TODAS: 2 };

// roles: array de roles del usuario. funcionalidadesAdicionales: array de
// slugs concedidos a mano a ESE usuario. funcionalidadesPorRol: mapa
// rol->slugs[] resuelto desde la tabla Rol (ver getRolesFuncionalidades).
// esAdmin: resuelto por requireAuth contra roles.es_admin (ver
// middlewares/auth.js). El default es `false`, NUNCA `roles.includes('ADMIN')`
// -- ese string ya no es estable (el rol se puede renombrar, ver
// getRolesPorCodigo más abajo); todos los callers reales de este proyecto
// ya pasan `esAdmin` explícito, así que este default nunca debería
// ejercitarse en la práctica, pero si algún caller nuevo lo omite por
// error, es más seguro no asumir admin que asumirlo por una coincidencia
// de string.
function tienePermiso(roles, funcionalidadesAdicionales, funcionalidad, funcionalidadesPorRol = FUNCIONALIDADES_POR_ROL, esAdmin = false) {
  if (esAdmin) return true;
  const funcionalidadesDelRol = roles.flatMap((rol) => funcionalidadesPorRol[rol] || []);
  return funcionalidadesDelRol.includes(funcionalidad) || funcionalidadesAdicionales.includes(funcionalidad);
}

// Lee la tabla Rol en runtime -- fallback al mapa hardcodeado si está vacía o
// si la consulta falla (mismo criterio que roles.ts original).
async function getRolesFuncionalidades() {
  try {
    const Rol = require('../modules/rol/rol.model');
    const roles = await Rol.findAll();
    if (roles.length === 0) return FUNCIONALIDADES_POR_ROL;
    return Object.fromEntries(roles.map((r) => [r.nombre, r.permisos || []]));
  } catch {
    return FUNCIONALIDADES_POR_ROL;
  }
}

// Lee la tabla Rol en runtime -- fallback al mapa hardcodeado si está vacía o
// si la consulta falla (mismo criterio que getRolesFuncionalidades).
async function getRolesAlcanceSolicitudes() {
  try {
    const Rol = require('../modules/rol/rol.model');
    const roles = await Rol.findAll();
    if (roles.length === 0) return FALLBACK_ALCANCE_SOLICITUDES;
    return Object.fromEntries(roles.map((r) => [r.nombre, r.alcance_solicitudes]));
  } catch {
    return FALLBACK_ALCANCE_SOLICITUDES;
  }
}

// 2026-09-18 "renombrar roles no debe romper nada que dependa de ellos" --
// mismo problema de fondo que ya se resolvió para ADMIN (roles.es_admin,
// un flag ligado a la fila) pero generalizado a CUALQUIER rol que el
// código necesite reconocer sin importar cómo se llame hoy. `roles.codigo`
// es un identificador ESTABLE (nunca se edita desde la UI, ver
// rol.schema.js -- no tiene ese campo) que se sembró UNA VEZ para los
// roles originales del scaffold (SOLICITANTE, TECNICA, DIRECTOR_TECNICO,
// DIRECTOR_PROYECTO, CONTRATOS, CONTROLES, DIRECTOR_CONTROLES, GERENCIA,
// ADMIN) -- ver la migración de esta fecha. Cualquier chequeo de rol en el
// backend que sea una regla de NEGOCIO (no una etiqueta de UI) tiene que
// resolver el nombre ACTUAL contra este mapa antes de comparar contra
// `usuario.roles`, nunca comparar contra el string original a secas --
// ver dashboard.service.js/solicitud.estado.js/memoria.js/etc. para los
// call sites reales.
//
// CODIGOS_CONOCIDOS es el fallback si la columna/tabla no existe todavía o
// la consulta falla -- asume que ningún rol fue renombrado (el estado
// original del scaffold), mismo criterio que FUNCIONALIDADES_POR_ROL.
const CODIGOS_CONOCIDOS = ['SOLICITANTE', 'TECNICA', 'DIRECTOR_TECNICO', 'DIRECTOR_PROYECTO', 'CONTRATOS', 'CONTROLES', 'DIRECTOR_CONTROLES', 'GERENCIA', 'ADMIN'];
const FALLBACK_ROLES_POR_CODIGO = Object.fromEntries(CODIGOS_CONOCIDOS.map((c) => [c, c]));

async function getRolesPorCodigo() {
  try {
    const Rol = require('../modules/rol/rol.model');
    const { Op } = require('sequelize');
    const roles = await Rol.findAll({ where: { codigo: { [Op.ne]: null } }, attributes: ['codigo', 'nombre'] });
    if (roles.length === 0) return FALLBACK_ROLES_POR_CODIGO;
    const mapa = Object.fromEntries(roles.map((r) => [r.codigo, r.nombre]));
    // Un código conocido sin fila propia (rol borrado, o la migración de
    // codigo todavía no corrió para ese rol puntual) cae a su propio
    // nombre original -- mismo criterio "nadie pierde acceso" de siempre.
    for (const c of CODIGOS_CONOCIDOS) if (!mapa[c]) mapa[c] = c;
    return mapa;
  } catch {
    return FALLBACK_ROLES_POR_CODIGO;
  }
}

// roles: array de roles del usuario (puede tener más de uno, ver
// usuario.model.js). alcancePorRol: mapa rol->'PROPIAS'|'FRENTE'|'TODAS'
// (ver getRolesAlcanceSolicitudes). Si el usuario tiene varios roles con
// distinto alcance, se queda con el MÁS PERMISIVO -- mismo criterio que
// tienePermiso (un rol adicional solo puede sumar acceso, nunca quitarlo).
// Un rol sin fila en la tabla (o no reconocido) cae en FRENTE, el mismo
// default que tenía `ver_todas_solicitudes: false` antes de este cambio.
function resolverAlcanceSolicitudes(roles, alcancePorRol) {
  let mejor = 'PROPIAS';
  for (const rol of roles ?? []) {
    const alcance = alcancePorRol[rol] ?? 'FRENTE';
    if ((ORDEN_ALCANCE[alcance] ?? ORDEN_ALCANCE.FRENTE) > ORDEN_ALCANCE[mejor]) mejor = alcance;
  }
  return mejor;
}

module.exports = {
  ROL_LABELS,
  FUNCIONALIDADES_DISPONIBLES,
  FUNCIONALIDADES_POR_ROL,
  FALLBACK_ALCANCE_SOLICITUDES,
  tienePermiso,
  getRolesFuncionalidades,
  getRolesAlcanceSolicitudes,
  getRolesPorCodigo,
  resolverAlcanceSolicitudes,
};

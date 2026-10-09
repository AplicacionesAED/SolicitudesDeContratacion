// "Permisos por módulo, desglosados" (2026-09-02, mismo día que el
// desglose ver/crear): el usuario pidió que CADA ítem navegable del
// sidebar tenga su propio checkbox de acceso, calcado del árbol real
// (`frontend/src/utils/navModulos.jsx#NAV_GROUPS`) -- eso incluye
// "Especialidades" dentro de Terceros, que hasta ahora no tenía ningún
// permiso de LECTURA propio (`gestionar_especialidades` ya existía, pero
// solo gatea escritura). Nadie pierde acceso el día del deploy: antes de
// este permiso, listar especialidades estaba abierto a cualquier
// autenticado -- por eso se agrega `ver_especialidades` a TODOS los roles
// reales sin condición, igual que se hizo con `ver_terceros` en
// 20260831000513-desglose-ver-crear.js.
'use strict';

module.exports = {
  async up(queryInterface) {
    const [roles] = await queryInterface.sequelize.query('SELECT id, permisos FROM roles');
    for (const rol of roles) {
      const permisos = new Set(rol.permisos ?? []);
      permisos.add('ver_especialidades');
      await queryInterface.sequelize.query('UPDATE roles SET permisos = :permisos WHERE id = :id', {
        replacements: { permisos: JSON.stringify([...permisos]), id: rol.id },
      });
    }
  },
};

'use strict';

// Flujo propio de Directa (Orden de Servicio), 2026-09-18 -- 3 slots de
// responsabilidad nuevos en AprobadorFrente, distintos de los 6 que ya
// existen: Controles-Proyección ("Controles realiza proyección, debe dar
// su aprobado con fecha de aprobación"), Residente Administrativo
// ("coloca la Minuta de Adpro", reemplaza a Controles para Directa) y
// Controles-Aprobación-Final ("Controles aprueba el total", reemplaza a
// Director de Controles para Directa -- confirmado con el usuario que es
// una responsabilidad DISTINTA de Controles-Proyección, no el mismo slot
// actuando dos veces). Ver solicitud.autorizacion.js.
//
// Sin rol de sistema pre-cargado en el default (a diferencia de
// director_tecnico/controles_adpro en la migración 20260831000510, que sí
// lo tenían para no cambiar comportamiento YA existente el día del
// deploy) -- acá no hay comportamiento previo que preservar, es 100%
// nuevo, así que arranca vacío hasta que un admin lo configure.
module.exports = {
  async up(queryInterface, Sequelize) {
    const vacio = { usuarios: [], roles: [] };
    for (const columna of ['controles_proyeccion', 'residente_administrativo', 'controles_aprobacion_final']) {
      await queryInterface.addColumn('aprobador_frentes', columna, {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: vacio,
      });
    }
  },
};

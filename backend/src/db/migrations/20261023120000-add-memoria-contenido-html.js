// La Memoria pasa de tabla estructurada (columnas/filas) a una tabla pegada desde Excel, guardada como un solo campo
// de texto con el HTML ya limpio. Las memorias viejas conservan sus columnas/filas y se siguen mostrando; una memoria
// nueva solo llena `contenido_html`. Forward-only: no hay `down`.
'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE memorias ADD COLUMN IF NOT EXISTS contenido_html TEXT');
  },
};

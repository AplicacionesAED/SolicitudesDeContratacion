// Memoria: hasta 3 imágenes de apoyo junto a la tabla pegada desde Excel. Se guardan como lista de URLs de Drive
// (`/files/drive/<id>`) en una columna JSONB. Forward-only: no hay `down`.
'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query("ALTER TABLE memorias ADD COLUMN IF NOT EXISTS imagenes JSONB NOT NULL DEFAULT '[]'::jsonb");
  },
};

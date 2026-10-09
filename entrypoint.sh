#!/bin/bash
set -e

cd /app/backend

# `npm start` ya encadena migrate + arranque (ver backend/package.json) --
# NUNCA correr `db:seed` acá: la base de producción ya tiene los datos
# reales de la Fase 9 (importarDatosLegado.js), sembrar encima los usuarios/
# proyectos de demo sería un error real, no un no-op.
exec npm start

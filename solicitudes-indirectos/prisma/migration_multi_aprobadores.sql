-- Migración: AprobadorFrente → múltiples aprobadores por paso
-- Agrega columnas de arrays, copia datos existentes, elimina columnas viejas.

-- 1. Agregar nuevas columnas
ALTER TABLE "AprobadorFrente" ADD COLUMN IF NOT EXISTS "aprobadorIds"        TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "AprobadorFrente" ADD COLUMN IF NOT EXISTS "contratosTramiteIds" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "AprobadorFrente" ADD COLUMN IF NOT EXISTS "contratosMinutaIds"  TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "AprobadorFrente" ADD COLUMN IF NOT EXISTS "directorControlesIds" TEXT NOT NULL DEFAULT '[]';

-- 2. Copiar datos existentes (ID único → array JSON de un elemento)
UPDATE "AprobadorFrente"
SET "aprobadorIds" = CASE
  WHEN "aprobadorId" IS NOT NULL AND "aprobadorId" <> ''
  THEN '["' || "aprobadorId" || '"]'
  ELSE '[]'
END;

UPDATE "AprobadorFrente"
SET "contratosTramiteIds" = CASE
  WHEN "contratosTramiteId" IS NOT NULL AND "contratosTramiteId" <> ''
  THEN '["' || "contratosTramiteId" || '"]'
  ELSE '[]'
END;

UPDATE "AprobadorFrente"
SET "contratosMinutaIds" = CASE
  WHEN "contratosMinutaId" IS NOT NULL AND "contratosMinutaId" <> ''
  THEN '["' || "contratosMinutaId" || '"]'
  ELSE '[]'
END;

UPDATE "AprobadorFrente"
SET "directorControlesIds" = CASE
  WHEN "directorControlesId" IS NOT NULL AND "directorControlesId" <> ''
  THEN '["' || "directorControlesId" || '"]'
  ELSE '[]'
END;

-- 3. Eliminar columnas viejas
ALTER TABLE "AprobadorFrente" DROP COLUMN IF EXISTS "aprobadorId";
ALTER TABLE "AprobadorFrente" DROP COLUMN IF EXISTS "contratosTramiteId";
ALTER TABLE "AprobadorFrente" DROP COLUMN IF EXISTS "contratosMinutaId";
ALTER TABLE "AprobadorFrente" DROP COLUMN IF EXISTS "directorControlesId";

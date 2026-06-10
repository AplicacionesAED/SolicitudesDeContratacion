-- Ver estado actual
SELECT id, "frenteId", "contratosTramiteIds", "contratosMinutaIds"
FROM "AprobadorFrente"
WHERE "contratosTramiteIds" LIKE '%cmovxo9aw000a4azckmff3tw6%'
   OR "contratosMinutaIds"  LIKE '%cmovxo9aw000a4azckmff3tw6%';

-- Agregar Valery a contratosTramiteIds donde Jacqueline está y Valery aún no
UPDATE "AprobadorFrente"
SET "contratosTramiteIds" = (
  SELECT json_agg(elem)::text
  FROM (
    SELECT jsonb_array_elements_text("contratosTramiteIds"::jsonb) AS elem
    UNION
    SELECT 'cmq82ooat0001virovqf7ruzm'
  ) sub
)
WHERE "contratosTramiteIds" LIKE '%cmovxo9aw000a4azckmff3tw6%'
  AND "contratosTramiteIds" NOT LIKE '%cmq82ooat0001virovqf7ruzm%';

-- Agregar Valery a contratosMinutaIds donde Jacqueline está y Valery aún no
UPDATE "AprobadorFrente"
SET "contratosMinutaIds" = (
  SELECT json_agg(elem)::text
  FROM (
    SELECT jsonb_array_elements_text("contratosMinutaIds"::jsonb) AS elem
    UNION
    SELECT 'cmq82ooat0001virovqf7ruzm'
  ) sub
)
WHERE "contratosMinutaIds" LIKE '%cmovxo9aw000a4azckmff3tw6%'
  AND "contratosMinutaIds" NOT LIKE '%cmq82ooat0001virovqf7ruzm%';

-- Confirmar resultado
SELECT id, "frenteId", "contratosTramiteIds", "contratosMinutaIds"
FROM "AprobadorFrente"
WHERE "contratosTramiteIds" LIKE '%cmovxo9aw000a4azckmff3tw6%'
   OR "contratosMinutaIds"  LIKE '%cmovxo9aw000a4azckmff3tw6%';

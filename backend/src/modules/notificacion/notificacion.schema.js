const { z } = require('zod');

// PATCH /notificaciones acepta exactamente una de las dos formas -- mismo
// contrato que el PATCH original (`{ all: true }` o `{ id: number }`).
const marcarLeidaSchema = z
  .object({ all: z.boolean().optional(), id: z.number().int().optional() })
  .refine((v) => v.all === true || v.id !== undefined, { message: 'Se requiere { all: true } o { id: number }' });

module.exports = { marcarLeidaSchema };

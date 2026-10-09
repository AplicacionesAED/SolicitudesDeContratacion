const { z } = require('zod');

const createSchema = z.object({
  nombre: z.string().min(1).max(200),
  codigo_consecutivo: z.string().max(20).nullable().optional(),
  activo: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

module.exports = { createSchema, updateSchema };

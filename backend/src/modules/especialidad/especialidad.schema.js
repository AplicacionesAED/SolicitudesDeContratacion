const { z } = require('zod');

const createSchema = z.object({
  nombre: z.string().min(1).max(150),
  descripcion: z.string().max(500).nullable().optional(),
});

const updateSchema = createSchema.partial();

const importSchema = z.object({
  nombres: z.array(z.string()).min(1),
});

const fusionarSchema = z.object({ destino_id: z.coerce.number().int().positive() });

module.exports = { createSchema, updateSchema, importSchema, fusionarSchema };

const { z } = require('zod');

const alcanceSolicitudesSchema = z.enum(['PROPIAS', 'FRENTE', 'TODAS']);

const createSchema = z.object({
  nombre: z.string().min(1).max(30),
  permisos: z.array(z.string()).default([]),
  alcance_solicitudes: alcanceSolicitudesSchema.default('FRENTE'),
});

// nombre ahora SI se puede editar (puerto de Cartera, 2026-09-18, pedido
// explicito del usuario) -- ver rol.service.js#update para el saneo
// (reservados/duplicados) y el cascade a usuarios.roles.
const updateSchema = z.object({
  nombre: z.string().min(1).max(30).optional(),
  permisos: z.array(z.string()).optional(),
  alcance_solicitudes: alcanceSolicitudesSchema.optional(),
});

module.exports = { createSchema, updateSchema };

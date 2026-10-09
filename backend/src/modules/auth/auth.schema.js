// PLANTILLA -- copiado tal cual, va en backend/src/modules/auth/auth.schema.js.
const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().min(1), // es el email -- se llama "username" para que el front pueda reusar un <input name="username"> estandar de autofill del navegador
  password: z.string().min(1),
});

const cambiarPasswordSchema = z.object({
  nueva_password: z.string().min(1),
});

module.exports = { loginSchema, cambiarPasswordSchema };

// Adaptado de la plantilla -- puerto de authorize()/jwt()/session() de
// src/lib/auth.ts (app Next.js original): roles como array, MASTER_KEY_HASH
// como fallback de contraseña (log [MASTER_KEY_LOGIN] igual que el original),
// funcionalidades_adicionales en el perfil devuelto.
const ApiError = require('../../utils/ApiError');
const { validatePassword } = require('../../utils/passwordRules');
const { hashPassword, verifyPassword, createAccessToken, createRefreshToken, decodeToken } = require('../../utils/security');
const Usuario = require('../usuario/usuario.model');
const usuarioService = require('../usuario/usuario.service');

function _perfil(usuario) {
  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    roles: usuario.roles,
    funcionalidades_adicionales: usuario.funcionalidades_adicionales,
    cargo: usuario.cargo,
    telefono: usuario.telefono,
    debe_cambiar_password: usuario.debe_cambiar_password,
  };
}

async function login(email, password) {
  // Comparacion case-insensitive: un autocapitalize del navegador en el
  // campo type="email" no deberia bastar para que "credenciales
  // incorrectas" salga con la contrasena correcta -- ver el setter en
  // usuario.model.js, que guarda el email siempre en minusculas.
  const usuario = await Usuario.findOne({ where: { email: email.toLowerCase() } });
  if (!usuario) throw new ApiError(401, 'Credenciales incorrectas');

  let usedMasterKey = false;
  const passwordValida = await verifyPassword(password, usuario.hashed_password);
  if (!passwordValida) {
    const masterKeyHash = process.env.MASTER_KEY_HASH;
    const masterKeyValida = masterKeyHash ? await verifyPassword(password, masterKeyHash) : false;
    if (!masterKeyValida) throw new ApiError(401, 'Credenciales incorrectas');
    usedMasterKey = true;
  }

  if (!usuario.activo) {
    throw new ApiError(403, 'Tu cuenta está desactivada. Contacta al administrador del sistema.');
  }

  if (usedMasterKey) {
    // Evento de seguridad sensible: acceso a esta cuenta sin su propia contraseña.
    console.warn(`[MASTER_KEY_LOGIN] userId=${usuario.id} email=${usuario.email} at=${new Date().toISOString()}`);
  }

  await usuarioService.registrarConexion(usuario);

  return {
    accessToken: createAccessToken(usuario.email, usuario.roles),
    refreshToken: createRefreshToken(usuario.email),
    perfil: _perfil(usuario),
  };
}

async function refresh(refreshToken) {
  if (!refreshToken) throw new ApiError(401, 'No autenticado');

  let payload;
  try {
    payload = decodeToken(refreshToken);
  } catch {
    throw new ApiError(401, 'Token inválido o expirado');
  }
  if (payload.type !== 'refresh') throw new ApiError(401, 'Token inválido');

  const usuario = await Usuario.findOne({ where: { email: payload.sub, activo: true } });
  if (!usuario) throw new ApiError(401, 'Usuario no encontrado');

  return { accessToken: createAccessToken(usuario.email, usuario.roles) };
}

async function cambiarPassword(usuario, nuevaPassword) {
  validatePassword(nuevaPassword);
  await usuario.update({ hashed_password: await hashPassword(nuevaPassword), debe_cambiar_password: false });
}

module.exports = { login, refresh, cambiarPassword, _perfil };

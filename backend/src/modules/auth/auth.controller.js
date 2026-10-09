// PLANTILLA -- copiado tal cual, va en backend/src/modules/auth/auth.controller.js.
// `secure: NODE_ENV === 'production'` -- las cookies solo exigen HTTPS en
// producción; en dev (http://localhost) el navegador las rechazaría si secure
// fuera true siempre.
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const service = require('./auth.service');
const { ACCESS_TOKEN_EXPIRE_HOURS, REFRESH_TOKEN_EXPIRE_DAYS, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } = require('../../utils/security');

const COOKIE_BASE = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' };

const login = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, perfil } = await service.login(req.body.username, req.body.password);
  res.cookie(ACCESS_COOKIE_NAME, accessToken, { ...COOKIE_BASE, maxAge: ACCESS_TOKEN_EXPIRE_HOURS * 3600 * 1000 });
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, { ...COOKIE_BASE, maxAge: REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600 * 1000 });
  ok(res, perfil);
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie(ACCESS_COOKIE_NAME);
  res.clearCookie(REFRESH_COOKIE_NAME);
  ok(res, { detail: 'Sesión cerrada' });
});

const refresh = asyncHandler(async (req, res) => {
  const { accessToken } = await service.refresh(req.cookies?.[REFRESH_COOKIE_NAME]);
  res.cookie(ACCESS_COOKIE_NAME, accessToken, { ...COOKIE_BASE, maxAge: ACCESS_TOKEN_EXPIRE_HOURS * 3600 * 1000 });
  ok(res, { detail: 'Token renovado' });
});

const cambiarPassword = asyncHandler(async (req, res) => {
  await service.cambiarPassword(req.usuario, req.body.nueva_password);
  ok(res, { detail: 'Contraseña actualizada' });
});

module.exports = { login, logout, refresh, cambiarPassword };

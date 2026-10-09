// Adaptado de la plantilla: `usuario.roles` es un array (no un `rol` string
// único) -- ver usuario.model.js. `soloAdmin` chequea `usuario.esAdmin`
// (resuelto por el backend contra roles.es_admin, no contra el string
// 'ADMIN' -- ver GET /usuarios/me#esAdmin, 2026-09-18); `permiso` (opcional)
// chequea uno o más slugs granulares vía
// utils/permisos.js, para rutas restringidas a una acción específica en vez
// de a todo el rol admin. `permiso` acepta un string (chequeo único) o un
// array de strings (chequeo OR -- ej. importar-historico ahora sirve tanto a
// quien puede crear solicitudes directas como a quien puede crear indirectas,
// sin un slug único que cubra ambas).
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { usuarioTienePermiso } from '../utils/permisos.js';

export function ProtectedRoute({ soloAdmin = false, permiso = null }) {
  const { usuario, cargando } = useAuth();
  const location = useLocation();

  if (cargando) return null;
  if (!usuario) return <Navigate to="/login" state={{ from: location }} replace />;
  if (soloAdmin && !usuario.esAdmin) return <Navigate to="/" replace />;
  if (permiso) {
    const permisos = Array.isArray(permiso) ? permiso : [permiso];
    const tieneAlguno = permisos.some((p) => usuarioTienePermiso(usuario, p));
    if (!tieneAlguno) return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('./models'); // registra todas las asociaciones antes de montar rutas
const routes = require('./routes/index');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// `exposedHeaders` -- SIN esto, un `fetch()` cross-origin (frontend :5193
// hacia backend :3021 en dev, o cualquier CDN/dominio distinto en
// producción) no puede LEER `Content-Disposition` desde JS aunque el
// header sí viaje en la respuesta -- solo un puñado de headers están en la
// "CORS-safelisted list" por default, y `Content-Disposition` no es uno de
// ellos. Bug real reportado por el usuario: las 3 descargas autenticadas
// (documento.js, cronogramaExport.js, ordenServicio.js -- todas usan
// `fetch(...).then(res => res.headers.get('Content-Disposition'))` en
// api/solicitudes.js#descargarArchivo para sacar el nombre real del
// archivo) caían siempre al nombre de respaldo genérico porque el
// navegador nunca dejaba leer el header real -- `curl` no tiene esta
// restricción, por eso la verificación con curl nunca lo detectó.
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true, exposedHeaders: ['Content-Disposition'] }));
app.use(cookieParser());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
// Todo bajo /api -- necesario para poder servir el build del frontend desde
// este mismo proceso en producción (ver más abajo) sin que una ruta de API
// (`GET /solicitudes/:id`) choque con la página de React del mismo path
// (`/solicitudes/:id`, la vista de detalle) cuando el navegador navega
// directo a esa URL. En dev, `frontend/src/api/client.js` ya apunta a
// `http://localhost:3021/api` -- si algún módulo nuevo arma una URL a mano
// en vez de pasar por ese cliente, también necesita el prefijo.
app.use('/api', routes);

// En producción (imagen Docker), este mismo proceso sirve también el build
// estático del frontend (Vite `dist/`) -- un solo contenedor, sin
// nginx/servidor estático aparte. En desarrollo el frontend corre suelto con
// `vite dev` y esta carpeta no existe, así que este bloque no hace nada.
const FRONTEND_DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res, next) => {
    // Un /api/* que no matcheó ninguna ruta real (arriba) no debe caer acá --
    // seguiría cayendo al 404 normal de Express, nunca al index.html del SPA.
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

app.use(errorHandler);

module.exports = app;

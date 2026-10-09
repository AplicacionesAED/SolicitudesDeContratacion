require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3021;

const server = app.listen(PORT, () => {
  console.log(`Backend Solicitudes de Contratación escuchando en http://localhost:${PORT}`);
});

// Sin esto, un puerto ocupado revienta con un stack trace confuso -- ver el
// gotcha de nodemon+SIGKILL en ARQUITECTURA-BACKEND.md (Windows puede tardar
// unos segundos en liberar el puerto incluso tras un SIGKILL limpio).
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`El puerto ${PORT} ya está en uso. Espera unos segundos o cierra el proceso que lo tiene y vuelve a intentar.`);
    process.exit(1);
  }
  throw err;
});

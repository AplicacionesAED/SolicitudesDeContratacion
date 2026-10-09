// Único lugar que carga TODOS los modelos y llama a su associate(models) --
// nunca repetido módulo por módulo (ver "La forma de 5 archivos" en
// ARQUITECTURA-BACKEND.md). Requerido una sola vez desde app.js, antes de que
// cualquier query use una asociación (`include`).
const Usuario = require('../modules/usuario/usuario.model');
const Rol = require('../modules/rol/rol.model');
const WorkflowDesvio = require('../modules/workflow/workflowDesvio.model');
const WorkflowLayout = require('../modules/workflow/workflowLayout.model');
const Proyecto = require('../modules/proyecto/proyecto.model');
const Frente = require('../modules/frente/frente.model');
const FrenteUsuario = require('../modules/frente/frenteUsuario.model');
const AprobadorFrente = require('../modules/aprobadorFrente/aprobadorFrente.model');
const Especialidad = require('../modules/especialidad/especialidad.model');
const Tercero = require('../modules/tercero/tercero.model');
const TerceroEspecialidad = require('../modules/tercero/terceroEspecialidad.model');
const Solicitud = require('../modules/solicitud/solicitud.model');
const HistorialSolicitud = require('../modules/solicitud/historialSolicitud.model');
const ContadorConsecutivo = require('../modules/solicitud/contadorConsecutivo.model');
const CronogramaContrato = require('../modules/solicitud/cronogramaContrato.model');
const FaseCronograma = require('../modules/solicitud/faseCronograma.model');
const ActividadCronograma = require('../modules/solicitud/actividadCronograma.model');
const CuadroComparativo = require('../modules/solicitud/cuadroComparativo.model');
const CuadroComparativoProveedor = require('../modules/solicitud/cuadroComparativoProveedor.model');
const CuadroComparativoItem = require('../modules/solicitud/cuadroComparativoItem.model');
const Memoria = require('../modules/solicitud/memoria.model');
const MemoriaColumna = require('../modules/solicitud/memoriaColumna.model');
const MemoriaFila = require('../modules/solicitud/memoriaFila.model');
const Notificacion = require('../modules/notificacion/notificacion.model');
const ActividadUsuario = require('../modules/actividad/actividadUsuario.model');
const SesionUsuario = require('../modules/actividad/sesionUsuario.model');

const models = {
  Usuario,
  Rol,
  WorkflowDesvio,
  WorkflowLayout,
  Proyecto,
  Frente,
  FrenteUsuario,
  AprobadorFrente,
  Especialidad,
  Tercero,
  TerceroEspecialidad,
  Solicitud,
  HistorialSolicitud,
  ContadorConsecutivo,
  CronogramaContrato,
  FaseCronograma,
  ActividadCronograma,
  CuadroComparativo,
  CuadroComparativoProveedor,
  CuadroComparativoItem,
  Memoria,
  MemoriaColumna,
  MemoriaFila,
  Notificacion,
  ActividadUsuario,
  SesionUsuario,
};

Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') model.associate(models);
});

module.exports = models;

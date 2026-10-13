// Puerto simplificado de solicitudForm.tsx (1181 líneas en el original) --
// misma validación y flujo de negocio (frentes asignados, contratista
// filtrado por debida diligencia, asunto auto-generado, valor en letras,
// cronograma con mínimo de días hábiles, subida real de los 3 documentos vía
// POST /upload -- Fase 8), sin el editor de tercero embebido (ya vive en
// TerceroDetallePage, Fase 3).
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { numeroALetras, categoriaSlug, tipoContratoLabel, formatCurrency } from '../../utils/solicitudes.js';
import { listFrentes } from '../../api/frentes.js';
import { listTerceros } from '../../api/terceros.js';
import { createSolicitud, updateSolicitud, cambiarEstado, guardarCronograma, guardarCuadroComparativo, guardarMemoria, completarHistorico, importarHistorico } from '../../api/solicitudes.js';
import { CronogramaBuilder } from './CronogramaBuilder.jsx';
import { CuadroComparativoBuilder, normalizarCuadroComparativo, calcularTotalesProveedor } from './CuadroComparativoBuilder.jsx';
import { MemoriaBuilder, normalizarMemoria } from './MemoriaBuilder.jsx';
import { OtrosisHistoricosBuilder, validarOtrosisHistoricos } from './OtrosisHistoricosBuilder.jsx';
import { BackLink } from '../../components/ui/BackLink.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, TextInput, Textarea } from '../../components/ui/Field.jsx';
import { FileField } from '../../components/ui/FileField.jsx';
import { Combobox } from '../../components/ui/Combobox.jsx';
import styles from './Solicitudes.module.css';
import f from './Formulario.module.css';

// Fieles a como se veía "Formato de Solicitud" en la app original -- ver
// CLAUDE.md 2026-09-09 ("Formato de Solicitud restaurado"). Solo son texto
// de ejemplo (placeholder), no defaults reales.
const PLACEHOLDER_ALCANCE = 'Ej: Suministro e instalación de equipos de climatización en las torres A y B del proyecto...';
const PLACEHOLDER_TERMINOS = 'Ej: El contratista deberá entregar planos en formato DWG y PDF, firmados por el ingeniero responsable...';
const PLACEHOLDER_CONDICIONES = 'Ej: Confidencialidad, restricciones de acceso a la obra, entregables adicionales no incluidos en el objeto...';

// "Datos del contratista" en Formato de Solicitud -- mismos 6 campos de
// contacto que ya muestra SolicitudDetallePage.jsx (vienen del Tercero
// seleccionado, camelCase). `null` se muestra como "Sin información" en vez
// de dejar el valor en blanco, igual que el original.
const CAMPOS_CONTRATISTA = [
  ['Razón social', 'razonSocial'],
  ['NIT', 'nit'],
  ['Representante legal', 'representanteLegal'],
  ['Cédula representante', 'cedulaRepresentante'],
  ['Correo de firma', 'correoFirma'],
  ['Dirección representante', 'direccionRepresentante'],
  ['Teléfono representante', 'telefonoRepresentante'],
];

const CONTRATANTE_NOMBRE = 'PROMOTORA BARLOVENTO DEL MAR S.A.S';
const CONTRATANTE_NIT = '901307871';

const CRONOGRAMA_VACIO = { tieneFases: false, fechaInicio: '', fechaFin: '', fases: [], actividades: [{ descripcion: '', fechaInicio: '', fechaFin: '' }] };

function diasHastaVencer(fecha) {
  if (!fecha) return null;
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function terceroSeleccionable(t) {
  // Mismo filtro que el original: aprobado en debida diligencia, marcado
  // como confidencial, y sin SAGRILAFT vencido -- ver la nota sobre este
  // filtro en SOLICITUDES/CLAUDE.md (confidencialidad como requisito llamó la
  // atención en la revisión, se porta tal cual).
  if (!t.aprobadoDebidaDiligencia || !t.confidencialidad) return false;
  const dias = diasHastaVencer(t.fechaVencimientoSagrilaft);
  if (dias !== null && dias <= 0) return false;
  return true;
}

// `historico` (pedido explícito del usuario, 2026-09-25) -- reusa este mismo
// formulario, campo por campo, para "Importar registro histórico" cuando el
// tipo es CONTRATO/ORDEN_SERVICIO (los únicos con formulario "normal" real
// en la app) en vez del puñado de campos sueltos que tenía
// ImportarHistoricoPage.jsx -- el resto (detección Directa/Indirecta, tipos
// de contrato disponibles, Cronograma solo en Indirecta, Memoria solo en
// Directa, Cuadro Comparativo con proveedor único en Directa, etc.) ya lo
// resuelve `categoriaEfectiva`/`tratarComoContrato` sin ningún cambio extra.
//
// 2026-09-25, seguimiento: "que también se pueda guardar borrador... y que
// se pueda volver a la edición" -- un histórico ya NO fuerza validación
// estricta ni un único botón "Importar": se comporta exactamente como una
// solicitud normal (Guardar borrador con validación laxa / Importar con
// validación estricta), la única diferencia real es el paso final. Crear/
// editar usa los mismos `createSolicitud`/`updateSolicitud` de siempre (el
// create manda `importadoHistorico: true` para que nazca marcado desde
// BORRADOR, ver solicitud.service.js#crearNormal) -- así un borrador
// histórico se guarda, se lista, y se edita exactamente igual que cualquier
// otro borrador (`EditarSolicitudPage.jsx` no necesita saber que es
// histórico). El único paso NUEVO es `completarHistorico()` en vez de
// `cambiarEstado(id, 'ENVIAR')` al finalizar -- salta directo a COMPLETADA
// sin pasar por la máquina de aprobaciones (nunca hay quién apruebe algo
// que ya ocurrió).
//
// `esHistorico` combina el prop explícito (entrando a crear uno nuevo,
// prop `historico` en la ruta) con el flag ya persistido en el registro
// (`initialData.importadoHistorico`, al volver a editar un borrador
// histórico ya guardado -- EditarSolicitudPage.jsx nunca pasa `historico`
// a mano, lo detecta solo desde acá).
export function SolicitudForm({ tipoSolicitud, categoria, isEdit = false, initialData, historico = false }) {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const esHistorico = historico || initialData?.importadoHistorico === true;
  // Al editar, la categoría real es la del registro ya creado (no editable) --
  // el prop `categoria` solo aplica al crear, viene de la ruta
  // /solicitudes-directas|indirectas/nueva/... por la que se entró.
  const categoriaEfectiva = isEdit ? initialData.categoria : categoria;

  // 2026-09-09 "en directos, Orden de Servicio debe tener el mismo formato
  // que Contrato... de momento debe ser exactamente igual" -- pedido
  // explícito del usuario, confirmado el alcance con él: mismas secciones/
  // textos/validaciones que Contrato (incluida la sección "Tipo de
  // contrato"), EXCEPTO el plazo mínimo del cronograma (2 días hábiles para
  // Orden de Servicio, 13 para Contrato -- ver `minDays` más abajo, es una
  // regla de negocio, no un tema de formato). Solo aplica a DIRECTA -- en
  // INDIRECTA, Orden de Servicio sigue exactamente como estaba (sin esta
  // sección, tipoContrato fijo a OTROS_SERVICIOS sin pedir selección).
  const tratarComoContrato = tipoSolicitud === 'CONTRATO' || categoriaEfectiva === 'DIRECTA';

  // Los otrosís históricos solo aplican a CONTRATO -- las Órdenes de
  // Servicio no admiten otrosí en absoluto (solicitud.importarHistorico.js
  // rechaza un padre ORDEN_SERVICIO), así que en Directa (que ya no crea/
  // importa CONTRATO, solo Orden de Servicio) esta sección nunca aparece.
  const permiteOtrosisHistoricos = esHistorico && tipoSolicitud === 'CONTRATO';

  const [frentes, setFrentes] = useState([]);
  const [terceros, setTerceros] = useState([]);

  const [form, setForm] = useState({
    frentesIds: initialData?.frentesIds ?? [],
    terceroId: initialData?.terceroId ?? '',
    // "No siga siendo OBRA, en directos que sea Todo Costo y en indirectos
    // Otros Servicios" -- pedido explícito del usuario: el valor guardado
    // (no solo la etiqueta) ahora es distinto por categoría, ver
    // tiposContratoDisponibles más abajo. Para Orden de Servicio en
    // INDIRECTA (sin radio, un solo valor posible) se fuerza directo -- en
    // DIRECTA, `tratarComoContrato` ya es true, así que Orden de Servicio
    // pasa por el mismo radio que Contrato y arranca vacío igual que él.
    tipoContrato: tratarComoContrato ? initialData?.tipoContrato ?? '' : 'OTROS_SERVICIOS',
    descripcionActividad: initialData?.descripcionActividad ?? '',
    plazoEjecucion: initialData?.plazoEjecucion ?? '',
    formaPago: initialData?.formaPago ?? '',
    valorFinal: initialData?.valorFinal ?? '',
    asunto: initialData?.asunto ?? '',
    alcance: initialData?.alcance ?? '',
    terminosReferencia: initialData?.terminosReferencia ?? '',
    condicionesEspeciales: initialData?.condicionesEspeciales ?? '',
    archivoCotizacion: initialData?.archivoCotizacion ?? '',
    archivoPreBEP: initialData?.archivoPreBEP ?? '',
  });
  const [asuntoTocado, setAsuntoTocado] = useState(isEdit);
  const [cronograma, setCronograma] = useState(() =>
    initialData?.cronograma
      ? { tieneFases: initialData.cronograma.tieneFases, fechaInicio: initialData.cronograma.fechaInicio, fechaFin: initialData.cronograma.fechaFin, fases: initialData.cronograma.fases, actividades: initialData.cronograma.actividades.length > 0 ? initialData.cronograma.actividades : CRONOGRAMA_VACIO.actividades }
      : CRONOGRAMA_VACIO
  );
  const [cronogramaError, setCronogramaError] = useState('');
  const [cuadroComparativo, setCuadroComparativo] = useState(() => normalizarCuadroComparativo(initialData?.cuadroComparativo));
  // Memoria: solo para Solicitudes Directas por ahora (pedido explícito del
  // usuario), ver la sección "Memoria" más abajo, gateada por
  // categoriaEfectiva.
  const [memoria, setMemoria] = useState(() => normalizarMemoria(initialData?.memoria));
  // Otrosís históricos a importar junto con el contrato (2026-09-28, pedido
  // explícito) -- solo CONTRATO (nunca Orden de Servicio, que no admite
  // otrosí, ver el gate más abajo). No hay forma de persistir esto como
  // borrador (un otrosí histórico exige un padre ya COMPLETADA, y mientras
  // el contrato sigue en BORRADOR no existe todavía) -- por eso arranca
  // vacío incluso al reabrir un borrador ya guardado (`isEdit`), y solo se
  // envían al backend en el paso "Importar" (ver guardar() más abajo).
  const [otrosisHistoricos, setOtrosisHistoricos] = useState([]);
  const [otrosisHistoricosError, setOtrosisHistoricosError] = useState('');
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(null);

  useEffect(() => {
    listFrentes().then((res) => {
      const rol0 = usuario.roles[0];
      // Resuelto por código, no por los strings a secas (2026-09-18) -- si
      // un admin renombra CONTRATOS/CONTROLES/DIRECTOR_CONTROLES, esto no
      // debe dejar de reconocerlos. Ver utils/permisos.js (backend)#getRolesPorCodigo,
      // expuesto acá en `usuario.rolesPorCodigo` (GET /usuarios/me).
      const rp = usuario.rolesPorCodigo ?? {};
      const verTodos = usuario.esAdmin || usuario.roles.includes(rp.CONTRATOS) || usuario.roles.includes(rp.CONTROLES) || usuario.roles.includes(rp.DIRECTOR_CONTROLES);
      if (verTodos) {
        setFrentes(res.data);
      } else {
        const asignados = res.data.filter((f) => f.usuarioIds?.includes(usuario.id));
        setFrentes(asignados.length > 0 ? asignados : res.data);
      }
      void rol0;
    });
    listTerceros(true).then((res) => setTerceros(res.data));
  }, [usuario]);

  const terceroSeleccionado = useMemo(() => terceros.find((t) => t.id === form.terceroId) ?? null, [terceros, form.terceroId]);
  // El filtrado por texto ahora vive DENTRO de <Combobox> (su propio query
  // interno) -- acá solo se restringe a los elegibles (debida diligencia +
  // confidencialidad, ver terceroSeleccionable arriba), un solo control en
  // vez de un buscador de texto suelto + un <select> gigante aparte.
  const terceroOpciones = useMemo(() => {
    return terceros.filter(terceroSeleccionable).map((t) => ({
      value: t.id,
      label: t.especialidades?.length ? `${t.razonSocial} — ${t.especialidades.map((e) => e.nombre).join(', ')}` : t.razonSocial,
    }));
  }, [terceros]);

  // "Valor final (IVA incluido)" es AUTOMÁTICO -- pedido explícito del
  // usuario (2026-09-21): sale del Costo Total del proveedor seleccionado
  // en el Cuadro Comparativo (misma fórmula que su tarjeta "Costo total" --
  // `calcularTotalesProveedor`, única fuente de verdad). Ya no tiene campo
  // propio en el FORMULARIO ("consume espacio" -- se quitó de acá, el
  // detalle de la solicitud lo sigue mostrando igual que siempre); esto
  // solo calcula `form.valorFinal`/`valorEnLetras` para que buildPayload()
  // los mande al guardar. Se redondea al peso porque el resto del backend
  // guarda `valor_final` como un entero, no un decimal.
  const costoTotalCuadro = useMemo(() => {
    const proveedor = cuadroComparativo.proveedores.find((p) => p.seleccionado) ?? cuadroComparativo.proveedores[0];
    if (!proveedor || cuadroComparativo.items.length === 0) return 0;
    return calcularTotalesProveedor(cuadroComparativo.items, proveedor).costoTotal;
  }, [cuadroComparativo]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, valorFinal: costoTotalCuadro > 0 ? String(Math.round(costoTotalCuadro)) : '' }));
  }, [costoTotalCuadro]);

  const valorEnLetras = form.valorFinal > 0 ? numeroALetras(Number(form.valorFinal)) : '';

  // Compartido entre el auto-generado del asunto, buildPayload() (para
  // resolver proyectoId), y la sección "Formato de Solicitud" (Área/frente +
  // Proyecto) -- una sola fuente en vez de repetir el mismo `.filter()` en
  // tres lugares.
  const frentesSeleccionados = useMemo(() => frentes.filter((f) => form.frentesIds.includes(f.id)), [frentes, form.frentesIds]);

  // "En los contratos directos no existen los contratos de tipo Diseño" --
  // Diseño solo aplica a Indirecta. "Todo Costo"/"Otros Servicios" ya no son
  // la misma etiqueta sobre un mismo valor 'OBRA' -- son valores DISTINTOS
  // por categoría (pedido explícito: "eso de OBRA no es necesario").
  const tiposContratoDisponibles = categoriaEfectiva === 'DIRECTA' ? ['TODO_COSTO', 'SUMINISTRO_MATERIALES', 'MANO_OBRA', 'SERVICIOS', 'TRANSPORTE', 'ALQUILER'] : ['OTROS_SERVICIOS', 'DISENO'];

  useEffect(() => {
    if (asuntoTocado) return;
    const nombresFrentes = frentesSeleccionados.map((f) => f.nombre).join(', ');
    const nombreTercero = terceroSeleccionado?.razonSocial ?? '';
    const desc = form.descripcionActividad.length > 80 ? `${form.descripcionActividad.slice(0, 80)}...` : form.descripcionActividad;
    if (nombresFrentes || nombreTercero || desc) {
      const prefijo = tipoSolicitud === 'ORDEN_SERVICIO' ? 'ORDEN DE SERVICIO' : 'CONTRATO';
      setForm((prev) => ({ ...prev, asunto: `[${prefijo}] – ${nombresFrentes || 'Frente(s)'} – ${nombreTercero || 'Contratista'} – ${desc}` }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.frentesIds, form.descripcionActividad, terceroSeleccionado, frentes]);

  function toggleFrente(id) {
    setForm((prev) => ({ ...prev, frentesIds: prev.frentesIds.includes(id) ? prev.frentesIds.filter((x) => x !== id) : [...prev.frentesIds, id] }));
  }

  function validarCronograma() {
    const todas = cronograma.tieneFases ? cronograma.fases.flatMap((f) => f.actividades) : cronograma.actividades;
    if (!todas.some((a) => a.descripcion.trim().length > 0)) {
      setCronogramaError('Debes registrar al menos una actividad en el cronograma.');
      return false;
    }
    if (!todas.every((a) => a.descripcion.trim().length > 0)) {
      setCronogramaError('Todas las actividades del cronograma deben tener una descripción.');
      return false;
    }
    setCronogramaError('');
    return true;
  }

  async function guardarCronogramaSiAplica(solicitudId) {
    if (!cronograma.fechaInicio || !cronograma.fechaFin) return true;
    try {
      await guardarCronograma(solicitudId, cronograma);
      return true;
    } catch (err) {
      setError(err.message ?? 'Error al guardar el cronograma');
      return false;
    }
  }

  async function guardarCuadroComparativoSiAplica(solicitudId) {
    if (cuadroComparativo.proveedores.length === 0 && cuadroComparativo.items.length === 0) return true;
    try {
      await guardarCuadroComparativo(solicitudId, cuadroComparativo);
      return true;
    } catch (err) {
      setError(err.message ?? 'Error al guardar el cuadro comparativo');
      return false;
    }
  }

  async function guardarMemoriaSiAplica(solicitudId) {
    if (categoriaEfectiva !== 'DIRECTA' || memoria.filas.length === 0) return true;
    try {
      await guardarMemoria(solicitudId, memoria);
      return true;
    } catch (err) {
      setError(err.message ?? 'Error al guardar la memoria');
      return false;
    }
  }

  function validar({ paraEnviar }) {
    const nuevos = {};
    // "Guardar borrador"/"Guardar cambios" (paraEnviar=false) solo exige lo
    // mismo que exige el backend para crear/actualizar un BORRADOR --
    // frentesIds (hace falta para resolver proyectoId, ver buildPayload).
    // Bug real encontrado (2026-09-19): antes esta función exigía CASI
    // TODOS los campos sin importar `paraEnviar`, así que un borrador
    // incompleto (el caso de uso real de un borrador) nunca lograba
    // guardarse -- se comportaba igual que "Guardar y enviar". El resto de
    // validaciones (objeto, contratista, valor, cuadro comparativo, etc.)
    // solo aplica cuando de verdad se va a enviar.
    if (form.frentesIds.length === 0) nuevos.frentesIds = 'Selecciona al menos un frente de trabajo';
    if (paraEnviar) {
      if (!form.terceroId) nuevos.terceroId = 'Selecciona un contratista';
      if (tratarComoContrato && !form.tipoContrato) nuevos.tipoContrato = 'Selecciona el tipo de contrato';
      if (form.descripcionActividad.trim().length < 50) nuevos.descripcionActividad = 'La descripción debe tener al menos 50 caracteres';
      if (!form.plazoEjecucion.trim()) nuevos.plazoEjecucion = 'El plazo de ejecución es obligatorio';
      if (!form.formaPago.trim()) nuevos.formaPago = 'La forma de pago es obligatoria';
      if (!form.asunto.trim()) nuevos.asunto = 'El asunto es obligatorio';
      if (cuadroComparativo.proveedores.length === 0 || cuadroComparativo.items.length === 0) {
        nuevos.cuadroComparativo = 'El cuadro comparativo es obligatorio: agrega al menos un proveedor y un ítem';
      } else if (!(Number(form.valorFinal) > 0)) {
        // "Valor final" ya no tiene campo propio en el formulario (viene
        // solo del Cuadro Comparativo, ver costoTotalCuadro más arriba) --
        // si el Costo Total da $0, el error se muestra bajo esa sección
        // (única visible), no en un campo que ya no existe en pantalla.
        nuevos.cuadroComparativo = 'El Costo Total del Cuadro Comparativo debe ser mayor a $0 -- revisa los precios y cantidades cargados ahí.';
      }
      if (!form.archivoCotizacion.trim()) nuevos.archivoCotizacion = 'La cotización es obligatoria';
      if (form.tipoContrato === 'DISENO' && !form.archivoPreBEP.trim()) nuevos.archivoPreBEP = 'El PreBEP es obligatorio para contratos de diseño';
    }
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  function buildPayload() {
    const firstFrente = frentesSeleccionados[0];
    return {
      tipo: tipoSolicitud,
      categoria: categoriaEfectiva,
      // /frentes (Fase 2) devuelve la instancia Sequelize cruda -- snake_case
      // (proyecto_id), no camelCase -- a diferencia de tercero.service.js/
      // solicitud.service.js, que sí traducen a camelCase.
      proyectoId: firstFrente?.proyecto_id,
      frentesIds: form.frentesIds,
      // Un borrador puede guardarse sin estos campos -- `form.terceroId`/
      // `form.valorFinal` vacíos no deben convertirse en `0` (un valor real,
      // distinto de "todavía sin dato"), sino en `null` (nulable en el
      // schema del backend).
      terceroId: form.terceroId ? Number(form.terceroId) : null,
      descripcionActividad: form.descripcionActividad || null,
      plazoEjecucion: form.plazoEjecucion || null,
      formaPago: form.formaPago || null,
      valorFinal: form.valorFinal ? Number(form.valorFinal) : null,
      tipoContrato: form.tipoContrato || null,
      asunto: form.asunto || null,
      contratanteNombre: CONTRATANTE_NOMBRE,
      contratanteNit: CONTRATANTE_NIT,
      alcance: form.alcance || null,
      // "Términos de referencia"/"Condiciones especiales" no aplican en
      // Directa (pedido explícito del usuario, 2026-09-21) -- se ocultan
      // del formulario más abajo, y acá se fuerza `null` para que un valor
      // viejo (de una solicitud editada que cambió de categoría antes de
      // esta regla, caso teórico) no se arrastre sin poder limpiarse desde
      // la UI.
      terminosReferencia: categoriaEfectiva === 'DIRECTA' ? null : form.terminosReferencia || null,
      condicionesEspeciales: categoriaEfectiva === 'DIRECTA' ? null : form.condicionesEspeciales || null,
      valorEnLetras: valorEnLetras || null,
      archivoCotizacion: form.archivoCotizacion || null,
      archivoPreBEP: form.archivoPreBEP || null,
    };
  }

  async function guardar(paraEnviar) {
    // Mismo criterio que una solicitud normal -- "Guardar borrador"
    // (paraEnviar=false) valida laxo incluso para un histórico, "Importar"/
    // "Guardar y enviar" (paraEnviar=true) valida estricto.
    if (!validar({ paraEnviar })) return;
    // Mismo criterio que validar() -- el cronograma completo solo hace
    // falta para enviar, un borrador puede guardarse sin ninguna actividad
    // todavía.
    // Cronograma no aplica en Directa -- no hay UI para llenarlo, así que
    // tampoco se exige al enviar (ver el gate categoriaEfectiva === 'INDIRECTA'
    // de la sección más abajo).
    if (paraEnviar && categoriaEfectiva === 'INDIRECTA' && !validarCronograma()) return;
    if (paraEnviar && permiteOtrosisHistoricos) {
      const errs = validarOtrosisHistoricos(otrosisHistoricos);
      if (errs.length > 0) {
        setOtrosisHistoricosError(errs.join(' '));
        return;
      }
      setOtrosisHistoricosError('');
    }
    setGuardando(paraEnviar ? (esHistorico ? 'importar' : 'enviar') : 'borrador');
    setError(null);
    try {
      const payload = buildPayload();
      const res = isEdit
        ? await updateSolicitud(initialData.id, payload)
        : await createSolicitud(esHistorico ? { ...payload, importadoHistorico: true } : payload);
      const solicitudId = isEdit ? initialData.id : res.data.id;

      if (!(await guardarCronogramaSiAplica(solicitudId))) return;
      if (!(await guardarCuadroComparativoSiAplica(solicitudId))) return;
      if (!(await guardarMemoriaSiAplica(solicitudId))) return;

      if (paraEnviar) {
        if (esHistorico) {
          await completarHistorico(solicitudId);
          // Cada otrosí histórico se crea aparte (mismo endpoint que
          // ImportarOtrosiHistoricoPage.jsx), en orden ascendente de número
          // -- un OTROSI_TIEMPO_CANTIDAD sin valorFinal propio hereda el del
          // otrosí COMPLETADA más reciente (pickMostRecentOtrosi, backend),
          // así que crear en orden importa para que ese heredado sea el
          // correcto. Si alguno falla, el catch de abajo lo muestra y NO
          // navega -- el contrato y los otrosís ya creados quedan a salvo,
          // se puede completar el resto luego desde
          // /solicitudes/importar-historico (Otrosí de un contrato existente).
          const ordenados = [...otrosisHistoricos].sort((a, b) => Number(a.numeroOtrosi) - Number(b.numeroOtrosi));
          for (const o of ordenados) {
            const valor = o.tipo === 'OTROSI_TIEMPO_CANTIDAD' && o.valorFinal ? Number(o.valorFinal) : null;
            await importarHistorico({
              modo: 'OTROSI',
              categoria: categoriaEfectiva,
              tipo: o.tipo,
              solicitudPadreId: solicitudId,
              numeroOtrosi: Number(o.numeroOtrosi),
              valorFinal: valor,
              valorEnLetras: valor ? numeroALetras(valor) : null,
              fechaInicio: o.fechaInicio,
              fechaFin: o.fechaFin,
            });
          }
        } else {
          const accion = isEdit && (initialData.estado === 'DEVUELTA' || initialData.estado === 'EN_REVISION') ? 'REENVIAR' : 'ENVIAR';
          await cambiarEstado(solicitudId, accion);
        }
      }
      navigate(`/solicitudes/${solicitudId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(null);
    }
  }

  const grupos = useMemo(() => {
    const sorted = [...frentes].sort((a, b) => (a.etapa ?? 999) - (b.etapa ?? 999));
    const acc = [];
    for (const f of sorted) {
      const etapa = f.etapa ?? null;
      const g = acc.find((x) => x.etapa === etapa);
      if (g) g.frentes.push(f);
      else acc.push({ etapa, frentes: [f] });
    }
    return acc;
  }, [frentes]);

  // ---- Avance del formulario (panel lateral): las MISMAS reglas que validar({ paraEnviar: true }), solo para mostrar
  // que falta antes de enviar. No bloquea nada ni cambia ninguna validacion. ----
  const actividadesCronograma = cronograma.tieneFases ? cronograma.fases.flatMap((fa) => fa.actividades) : cronograma.actividades;
  const requisitosEnvio = [
    { ok: form.frentesIds.length > 0, label: 'Frente(s) de trabajo', ancla: 'sec-frentes' },
    { ok: Boolean(form.terceroId), label: 'Contratista', ancla: 'sec-contratista' },
    ...(tratarComoContrato ? [{ ok: Boolean(form.tipoContrato), label: 'Tipo de contrato', ancla: 'sec-info' }] : []),
    { ok: form.descripcionActividad.trim().length >= 50, label: 'Objeto', detalle: `${Math.min(form.descripcionActividad.trim().length, 50)}/50 caracteres`, ancla: 'sec-info' },
    { ok: Boolean(form.plazoEjecucion.trim()), label: 'Plazo de ejecución', ancla: 'sec-info' },
    { ok: Boolean(form.formaPago.trim()), label: 'Forma de pago', ancla: 'sec-info' },
    { ok: cuadroComparativo.proveedores.length > 0 && cuadroComparativo.items.length > 0 && Number(form.valorFinal) > 0, label: 'Cuadro comparativo con valor', ancla: 'sec-cuadro' },
    { ok: Boolean(form.archivoCotizacion.trim()), label: 'Cotización (PDF)', ancla: 'sec-docs' },
    ...(form.tipoContrato === 'DISENO' ? [{ ok: Boolean(form.archivoPreBEP.trim()), label: 'PreBEP (PDF)', ancla: 'sec-docs' }] : []),
    { ok: Boolean(form.asunto.trim()), label: 'Asunto', ancla: 'sec-asunto' },
    ...(categoriaEfectiva === 'INDIRECTA' ? [{ ok: actividadesCronograma.length > 0 && actividadesCronograma.every((a) => a.descripcion.trim().length > 0), label: 'Cronograma', ancla: 'sec-cronograma' }] : []),
  ];
  const completados = requisitosEnvio.filter((r) => r.ok).length;
  const irA = (ancla) => document.getElementById(ancla)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <BackLink to={`/solicitudes-${categoriaSlug(categoriaEfectiva)}`}>Solicitudes</BackLink>
      <h1 className={styles.title}>
        {esHistorico ? (isEdit ? 'Editar borrador histórico — ' : 'Importar ') : isEdit ? 'Editar ' : ''}{tipoSolicitud === 'ORDEN_SERVICIO' ? 'Orden de Servicio' : 'Solicitud de Contrato'}
      </h1>
      {esHistorico && (
        <p style={{ margin: '-8px 0 0', color: 'var(--color-ink-muted)' }}>
          {isEdit
            ? 'Seguí completando este registro histórico. Podés guardar otro borrador o importarlo cuando esté listo.'
            : `Registra este ${tipoSolicitud === 'ORDEN_SERVICIO' ? 'orden de servicio' : 'contrato'} anterior a este sistema con toda su información, como si fuera una solicitud real ya completada. Podés guardarlo como borrador y volver más tarde.`}
        </p>
      )}

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={f.layout}>
      <div className={f.main}>
      <div id="sec-frentes" className={styles.section}>
        <h2 className={styles.sectionTitle}>Frente(s) de trabajo</h2>
        {grupos.map((g) => (
          <div key={g.etapa ?? 'sin-etapa'}>
            <p style={{ fontSize: 'var(--text-label-size)', color: 'var(--color-ink-muted)', margin: '0 0 6px' }}>{g.etapa != null ? `Etapa ${g.etapa}` : 'Sin etapa'}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
              {g.frentes.map((f) => (
                <label key={f.id} style={{ display: 'flex', gap: 6, alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '6px 12px' }}>
                  <input type="checkbox" checked={form.frentesIds.includes(f.id)} onChange={() => toggleFrente(f.id)} />
                  {f.nombre} <span style={{ color: 'var(--color-ink-muted)', fontSize: 'var(--text-label-size)' }}>({f.proyecto?.nombre})</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        {errores.frentesIds && <p style={{ color: 'var(--color-danger-ink)', fontSize: 'var(--text-data-size)' }}>{errores.frentesIds}</p>}
      </div>

      <div id="sec-contratista" className={styles.section}>
        <h2 className={styles.sectionTitle}>Contratista</h2>
        <Combobox
          options={terceroOpciones}
          value={form.terceroId || ''}
          onChange={(id) => setForm({ ...form, terceroId: id })}
          placeholder="Buscar contratista aprobado..."
          emptyMessage="Sin contratistas que coincidan."
          invalid={Boolean(errores.terceroId)}
        />
        {errores.terceroId && <p style={{ color: 'var(--color-danger-ink)', fontSize: 'var(--text-data-size)' }}>{errores.terceroId}</p>}

        {tratarComoContrato && (
          <div>
            <p style={{ fontSize: 'var(--text-label-size)', fontWeight: 600, margin: 'var(--space-sm) 0 6px' }}>Tipo de contrato</p>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              {/* Pedido explícito del usuario: "en los contratos directos no
                  existen los contratos de tipo Diseño" -- Diseño solo aplica
                  a Indirecta. Esta sección ahora también se muestra para
                  Orden de Servicio en Directa (`tratarComoContrato`).
                  2026-09-21: Directa ya no tiene un solo tipo -- el radio
                  itera los 6 (`TODO_COSTO`,
                  `SUMINISTRO_MATERIALES`/`MANO_OBRA`/`SERVICIOS`/
                  `TRANSPORTE`/`ALQUILER`); igual exige clic explícito. Los
                  códigos vienen de tiposContratoDisponibles (arriba). */}
              {tiposContratoDisponibles.map((opt) => (
                <label key={opt} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="radio" checked={form.tipoContrato === opt} onChange={() => setForm({ ...form, tipoContrato: opt })} />
                  {tipoContratoLabel(opt)}
                </label>
              ))}
            </div>
            {errores.tipoContrato && <p style={{ color: 'var(--color-danger-ink)', fontSize: 'var(--text-data-size)' }}>{errores.tipoContrato}</p>}
          </div>
        )}
      </div>

      <div id="sec-info" className={styles.section}>
        <h2 className={styles.sectionTitle}>Información del formulario</h2>
        <Field label="Objeto" required error={errores.descripcionActividad} helper="Mínimo 50 caracteres">
          {(p) => <Textarea {...p} rows={2} value={form.descripcionActividad} onChange={(e) => setForm({ ...form, descripcionActividad: e.target.value })} />}
        </Field>
        <div className={styles.fieldRow}>
          <Field className="fieldMd" label="Plazo de ejecución" required error={errores.plazoEjecucion}>
            {(p) => <TextInput {...p} value={form.plazoEjecucion} onChange={(e) => setForm({ ...form, plazoEjecucion: e.target.value })} placeholder="Ej: 25 días calendario a partir del anticipo" />}
          </Field>
          {/* `rows={1}` a propósito -- mismo alto que "Plazo de ejecución"
              de al lado (pedido explícito), crece solo si el texto no
              entra en una línea (ver Field.jsx#Textarea, auto-crecimiento
              sin resize manual). */}
          <Field className="fieldLg" label="Forma de pago" required error={errores.formaPago}>
            {(p) => <Textarea {...p} rows={1} value={form.formaPago} onChange={(e) => setForm({ ...form, formaPago: e.target.value })} placeholder="Ej: 50% anticipo, 50% a la entrega" />}
          </Field>
        </div>
      </div>

      <div id="sec-docs" className={styles.section}>
        <h2 className={styles.sectionTitle}>Documentos requeridos</h2>
        <Field label="Cotización" required error={errores.archivoCotizacion}>
          {(p) => <FileField {...p} accept=".pdf" value={form.archivoCotizacion} onChange={(url) => setForm({ ...form, archivoCotizacion: url })} />}
        </Field>
        {form.tipoContrato === 'DISENO' && (
          <Field label="PreBEP (Plan preliminar de ejecución BIM)" required error={errores.archivoPreBEP}>
            {(p) => <FileField {...p} accept=".pdf" value={form.archivoPreBEP} onChange={(url) => setForm({ ...form, archivoPreBEP: url })} />}
          </Field>
        )}
      </div>

      <div id="sec-cuadro" className={styles.section}>
        <h2 className={styles.sectionTitle}>Cuadro Comparativo</h2>
        {/* "En Directos no se puede agregar más de un proveedor, debe ser
            uno y debe ser el tercero que se seleccione, que se coloque
            automáticamente" -- pedido explícito del usuario. Acotado a
            DIRECTA: en Indirecta el Cuadro Comparativo sigue admitiendo
            varios proveedores/cotizaciones, sin cambios. */}
        <CuadroComparativoBuilder
          value={cuadroComparativo}
          onChange={setCuadroComparativo}
          proveedorUnico={categoriaEfectiva === 'DIRECTA'}
          nombreProveedorUnico={terceroSeleccionado?.razonSocial ?? ''}
        />
        {errores.cuadroComparativo && <p style={{ color: 'var(--color-danger-ink)', fontSize: 'var(--text-data-size)' }}>{errores.cuadroComparativo}</p>}
      </div>

      {/* Solo Solicitudes Directas por ahora (pedido explícito del
          usuario) -- opcional, no bloquea Enviar. */}
      {categoriaEfectiva === 'DIRECTA' && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Memoria</h2>
          <MemoriaBuilder value={memoria} onChange={setMemoria} />
        </div>
      )}

      {/* "Valor final (IVA incluido)" se quita del FORMULARIO (pedido
          explícito del usuario, 2026-09-21 -- "consume espacio", ya es
          automático desde el Cuadro Comparativo de arriba, no hace falta
          mostrarlo dos veces acá). El cálculo (costoTotalCuadro más arriba)
          y el guardado en `form.valorFinal`/`valorEnLetras` NO se tocan --
          el detalle de la solicitud (SolicitudDetallePage.jsx) lo sigue
          mostrando exactamente igual que antes, sin cambios ahí. */}

      <div id="sec-asunto" className={styles.section}>
        <h2 className={styles.sectionTitle}>Asunto</h2>
        <Field label="Asunto" required error={errores.asunto} helper="Se autogenera al cambiar frente/contratista/descripción; puedes editarlo.">
          {(p) => <Textarea {...p} rows={2} value={form.asunto} onChange={(e) => { setAsuntoTocado(true); setForm({ ...form, asunto: e.target.value }); }} />}
        </Field>
      </div>

      {/* "Formato de Solicitud" -- restaurado tal cual se veía en la app
          original (ver CLAUDE.md 2026-09-09), reemplaza a lo que era
          "Detalle adicional (opcional)" acá. Resumen de solo lectura
          (Área/frente, Solicitante, Proyecto, Tipo, Contratante, Datos del
          contratista, Objeto) + los 3 campos SÍ editables (Alcance/
          Términos de referencia/Condiciones especiales, ahora con el mismo
          texto de ejemplo que traía el original). Nombre/NIT del
          contratante siguen siendo el mismo valor fijo de siempre
          (CONTRATANTE_NOMBRE/CONTRATANTE_NIT) -- acá solo se hacen
          visibles (de solo lectura), no editables, pedido explícito del
          usuario de no cambiar ese comportamiento. */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Formato de Solicitud
          <Badge variant="info">Opcional</Badge>
        </h2>

        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Área / frente</span>
            <span className={styles.infoValue}>{frentesSeleccionados.map((f) => f.nombre).join(', ') || '—'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Solicitante</span>
            <span className={styles.infoValue}>
              {usuario.nombre}
              {usuario.cargo && <><br /><span style={{ fontSize: 'var(--text-label-size)', color: 'var(--color-ink-muted)' }}>{usuario.cargo}</span></>}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Proyecto</span>
            <span className={styles.infoValue}>{frentesSeleccionados[0]?.proyecto?.nombre || '—'}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Tipo</span>
            <span className={styles.infoValue}>{tratarComoContrato && form.tipoContrato ? tipoContratoLabel(form.tipoContrato) : '—'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <Field className="fieldMd" label="Nombre del contratante">
            {(p) => <TextInput {...p} value={CONTRATANTE_NOMBRE} disabled />}
          </Field>
          <Field className="fieldMd" label="NIT del contratante">
            {(p) => <TextInput {...p} value={CONTRATANTE_NIT} disabled />}
          </Field>
        </div>

        {terceroSeleccionado && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontWeight: 600, margin: 0, fontSize: 'var(--text-body-size)' }}>Datos del contratista</p>
              <Link to={`/terceros/${terceroSeleccionado.id}`} target="_blank" rel="noreferrer" style={{ fontSize: 'var(--text-data-size)', color: 'var(--color-primary)' }}>
                Editar datos
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-sm) var(--space-lg)', fontSize: 'var(--text-data-size)' }}>
              {CAMPOS_CONTRATISTA.map(([label, campo]) => (
                <p key={campo} style={{ margin: 0 }}>
                  <strong>{label}:</strong> {terceroSeleccionado[campo] || <em style={{ color: 'var(--color-ink-muted)' }}>Sin información</em>}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* rows={2} + de a 2 por fila (pedido explícito) -- crecen solos
            si el contenido no entra en 2 líneas (Field.jsx#Textarea). */}
        <div className={styles.fieldRow}>
          <Field className="fieldMd" label="Objeto" helper="Se completa automáticamente con el Objeto de arriba.">
            {(p) => <Textarea {...p} rows={2} value={form.descripcionActividad} disabled placeholder="Se completará con el objeto." />}
          </Field>
          <Field className="fieldMd" label="Alcance">
            {(p) => <Textarea {...p} rows={2} value={form.alcance} onChange={(e) => setForm({ ...form, alcance: e.target.value })} placeholder={PLACEHOLDER_ALCANCE} />}
          </Field>
        </div>
        {/* "No aplica en directos" -- pedido explícito del usuario
            (2026-09-21). Solo Indirecta las muestra; buildPayload() ya
            fuerza `null` para Directa. */}
        {categoriaEfectiva === 'INDIRECTA' && (
          <div className={styles.fieldRow}>
            <Field className="fieldMd" label="Términos de referencia">
              {(p) => <Textarea {...p} rows={2} value={form.terminosReferencia} onChange={(e) => setForm({ ...form, terminosReferencia: e.target.value })} placeholder={PLACEHOLDER_TERMINOS} />}
            </Field>
            <Field className="fieldMd" label="Condiciones especiales">
              {(p) => <Textarea {...p} rows={2} value={form.condicionesEspeciales} onChange={(e) => setForm({ ...form, condicionesEspeciales: e.target.value })} placeholder={PLACEHOLDER_CONDICIONES} />}
            </Field>
          </div>
        )}
      </div>

      {/* "Cronograma no aplica en directos" -- pedido explícito del usuario
          (2026-09-21). El "Plazo de entrega" del PDF de Orden de Servicio ya
          cae a `plazo_ejecucion` (texto libre, siempre obligatorio) cuando
          no hay cronograma -- ver ordenServicio.js. */}
      {categoriaEfectiva === 'INDIRECTA' && (
        <div id="sec-cronograma" className={styles.section}>
          <h2 className={styles.sectionTitle}>Cronograma</h2>
          <CronogramaBuilder value={cronograma} onChange={(data) => { setCronograma(data); setCronogramaError(''); }} minDays={tipoSolicitud === 'ORDEN_SERVICIO' ? 2 : 13} />
          {cronogramaError && <p style={{ color: 'var(--color-danger-ink)', fontSize: 'var(--text-data-size)' }}>{cronogramaError}</p>}
        </div>
      )}

      {/* "Debajo del todo" -- pedido explícito del usuario (2026-09-28),
          última sección del formulario antes de los botones. Para importar
          de una vez el historial de modificaciones de un contrato viejo, sin
          tener que repetir el flujo de /solicitudes/importar-historico
          (Otrosí de un contrato existente) uno por uno después. Cada fila se
          crea recién al hacer clic en "Importar" (ver guardar() más arriba)
          -- un otrosí histórico exige un padre ya COMPLETADA, que este
          contrato todavía no es mientras sigue en borrador. */}
      {permiteOtrosisHistoricos && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Otrosís históricos</h2>
          <p style={{ margin: '-4px 0 6px', fontSize: 'var(--text-label-size)', color: 'var(--color-ink-muted)' }}>
            Si este contrato tuvo otrosís antes de este sistema, agrégalos acá -- se importan junto con el contrato al hacer clic en "Importar". Si no tuvo ninguno, dejalo vacío.
          </p>
          <OtrosisHistoricosBuilder value={otrosisHistoricos} onChange={setOtrosisHistoricos} />
          {otrosisHistoricosError && <p style={{ color: 'var(--color-danger-ink)', fontSize: 'var(--text-data-size)', marginTop: 8 }}>{otrosisHistoricosError}</p>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-lg)' }}>
        {esHistorico ? (
          // Un histórico siempre ofrece las dos acciones, tanto al crear
          // como al volver a editar un borrador ya guardado -- "Importar"
          // es el equivalente a "Enviar", pero salta directo a COMPLETADA
          // (completarHistorico(), ver guardar() más arriba).
          <>
            <Button type="button" variant="secondary" onClick={() => guardar(false)} disabled={guardando != null}>
              {guardando === 'borrador' ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar borrador'}
            </Button>
            <Button type="button" onClick={() => guardar(true)} disabled={guardando != null}>
              {guardando === 'importar' ? 'Importando…' : 'Importar'}
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant={isEdit ? 'primary' : 'secondary'} onClick={() => guardar(false)} disabled={guardando != null}>
              {guardando === 'borrador' ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar borrador'}
            </Button>
            {!isEdit && (
              <Button type="button" onClick={() => guardar(true)} disabled={guardando != null}>
                {guardando === 'enviar' ? 'Enviando…' : 'Guardar y enviar'}
              </Button>
            )}
          </>
        )}
      </div>
      </div>

      <aside className={f.aside} aria-label="Avance del formulario">
        <div className={f.card}>
          <div className={f.cardHead}>
            <h2 className={f.cardTitle}>{esHistorico ? 'Para importar' : 'Para enviar'}</h2>
            <span className={f.contador}>{completados}/{requisitosEnvio.length}</span>
          </div>
          <div className={f.barra} aria-hidden="true">
            <div className={f.barraRelleno} style={{ width: `${Math.round((completados / requisitosEnvio.length) * 100)}%` }} />
          </div>
          <p className={f.ayuda}>Para guardar un borrador solo hace falta el frente.</p>
          <ul className={f.lista}>
            {requisitosEnvio.map((r) => (
              <li key={r.label}>
                <button type="button" className={f.item} onClick={() => irA(r.ancla)}>
                  {r.ok ? <CheckCircle2 size={16} className={f.ok} aria-hidden="true" /> : <Circle size={16} className={f.falta} aria-hidden="true" />}
                  <span className={r.ok ? f.itemOk : ''}>{r.label}</span>
                  {!r.ok && r.detalle && <span className={f.detalle}>{r.detalle}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={f.card}>
          <h2 className={f.cardTitle}>Resumen</h2>
          <dl className={f.resumen}>
            <div><dt>Contratista</dt><dd>{terceroSeleccionado?.razonSocial ?? '—'}</dd></div>
            <div><dt>Frente(s)</dt><dd>{frentesSeleccionados.map((fr) => fr.nombre).join(', ') || '—'}</dd></div>
            <div><dt>Valor (IVA incluido)</dt><dd>{costoTotalCuadro > 0 ? formatCurrency(Math.round(costoTotalCuadro)) : '—'}</dd></div>
          </dl>
        </div>
      </aside>
      </div>
    </div>
  );
}

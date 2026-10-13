// Puerto de otrosiForm.tsx -- selecciona un contrato/orden COMPLETADA como
// padre, precarga el cronograma del "baseline" vigente (el otrosí completado
// más reciente, o el padre mismo si no tiene otrosís) para que el usuario lo
// ajuste, y bloquea la creación si ese baseline ya venció -- el backend
// (`solicitud.service.js#crearOtrosi`) vuelve a validar todo esto de verdad,
// acá es solo para no dejar clickear un padre inválido.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listSolicitudes, getSolicitud, createSolicitud, guardarCronograma } from '../../api/solicitudes.js';
import { numeroALetras, formatCurrency, categoriaSlug } from '../../utils/solicitudes.js';
import { CronogramaBuilder } from './CronogramaBuilder.jsx';
import { BackLink } from '../../components/ui/BackLink.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, TextInput } from '../../components/ui/Field.jsx';
import styles from './Solicitudes.module.css';
import f from './Formulario.module.css';

const CRONOGRAMA_VACIO = { tieneFases: false, fechaInicio: '', fechaFin: '', fases: [], actividades: [{ descripcion: '', fechaInicio: '', fechaFin: '' }] };

// Entre los otrosís COMPLETADOS de un mismo padre, cuál es la línea base
// vigente -- mismo criterio que solicitud.otrosi.js#pickMostRecentOtrosi
// (mayor numeroOtrosi gana, creadoEn solo desempata).
function elegirBaseline(detallePadre) {
  const completados = (detallePadre.otrosis ?? []).filter((o) => o.estado === 'COMPLETADA');
  if (completados.length === 0) return detallePadre;
  return [...completados].sort((a, b) => {
    const an = a.numeroOtrosi ?? -1;
    const bn = b.numeroOtrosi ?? -1;
    if (an !== bn) return bn - an;
    return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime();
  })[0];
}

export function OtrosiForm({ tipo, categoria }) {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [padre, setPadre] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [nuevoValor, setNuevoValor] = useState('');
  const [cronograma, setCronograma] = useState(CRONOGRAMA_VACIO);
  const [cronogramaError, setCronogramaError] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    listSolicitudes({ estado: 'COMPLETADA', categoria }).then((res) => setSolicitudes(res.data));
  }, [categoria]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return solicitudes.filter((s) => {
      if (s.tipo === 'ORDEN_SERVICIO') return false;
      if (!q) return true;
      return s.consecutivo.toLowerCase().includes(q) || (s.tercero?.razonSocial ?? '').toLowerCase().includes(q);
    });
  }, [solicitudes, busqueda]);

  async function seleccionarPadre(row) {
    setCargandoDetalle(true);
    setError(null);
    try {
      const res = await getSolicitud(row.id);
      const detalle = res.data;
      // ANULADA cuenta como "ya no está activo" -- mismo criterio que
      // solicitud.service.js#crearOtrosi (backend), un otrosí anulado no
      // debe bloquear crear uno nuevo sobre el mismo contrato.
      const activo = (detalle.otrosis ?? []).find((o) => !['COMPLETADA', 'ANULADA'].includes(o.estado));
      if (activo) {
        setError(`Este contrato ya tiene un otrosí activo (${activo.consecutivo}). Debe completarse antes de crear uno nuevo.`);
        return;
      }

      const baseline = elegirBaseline(detalle);
      const fechaFinBaseline = baseline.cronograma?.fechaFin;
      if (fechaFinBaseline) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaFin = new Date(fechaFinBaseline);
        fechaFin.setHours(0, 0, 0, 0);
        if (hoy >= fechaFin) {
          setError(`No se puede crear el otrosí. El contrato venció el ${fechaFin.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}.`);
          return;
        }
      }

      setPadre(detalle);
      setCronograma(
        baseline.cronograma
          ? { tieneFases: baseline.cronograma.tieneFases, fechaInicio: baseline.cronograma.fechaInicio, fechaFin: baseline.cronograma.fechaFin, fases: baseline.cronograma.fases, actividades: baseline.cronograma.actividades.length > 0 ? baseline.cronograma.actividades : CRONOGRAMA_VACIO.actividades }
          : CRONOGRAMA_VACIO
      );
      if (tipo === 'OTROSI_TIEMPO_CANTIDAD') setNuevoValor(String(baseline.valorFinal ?? detalle.valorFinal ?? ''));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargandoDetalle(false);
    }
  }

  function validarCronograma() {
    if (!cronograma.actividades.some((a) => a.descripcion.trim().length > 0)) {
      setCronogramaError('Debes registrar al menos una actividad en el cronograma.');
      return false;
    }
    setCronogramaError('');
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!padre) return;
    if (!validarCronograma()) return;
    setError(null);
    setEnviando(true);
    try {
      const payload = { tipo, categoria: padre.categoria, solicitudPadreId: padre.id };
      if (tipo === 'OTROSI_TIEMPO_CANTIDAD' && nuevoValor) {
        payload.valorFinal = Number(nuevoValor);
        payload.valorEnLetras = numeroALetras(Number(nuevoValor));
      }
      const res = await createSolicitud(payload);
      if (cronograma.fechaInicio && cronograma.fechaFin) {
        await guardarCronograma(res.data.id, cronograma);
      }
      navigate(`/solicitudes/${res.data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <BackLink to={`/solicitudes-${categoriaSlug(categoria)}`}>Solicitudes</BackLink>
      <h1 className={styles.title}>{tipo === 'OTROSI_TIEMPO_CANTIDAD' ? 'Otrosí — Tiempo, Cantidad y/o Modificación' : 'Otrosí — Por Tiempo'}</h1>

      <ol className={f.pasos} aria-label="Pasos">
        <li className={`${f.paso} ${!padre ? f.pasoActivo : f.pasoHecho}`}><span className={f.pasoNum}>1</span> Contrato a modificar</li>
        <li className={`${f.paso} ${padre ? f.pasoActivo : ''}`}><span className={f.pasoNum}>2</span> Confirmar y crear</li>
      </ol>

      {error && <p className={styles.errorBanner}>{error}</p>}

      {!padre ? (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Selecciona el contrato/orden a modificar</h2>
          <input className={styles.searchBar} type="text" placeholder="Buscar por consecutivo o contratista..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <div className={styles.card}>
            <table className={styles.table}>
              <thead>
                <tr><th>Consecutivo</th><th>Contratista</th><th>Valor</th></tr>
              </thead>
              <tbody>
                {filtrados.map((s) => (
                  <tr key={s.id} style={{ cursor: cargandoDetalle ? 'wait' : 'pointer' }} onClick={() => !cargandoDetalle && seleccionarPadre(s)}>
                    <td style={{ fontFamily: 'monospace' }}>{s.consecutivo}</td>
                    <td>{s.tercero?.razonSocial ?? '—'}</td>
                    <td>{s.valorFinal ? formatCurrency(s.valorFinal) : '—'}</td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr><td colSpan={3} className={styles.emptyState}>Sin contratos completados que coincidan. Solo los contratos completados admiten otrosí; las órdenes de servicio no.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <form className={styles.section} onSubmit={handleSubmit}>
          <h2 className={styles.sectionTitle}>2. Confirmar</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}><span className={styles.infoLabel}>Contrato base</span><span className={styles.infoValue} style={{ fontFamily: 'monospace' }}>{padre.consecutivo}</span></div>
            <div className={styles.infoItem}><span className={styles.infoLabel}>Contratista</span><span className={styles.infoValue}>{padre.tercero?.razonSocial}</span></div>
            {padre.valorFinal ? <div className={styles.infoItem}><span className={styles.infoLabel}>Valor actual</span><span className={styles.infoValue}>{formatCurrency(padre.valorFinal)}</span></div> : null}
          </div>
          {tipo === 'OTROSI_TIEMPO_CANTIDAD' && (
            <Field label="Nuevo valor final (COP)" helper="Déjalo igual si el otrosí solo modifica tiempo, no valor">
              {(p) => <TextInput {...p} inputMode="numeric" value={nuevoValor} onChange={(e) => setNuevoValor(e.target.value.replace(/\D/g, ''))} />}
            </Field>
          )}

          <div>
            <p style={{ fontSize: 'var(--text-body-size)', fontWeight: 600, margin: '0 0 8px' }}>Cronograma {tipo === 'OTROSI_TIEMPO' ? '(ajusta la nueva fecha de fin)' : ''}</p>
            <CronogramaBuilder value={cronograma} onChange={(data) => { setCronograma(data); setCronogramaError(''); }} minDays={2} />
            {cronogramaError && <p style={{ color: 'var(--color-danger-ink)', fontSize: 'var(--text-data-size)', marginTop: 8 }}>{cronogramaError}</p>}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <Button type="button" variant="secondary" onClick={() => setPadre(null)} disabled={enviando}>Elegir otro</Button>
            <Button type="submit" disabled={enviando}>{enviando ? 'Creando…' : 'Crear otrosí'}</Button>
          </div>
        </form>
      )}
    </div>
  );
}

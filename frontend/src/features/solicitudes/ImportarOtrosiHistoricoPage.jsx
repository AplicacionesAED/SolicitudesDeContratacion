// Puerto de importarHistoricoForm.tsx -- registra un otrosí o un trámite
// viejo (Cuenta, Facturas, etc. -- sin formulario propio, nunca tuvieron un
// wizard como Contrato/Orden de Servicio) anterior a este sistema, ya
// completado. `valorEnLetras` se calcula acá mismo (frontend) y viaja en el
// payload -- el backend nunca recalcula ese valor, mismo criterio que
// SolicitudForm.jsx/OtrosiForm.jsx (ver el comentario en
// solicitud.importarHistorico.js).
//
// 2026-09-25, pedido explícito del usuario: importar un Contrato/Orden de
// Servicio histórico se movió a ImportarHistoricoPage.jsx (formulario
// completo, entrada categoria-aware desde Directas/Indirectas, mismo patrón
// que "Nueva solicitud") -- esta pantalla se queda con lo que NO tiene un
// formulario "normal" equivalente en la app (Otrosí histórico, Trámite
// viejo), sigue viviendo en /solicitudes/importar-historico, enlazada desde
// OtrosiForm.jsx, y sigue preguntando Directa/Indirecta acá (no tiene una
// entrada categoria-scoped propia).
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { listFrentes } from '../../api/frentes.js';
import { listTerceros } from '../../api/terceros.js';
import { listSolicitudes, importarHistorico } from '../../api/solicitudes.js';
import { numeroALetras, TIPO_SOLICITUD_LABELS, categoriaSlug } from '../../utils/solicitudes.js';
import { BackLink } from '../../components/ui/BackLink.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, TextInput, Select } from '../../components/ui/Field.jsx';
import styles from './Solicitudes.module.css';

const TIPOS_CONTRATO = ['TRAMITE_CUENTA', 'TRAMITE_FACTURAS', 'TRAMITE_CUENTAS_RECURRENTES', 'TRAMITE_CUENTAS_OCASIONALES', 'TRAMITE_BONIFICACIONES_COMISIONES'];
const TIPOS_OTROSI = ['OTROSI_TIEMPO', 'OTROSI_TIEMPO_CANTIDAD'];

export function ImportarOtrosiHistoricoPage() {
  const navigate = useNavigate();

  const [categoria, setCategoria] = useState('');
  const [modo, setModo] = useState('OTROSI');
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [valorFinal, setValorFinal] = useState('');

  // Modo TRAMITE
  const [tipoContrato, setTipoContrato] = useState('');
  const [frentes, setFrentes] = useState([]);
  const [frenteId, setFrenteId] = useState('');
  const [terceros, setTerceros] = useState([]);
  const [terceroId, setTerceroId] = useState('');

  // Modo OTROSI
  const [tipoOtrosi, setTipoOtrosi] = useState('OTROSI_TIEMPO');
  const [padres, setPadres] = useState([]);
  const [cargandoPadres, setCargandoPadres] = useState(true);
  const [padreBusqueda, setPadreBusqueda] = useState('');
  const [padreSeleccionado, setPadreSeleccionado] = useState(null);
  const [numeroOtrosi, setNumeroOtrosi] = useState('');

  useEffect(() => {
    listFrentes().then((res) => setFrentes(res.data)).catch(() => setFrentes([]));
    listTerceros(true).then((res) => setTerceros(res.data)).catch(() => setTerceros([]));
  }, []);

  // El buscador de "contrato base" solo tiene sentido una vez elegida la
  // categoría -- filtra en el servidor por esa categoría, igual que
  // OtrosiForm.jsx, para no mezclar contratos directos e indirectos.
  useEffect(() => {
    if (!categoria) {
      setPadres([]);
      return;
    }
    setCargandoPadres(true);
    setPadreSeleccionado(null);
    listSolicitudes({ estado: 'COMPLETADA', categoria })
      .then((res) => setPadres(res.data.filter((s) => s.tipo !== 'ORDEN_SERVICIO')))
      .catch(() => setPadres([]))
      .finally(() => setCargandoPadres(false));
  }, [categoria]);

  const padresFiltrados = useMemo(() => {
    const q = padreBusqueda.trim().toLowerCase();
    if (!q) return padres;
    return padres.filter((p) => p.consecutivo.toLowerCase().includes(q) || (p.tercero?.razonSocial ?? '').toLowerCase().includes(q));
  }, [padres, padreBusqueda]);

  function validar() {
    const nuevos = {};
    if (!categoria) nuevos.categoria = 'Selecciona la categoría.';
    if (!fechaInicio) nuevos.fechaInicio = 'La fecha de inicio es obligatoria.';
    if (!fechaFin) nuevos.fechaFin = 'La fecha de fin es obligatoria.';
    if (fechaInicio && fechaFin && new Date(fechaFin) <= new Date(fechaInicio)) nuevos.fechaFin = 'La fecha de fin debe ser posterior a la de inicio.';

    if (modo === 'CONTRATO') {
      if (!tipoContrato) nuevos.tipoContrato = 'Selecciona el tipo.';
      if (!frenteId) nuevos.frenteId = 'Selecciona el frente.';
      if (!terceroId) nuevos.terceroId = 'Selecciona el tercero.';
    } else {
      if (!padreSeleccionado) nuevos.padreSeleccionado = 'Selecciona el contrato al que pertenece.';
      const n = Number(numeroOtrosi);
      if (!numeroOtrosi || !Number.isInteger(n) || n <= 0) nuevos.numeroOtrosi = 'Ingresa un número entero de otrosí válido.';
      if (tipoOtrosi === 'OTROSI_TIEMPO_CANTIDAD' && !valorFinal) nuevos.valorFinal = 'Ingresa el nuevo valor del contrato.';
    }

    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validar()) return;
    setEnviando(true);
    setError(null);
    try {
      const body =
        modo === 'CONTRATO'
          ? {
              modo,
              categoria,
              tipo: tipoContrato,
              terceroId: Number(terceroId),
              proyectoId: frentes.find((f) => f.id === Number(frenteId))?.proyecto_id,
              frentesIds: [Number(frenteId)],
              valorFinal: valorFinal ? Number(valorFinal) : null,
              valorEnLetras: valorFinal ? numeroALetras(Number(valorFinal)) : null,
              fechaInicio,
              fechaFin,
            }
          : {
              modo,
              categoria,
              tipo: tipoOtrosi,
              solicitudPadreId: padreSeleccionado.id,
              numeroOtrosi: Number(numeroOtrosi),
              valorFinal: valorFinal ? Number(valorFinal) : null,
              valorEnLetras: valorFinal ? numeroALetras(Number(valorFinal)) : null,
              fechaInicio,
              fechaFin,
            };

      const res = await importarHistorico(body);
      navigate(`/solicitudes/${res.data.id}`);
    } catch (err) {
      setError(err.message ?? 'Error al importar el registro histórico');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <BackLink to={categoria ? `/solicitudes-${categoriaSlug(categoria)}` : '/'}>Solicitudes</BackLink>
      <div>
        <h1 className={styles.title}>Importar otrosí o trámite histórico</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--color-ink-muted)' }}>
          Registra un otrosí de un contrato que ya existe en el sistema, o un trámite anterior a este sistema (Cuenta, Facturas, etc.), ya completado.
        </p>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>¿Directa o indirecta?</h2>
        <div className={styles.tipoPicker}>
          <button type="button" className={styles.tipoCard} style={categoria === 'DIRECTA' ? { borderColor: 'var(--color-primary)', background: 'var(--color-surface-sunken)' } : undefined} onClick={() => setCategoria('DIRECTA')}>
            <span className={styles.tipoCardTitle}>Directa</span>
          </button>
          <button type="button" className={styles.tipoCard} style={categoria === 'INDIRECTA' ? { borderColor: 'var(--color-primary)', background: 'var(--color-surface-sunken)' } : undefined} onClick={() => setCategoria('INDIRECTA')}>
            <span className={styles.tipoCardTitle}>Indirecta</span>
          </button>
        </div>
        {errores.categoria && <p style={{ color: 'var(--color-danger-ink)', fontSize: 'var(--text-data-size)', marginTop: 4 }}>{errores.categoria}</p>}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>¿Qué vas a importar?</h2>
        <div className={styles.tipoPicker}>
          <button type="button" className={styles.tipoCard} style={modo === 'OTROSI' ? { borderColor: 'var(--color-primary)', background: 'var(--color-surface-sunken)' } : undefined} onClick={() => setModo('OTROSI')}>
            <span className={styles.tipoCardTitle}>Un otrosí de un contrato existente</span>
            <span className={styles.tipoCardDesc}>El contrato ya está en el sistema (nativo o importado).</span>
          </button>
          <button type="button" className={styles.tipoCard} style={modo === 'CONTRATO' ? { borderColor: 'var(--color-primary)', background: 'var(--color-surface-sunken)' } : undefined} onClick={() => setModo('CONTRATO')}>
            <span className={styles.tipoCardTitle}>Un trámite original</span>
            <span className={styles.tipoCardDesc}>Trámite de cuenta, facturas u otro trámite sin formulario propio.</span>
          </button>
        </div>
      </div>

      {modo === 'CONTRATO' ? (
        <form className={styles.section} onSubmit={handleSubmit}>
          <Field label="Tipo" required error={errores.tipoContrato}>
            {(p) => (
              <Select {...p} value={tipoContrato} onChange={(e) => setTipoContrato(e.target.value)}>
                <option value="">Selecciona un tipo</option>
                {TIPOS_CONTRATO.map((t) => (
                  <option key={t} value={t}>{TIPO_SOLICITUD_LABELS[t] ?? t}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Frente" required error={errores.frenteId}>
            {(p) => (
              <Select {...p} value={frenteId} onChange={(e) => setFrenteId(e.target.value)}>
                <option value="">Selecciona un frente</option>
                {frentes.map((f) => (
                  <option key={f.id} value={f.id}>{f.nombre} — {f.proyecto?.nombre}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Tercero" required error={errores.terceroId}>
            {(p) => (
              <Select {...p} value={terceroId} onChange={(e) => setTerceroId(e.target.value)}>
                <option value="">Selecciona un tercero</option>
                {terceros.map((t) => (
                  <option key={t.id} value={t.id}>{t.razonSocial} — {t.nit}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Valor final (COP)">
            {(p) => <TextInput {...p} inputMode="numeric" value={valorFinal} onChange={(e) => setValorFinal(e.target.value.replace(/\D/g, ''))} />}
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <Field label="Fecha de inicio" required error={errores.fechaInicio}>
              {(p) => <TextInput {...p} type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />}
            </Field>
            <Field label="Fecha de fin" required error={errores.fechaFin}>
              {(p) => <TextInput {...p} type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />}
            </Field>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-lg)' }}>
            <Button type="button" variant="secondary" disabled={enviando} onClick={() => navigate(categoria ? `/solicitudes-${categoriaSlug(categoria)}` : '/')}>Cancelar</Button>
            <Button type="submit" disabled={enviando}>{enviando ? 'Importando…' : 'Importar'}</Button>
          </div>
        </form>
      ) : (
        <form className={styles.section} onSubmit={handleSubmit}>
          <div>
            <p style={{ fontSize: 'var(--text-label-size)', fontWeight: 600, margin: '0 0 6px' }}>Contrato base <span style={{ color: 'var(--color-danger-ink)' }}>*</span></p>
            {padreSeleccionado ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', background: 'var(--color-surface-sunken)' }}>
                <div>
                  <p style={{ margin: 0, fontFamily: 'monospace', fontWeight: 600 }}>{padreSeleccionado.consecutivo}</p>
                  <p style={{ margin: 0, fontSize: 'var(--text-label-size)', color: 'var(--color-ink-muted)' }}>{padreSeleccionado.tercero?.razonSocial ?? '—'}</p>
                </div>
                <button type="button" onClick={() => setPadreSeleccionado(null)} style={{ border: 'none', background: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 'var(--text-label-size)' }}>Cambiar</button>
              </div>
            ) : (
              <div className={styles.card}>
                <div style={{ padding: 8, borderBottom: '1px solid var(--color-border)', position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ink-muted)' }} />
                  <input type="text" className={styles.searchBar} style={{ width: '100%', paddingLeft: 30 }} placeholder="Buscar por consecutivo o tercero..." value={padreBusqueda} onChange={(e) => setPadreBusqueda(e.target.value)} />
                </div>
                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {cargandoPadres ? (
                    <p className={styles.emptyState}>Cargando…</p>
                  ) : padresFiltrados.length === 0 ? (
                    <p className={styles.emptyState}>No hay contratos completados disponibles.</p>
                  ) : (
                    padresFiltrados.map((p) => (
                      <div key={p.id} onClick={() => setPadreSeleccionado(p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary)' }}>{p.consecutivo}</span>
                        <span style={{ fontSize: 'var(--text-label-size)', color: 'var(--color-ink-muted)' }}>{p.tercero?.razonSocial ?? '—'}</span>
                        <ChevronRight size={14} style={{ color: 'var(--color-ink-muted)' }} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {errores.padreSeleccionado && <p style={{ color: 'var(--color-danger-ink)', fontSize: 'var(--text-data-size)', marginTop: 4 }}>{errores.padreSeleccionado}</p>}
          </div>

          <Field label="Tipo de otrosí" required>
            {(p) => (
              <Select {...p} value={tipoOtrosi} onChange={(e) => setTipoOtrosi(e.target.value)}>
                {TIPOS_OTROSI.map((t) => (
                  <option key={t} value={t}>{TIPO_SOLICITUD_LABELS[t] ?? t}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Número de otrosí" required error={errores.numeroOtrosi} helper="Ej. 4">
            {(p) => <TextInput {...p} inputMode="numeric" value={numeroOtrosi} onChange={(e) => setNumeroOtrosi(e.target.value.replace(/\D/g, ''))} />}
          </Field>
          {tipoOtrosi === 'OTROSI_TIEMPO_CANTIDAD' && (
            <Field label="Nuevo valor del contrato (COP)" required error={errores.valorFinal}>
              {(p) => <TextInput {...p} inputMode="numeric" value={valorFinal} onChange={(e) => setValorFinal(e.target.value.replace(/\D/g, ''))} />}
            </Field>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <Field label="Fecha de inicio" required error={errores.fechaInicio}>
              {(p) => <TextInput {...p} type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />}
            </Field>
            <Field label="Fecha de fin" required error={errores.fechaFin}>
              {(p) => <TextInput {...p} type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />}
            </Field>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-lg)' }}>
            <Button type="button" variant="secondary" disabled={enviando} onClick={() => navigate(categoria ? `/solicitudes-${categoriaSlug(categoria)}` : '/')}>Cancelar</Button>
            <Button type="submit" disabled={enviando}>{enviando ? 'Importando…' : 'Importar'}</Button>
          </div>
        </form>
      )}
    </div>
  );
}

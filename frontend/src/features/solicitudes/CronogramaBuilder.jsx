// Puerto literal de cronogramaBuilder.tsx -- OJO: el original SOLO edita
// `actividades` (esta tabla), nunca `fases` -- un cronograma con `tieneFases:
// true` heredado de un baseline de otrosí (ver OtrosiForm.jsx) se guarda y
// exporta correctamente, pero este componente no tiene UI para crear ni ver
// fases nuevas. Es una limitación real del original, portada tal cual, no
// arreglada acá.
import { Plus, Trash2, CalendarDays } from 'lucide-react';
import { countBusinessDays, getMinStartDate } from '../../utils/holidays.js';
import { Button } from '../../components/ui/Button.jsx';
import { Field, TextInput } from '../../components/ui/Field.jsx';
import styles from './Solicitudes.module.css';

function toInputDate(date) {
  return date.toISOString().split('T')[0];
}

function emptyActividad() {
  return { descripcion: '', fechaInicio: '', fechaFin: '' };
}

function formatDisplayDate(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

function calcDuration(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  if (e <= s) return 0;
  return countBusinessDays(s, e);
}

function ActividadesTable({ actividades, onChange, minDate, maxDate }) {
  function updateRow(idx, field, val) {
    onChange(actividades.map((a, i) => (i === idx ? { ...a, [field]: val } : a)));
  }

  function addRow() {
    const cleared = actividades.map((a, i) => (i === actividades.length - 1 ? { ...a, fechaFin: '' } : a));
    onChange([...cleared, { ...emptyActividad(), fechaFin: maxDate ?? '' }]);
  }

  function removeRow(idx) {
    if (actividades.length <= 1) return;
    onChange(actividades.filter((_, i) => i !== idx));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      <div className={styles.card} style={{ overflowX: 'auto' }}>
        <table className={`${styles.table} ${styles.tableEditable}`}>
          <thead>
            <tr>
              <th style={{ width: '50%' }}>Descripción</th>
              <th style={{ width: '22%' }}>Fecha inicio</th>
              <th style={{ width: '22%' }}>Fecha fin</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {actividades.map((act, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    type="text"
                    className={styles.celdaInput}
                    value={act.descripcion}
                    onChange={(e) => updateRow(idx, 'descripcion', e.target.value)}
                    placeholder="Descripción de la actividad"
                    style={{ width: '100%', font: 'inherit' }}
                  />
                </td>
                <td>
                  <input type="date" className={styles.celdaInput} value={act.fechaInicio} min={minDate} max={maxDate} onChange={(e) => updateRow(idx, 'fechaInicio', e.target.value)} style={{ font: 'inherit' }} />
                </td>
                <td>
                  <input type="date" className={styles.celdaInput} value={act.fechaFin} min={act.fechaInicio || minDate} max={maxDate} onChange={(e) => updateRow(idx, 'fechaFin', e.target.value)} style={{ font: 'inherit' }} />
                </td>
                <td>
                  <button type="button" className={styles.deleteRowButton} onClick={() => removeRow(idx)} disabled={actividades.length <= 1} title="Quitar actividad" aria-label="Quitar actividad">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="ghost" onClick={addRow}>
        <Plus size={14} />
        Agregar actividad
      </Button>
    </div>
  );
}

export function CronogramaBuilder({ value, onChange, minDays = 13 }) {
  const minStartDate = toInputDate(getMinStartDate(minDays));
  const minStartDisplay = formatDisplayDate(minStartDate);
  const totalDays = calcDuration(value.fechaInicio, value.fechaFin);

  const fechaInicioError = value.fechaInicio && value.fechaInicio < minStartDate ? `La fecha de inicio debe ser mínimo el ${minStartDisplay}, considerando ${minDays} días hábiles desde hoy.` : '';
  const fechaFinError = value.fechaFin && value.fechaInicio && value.fechaFin <= value.fechaInicio ? 'La fecha de fin debe ser posterior a la fecha de inicio.' : '';

  function set(key, val) {
    onChange({ ...value, [key]: val });
  }

  function setFechaInicio(fecha) {
    const actividades = value.actividades.map((a, i) => (i === 0 ? { ...a, fechaInicio: fecha } : a));
    onChange({ ...value, fechaInicio: fecha, actividades });
  }

  function setFechaFin(fecha) {
    const last = value.actividades.length - 1;
    const actividades = value.actividades.map((a, i) => (i === last ? { ...a, fechaFin: fecha } : a));
    onChange({ ...value, fechaFin: fecha, actividades });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <div>
          <Field className="fieldMd" label="Fecha de inicio del contrato" required error={fechaInicioError}>
            {(p) => <TextInput {...p} type="date" value={value.fechaInicio} min={minStartDate} onChange={(e) => setFechaInicio(e.target.value)} />}
          </Field>
          {!fechaInicioError && (
            <p style={{ margin: '4px 0 0', fontSize: 'var(--text-label-size)', color: 'var(--color-ink-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CalendarDays size={11} /> Mínimo: {minStartDisplay} ({minDays} días hábiles desde hoy)
            </p>
          )}
        </div>
        <Field className="fieldMd" label="Fecha de fin del contrato" required error={fechaFinError}>
          {(p) => <TextInput {...p} type="date" value={value.fechaFin} min={value.fechaInicio || minStartDate} onChange={(e) => setFechaFin(e.target.value)} />}
        </Field>
      </div>

      {totalDays > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-data-size)', color: 'var(--color-primary)', background: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
          <CalendarDays size={15} />
          Duración total: <strong>{totalDays} días hábiles</strong>
        </div>
      )}

      <div>
        <p style={{ fontSize: 'var(--text-body-size)', fontWeight: 500, margin: '0 0 6px' }}>Actividades del contrato</p>
        <ActividadesTable actividades={value.actividades} onChange={(acts) => set('actividades', acts)} minDate={value.fechaInicio || minStartDate} maxDate={value.fechaFin} />
      </div>
    </div>
  );
}

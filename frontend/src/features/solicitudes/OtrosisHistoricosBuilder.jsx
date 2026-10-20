// Tabla de otrosís históricos a importar junto con el contrato -- pedido
// explícito del usuario (2026-09-28), "tal cual como cronograma" (mismo
// patrón visual/estructural que CronogramaBuilder.jsx#ActividadesTable: tabla
// con inputs inline sin borde, botón "Agregar" tipo ghost, basurero por fila)
// pero para otrosís en vez de actividades. A diferencia de esa tabla, acá SÍ
// se puede llegar a 0 filas -- "también se pueden crear vacíos si no hay
// otrosis", un contrato histórico sin ningún otrosí es el caso más común.
//
// Solo aplica a CONTRATO (nunca Orden de Servicio -- las Órdenes de Servicio
// no admiten otrosí, ver solicitud.importarHistorico.js), gateado en
// SolicitudForm.jsx#tipoSolicitud === 'CONTRATO', no acá.
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { TIPO_SOLICITUD_LABELS, formatearMiles, soloDigitos } from '../../utils/solicitudes.js';
import styles from './Solicitudes.module.css';

const TIPOS_OTROSI = ['OTROSI_TIEMPO', 'OTROSI_TIEMPO_CANTIDAD'];

// 2026-10-20: el borde/fondo ya NO van acá -- pasaron a `styles.celdaInput`
// (Solicitudes.module.css), que sí puede tener `:hover`/`:focus` (un
// `style` inline no puede).
const inputStyle = { width: '100%', font: 'inherit' };

export function emptyOtrosiHistorico() {
  return { numeroOtrosi: '', tipo: 'OTROSI_TIEMPO', fechaInicio: '', fechaFin: '', valorFinal: '' };
}

// Exportada para que SolicitudForm.jsx valide las filas con el mismo
// criterio exacto que usa esta tabla, sin duplicar reglas -- mismo espíritu
// que calcularValorTotalItem/calcularTotalesProveedor en
// CuadroComparativoBuilder.jsx.
export function validarOtrosisHistoricos(otrosis) {
  const errores = [];
  const numeros = new Set();
  otrosis.forEach((o, idx) => {
    const etiqueta = o.numeroOtrosi ? `Otrosí n.º ${o.numeroOtrosi}` : `Fila ${idx + 1}`;
    const n = Number(o.numeroOtrosi);
    if (!o.numeroOtrosi || !Number.isInteger(n) || n <= 0) {
      errores.push(`${etiqueta}: ingresa un número de otrosí válido.`);
      return;
    }
    if (numeros.has(n)) {
      errores.push(`Otrosí n.º ${n}: el número está repetido.`);
      return;
    }
    numeros.add(n);
    if (!o.fechaInicio || !o.fechaFin) {
      errores.push(`${etiqueta}: las fechas de inicio y fin son obligatorias.`);
      return;
    }
    if (new Date(o.fechaFin) <= new Date(o.fechaInicio)) {
      errores.push(`${etiqueta}: la fecha de fin debe ser posterior a la de inicio.`);
      return;
    }
    if (o.tipo === 'OTROSI_TIEMPO_CANTIDAD' && !o.valorFinal) {
      errores.push(`${etiqueta}: ingresa el nuevo valor del contrato.`);
    }
  });
  return errores;
}

export function OtrosisHistoricosBuilder({ value, onChange }) {
  function updateRow(idx, field, val) {
    onChange(value.map((o, i) => (i === idx ? { ...o, [field]: val } : o)));
  }

  function addRow() {
    onChange([...value, emptyOtrosiHistorico()]);
  }

  function removeRow(idx) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      <div className={styles.card} style={{ overflowX: 'auto' }}>
        <table className={`${styles.table} ${styles.tableEditable}`}>
          <thead>
            <tr>
              <th style={{ width: '10%' }}>N.º</th>
              <th style={{ width: '28%' }}>Tipo</th>
              <th style={{ width: '18%' }}>Fecha inicio</th>
              <th style={{ width: '18%' }}>Fecha fin</th>
              <th style={{ width: '22%' }}>Valor final (COP)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {value.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyState}>Sin otrosís -- el contrato se importará tal cual, sin historial de modificaciones.</td>
              </tr>
            ) : (
              value.map((o, idx) => (
                <tr key={idx}>
                  <td>
                    <input type="text" inputMode="numeric" className={styles.celdaInput} value={o.numeroOtrosi} onChange={(e) => updateRow(idx, 'numeroOtrosi', e.target.value.replace(/\D/g, ''))} placeholder="1" style={inputStyle} />
                  </td>
                  <td>
                    <select className={styles.celdaInput} value={o.tipo} onChange={(e) => updateRow(idx, 'tipo', e.target.value)} style={inputStyle}>
                      {TIPOS_OTROSI.map((t) => (
                        <option key={t} value={t}>{TIPO_SOLICITUD_LABELS[t] ?? t}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input type="date" className={styles.celdaInput} value={o.fechaInicio} onChange={(e) => updateRow(idx, 'fechaInicio', e.target.value)} style={inputStyle} />
                  </td>
                  <td>
                    <input type="date" className={styles.celdaInput} value={o.fechaFin} min={o.fechaInicio || undefined} onChange={(e) => updateRow(idx, 'fechaFin', e.target.value)} style={inputStyle} />
                  </td>
                  <td>
                    {o.tipo === 'OTROSI_TIEMPO_CANTIDAD' ? (
                      <input type="text" inputMode="numeric" className={styles.celdaInput} value={formatearMiles(o.valorFinal)} onChange={(e) => updateRow(idx, 'valorFinal', soloDigitos(e.target.value))} placeholder="0" style={inputStyle} />
                    ) : (
                      <span style={{ color: 'var(--color-ink-muted)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <button type="button" className={styles.deleteRowButton} onClick={() => removeRow(idx)} title="Quitar otrosí" aria-label="Quitar otrosí">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="ghost" onClick={addRow}>
        <Plus size={14} />
        Agregar otrosí
      </Button>
    </div>
  );
}

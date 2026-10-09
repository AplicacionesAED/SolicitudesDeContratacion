// Puerto de FileField (solicitudForm.tsx original) -- no viene en la
// plantilla. Usa el patrón render-prop de <Field> (Field.jsx) para
// label/error/helper, pero el control interno es propio: un input
// type="file" oculto detrás de un botón "Seleccionar"/"Cambiar", que sube el
// archivo a POST /upload apenas se elige y guarda la URL devuelta (no el
// archivo en sí) en el estado del formulario -- mismo comportamiento que el
// original, un campo por archivo, sin selección múltiple.
import { useState } from 'react';
import { FileUp } from 'lucide-react';
import { subirArchivo } from '../../api/upload.js';
import styles from './FileField.module.css';

export function FileField({ id, accept, value, onChange, disabled, ...ariaProps }) {
  const [subiendo, setSubiendo] = useState(false);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [errorSubida, setErrorSubida] = useState('');

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo si falla
    if (!file) return;
    setSubiendo(true);
    setErrorSubida('');
    try {
      const data = await subirArchivo(file);
      onChange(data.url);
      setNombreArchivo(file.name);
    } catch (err) {
      setErrorSubida(err.message ?? 'Error al subir el archivo');
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div>
      <div className={`${styles.control} ${value ? styles.controlFilled : ''}`}>
        <FileUp size={16} strokeWidth={1.75} className={value ? styles.iconFilled : styles.icon} aria-hidden="true" />
        <span className={styles.filename}>{nombreArchivo || (value ? 'Archivo cargado' : 'Sin archivo')}</span>
        <label className={styles.selectLabel}>
          <span className={styles.selectText}>{subiendo ? 'Subiendo…' : value ? 'Cambiar' : 'Seleccionar'}</span>
          <input id={id} type="file" accept={accept} onChange={handleFile} disabled={disabled || subiendo} className={styles.hiddenInput} {...ariaProps} />
        </label>
      </div>
      {errorSubida && <p className={styles.uploadError}>{errorSubida}</p>}
    </div>
  );
}

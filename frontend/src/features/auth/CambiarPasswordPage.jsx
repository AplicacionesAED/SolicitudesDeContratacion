// PLANTILLA -- copiado tal cual, va en frontend/src/features/auth/CambiarPasswordPage.jsx.
// Reusa LoginPage.module.css -- no crea su propio CSS.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cambiarPassword } from '../../api/auth';
import { Button } from '../../components/ui/Button.jsx';
import { Field, TextInput } from '../../components/ui/Field.jsx';
import styles from './LoginPage.module.css';

export function CambiarPasswordPage() {
  const navigate = useNavigate();
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (nueva !== confirmacion) {
      setError('Las contraseñas no coinciden');
      return;
    }
    try {
      await cambiarPassword(nueva);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.details?.requisitos_faltantes?.join(', ') ?? err.message ?? 'No se pudo cambiar la contraseña');
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.brand}>Cambiar contraseña</h1>
        <p style={{ fontSize: 'var(--text-data-size)', color: 'var(--color-ink-muted)', margin: 0 }}>
          Mínimo 8 caracteres, una mayúscula, un número y un carácter especial.
        </p>
        <Field label="Nueva contraseña" required>
          {(p) => <TextInput {...p} type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} required autoFocus />}
        </Field>
        <Field label="Confirmar contraseña" required>
          {(p) => <TextInput {...p} type="password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} required />}
        </Field>
        {error && <p className={styles.error}>{error}</p>}
        <Button type="submit">Guardar</Button>
      </form>
    </div>
  );
}

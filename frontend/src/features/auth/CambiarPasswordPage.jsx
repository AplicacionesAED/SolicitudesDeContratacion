import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Circle, Eye, EyeOff, Lock } from 'lucide-react';
import { cambiarPassword } from '../../api/auth.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import styles from './LoginPage.module.css';

// Rediseno (2026-10-03): misma tarjeta que el login (sin panel de marca, porque
// se llega justo despues de iniciar sesion), con iconos en los campos, boton para
// ver la contrasena y una lista de requisitos que se marca en vivo. Las reglas
// reflejan backend/src/utils/passwordRules.js (el backend sigue siendo quien
// valida de verdad).
const REQUISITOS = [
  { clave: 'largo', texto: 'Al menos 8 caracteres', cumple: (p) => p.length >= 8 },
  { clave: 'mayuscula', texto: 'Una letra mayúscula', cumple: (p) => /[A-Z]/.test(p) },
  { clave: 'numero', texto: 'Un número', cumple: (p) => /[0-9]/.test(p) },
  { clave: 'especial', texto: 'Un carácter especial (!@#$%…)', cumple: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function CambiarPasswordPage() {
  const navigate = useNavigate();
  const { refrescarPerfil } = useAuth();
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const coinciden = confirmacion.length > 0 && nueva === confirmacion;
  const requisitosOk = REQUISITOS.every((r) => r.cumple(nueva));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (nueva !== confirmacion) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setEnviando(true);
    try {
      await cambiarPassword(nueva);
      // Actualiza el perfil en memoria (debe_cambiar_password ya es false); si no,
      // ProtectedRoute seguiría devolviendo a esta pantalla.
      await refrescarPerfil();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.details?.requisitos_faltantes?.join(', ') ?? err.message ?? 'No se pudo cambiar la contraseña');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={styles.soloPanel}>
      <form className={styles.formCard} onSubmit={handleSubmit}>
        <img className={styles.formLogo} src={`${import.meta.env.BASE_URL}aed-logo.png`} alt="aed" />
        <div className={styles.formHead}>
          <h1 className={styles.formTitle}>Crea tu contraseña</h1>
          <p className={styles.formSubtitle}>Es tu primer ingreso: elige una contraseña propia para continuar.</p>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Nueva contraseña</span>
          <span className={styles.inputWrap}>
            <Lock size={18} strokeWidth={1.75} className={styles.inputIcon} aria-hidden="true" />
            <input
              className={styles.input}
              type={ver ? 'text' : 'password'}
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              required
              autoFocus
            />
            <button type="button" className={styles.toggle} onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              {ver ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
            </button>
          </span>
        </label>

        <ul className={styles.requisitos} aria-label="Requisitos de la contraseña">
          {REQUISITOS.map((r) => {
            const ok = r.cumple(nueva);
            return (
              <li key={r.clave} className={ok ? styles.requisitoOk : undefined}>
                {ok ? <Check size={14} strokeWidth={2.25} aria-hidden="true" /> : <Circle size={14} strokeWidth={1.75} aria-hidden="true" />}
                <span>{r.texto}</span>
                <span className={styles.srOnly}>{ok ? ' (cumplido)' : ' (pendiente)'}</span>
              </li>
            );
          })}
        </ul>

        <label className={styles.field}>
          <span className={styles.label}>Confirmar contraseña</span>
          <span className={styles.inputWrap}>
            <Lock size={18} strokeWidth={1.75} className={styles.inputIcon} aria-hidden="true" />
            <input
              className={styles.input}
              type={ver ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              required
            />
          </span>
          {confirmacion.length > 0 && (
            <span className={coinciden ? styles.coincide : styles.noCoincide}>{coinciden ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden todavía'}</span>
          )}
        </label>

        {error && (
          <p className={styles.alert} role="alert">
            {error}
          </p>
        )}

        <button type="submit" className={styles.submit} disabled={enviando || !requisitosOk || !coinciden}>
          {enviando ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  );
}

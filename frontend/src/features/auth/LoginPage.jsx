// Adaptado de la plantilla -- Login Split Screen (ver "Login Split Screen" en
// ARQUITECTURA-FRONTEND.md) + botón de SSO de Azure AD (Solicitudes
// Indirectos migra el flujo de Microsoft desde el día 1, a diferencia de la
// plantilla base). El error de un intento de SSO fallido llega como
// ?error=... en la URL (ver backend/src/modules/auth/auth.azure.js#callback).
import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, TextInput } from '../../components/ui/Field.jsx';
import { API_BASE_URL } from '../../api/client.js';
import styles from './LoginPage.module.css';

const MENSAJES_ERROR_SSO = {
  OAuthAccountNotFound: 'No existe una cuenta vinculada a este correo de Microsoft. Pide a un administrador que cree tu usuario primero.',
  OAuthNotLinked: 'Tu cuenta existe, pero no está vinculada a Microsoft todavía. Inicia sesión con contraseña y vincúlala desde tu perfil.',
  OAuthAccountInactive: 'Tu cuenta está desactivada. Contacta al administrador del sistema.',
  OAuthError: 'No se pudo completar el inicio de sesión con Microsoft. Intenta de nuevo.',
};

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const codigo = searchParams.get('error');
    if (codigo) setError(MENSAJES_ERROR_SSO[codigo] ?? 'No se pudo iniciar sesión.');
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const perfil = await login(email, password);
      if (perfil.debe_cambiar_password) {
        navigate('/cambiar-password', { replace: true });
      } else {
        navigate(location.state?.from?.pathname ?? '/', { replace: true });
      }
    } catch (err) {
      setError(err.message ?? 'Credenciales incorrectas');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={styles.splitWrap}>
      <div className={styles.brandPanel} aria-hidden="true">
        <div className={styles.brandTextBlock}>
          <h2 className={styles.brandHeadline}>Gestión de contratación, de punta a punta</h2>
          <p className={styles.brandSubtext}>Solicitudes de contratación directa e indirecta, aprobaciones y seguimiento de Baía Kristal en un solo lugar.</p>
        </div>
      </div>

      <div className={styles.formPanel}>
        <form className={styles.formInner} onSubmit={handleSubmit}>
          <img className={styles.formLogo} src="/aed-logo.png" alt="aed" />
          <h1 className={styles.formTitle}>Iniciar sesión</h1>
          <Field label="Correo" required>
            {(p) => <TextInput {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />}
          </Field>
          <Field label="Contraseña" required>
            {(p) => <TextInput {...p} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />}
          </Field>
          {error && <p className={styles.error}>{error}</p>}
          <Button type="submit" disabled={enviando}>
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => window.location.assign(`${API_BASE_URL}/auth/azure/login`)}>
            Iniciar con Microsoft
          </Button>
        </form>
      </div>
    </div>
  );
}

// Puerto de (app)/perfil/page.tsx (app Next.js original) -- datos del usuario
// + vincular/desvincular cuenta de Microsoft. El resultado del intento de
// vinculación llega como ?ms_linked=... / ?ms_error=... en la URL (ver
// backend/src/modules/auth/auth.azure.js#callback).
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { desvincularMicrosoft, iniciarVinculacionMicrosoft } from '../../api/auth.js';
import { Button } from '../../components/ui/Button.jsx';
import { ROL_LABELS } from '../../utils/permisos.js';
import styles from './PerfilPage.module.css';

export function PerfilPage() {
  const { usuario, refrescarPerfil } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const msLinked = searchParams.get('ms_linked');
  const msError = searchParams.get('ms_error');

  async function handleDesvincular() {
    await desvincularMicrosoft();
    await refrescarPerfil();
  }

  if (!usuario) return null;

  return (
    <div className={styles.page}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-headline-size)' }}>Mi perfil</h1>

      {msLinked && (
        <p className={`${styles.notice} ${styles.noticeSuccess}`}>Cuenta de Microsoft vinculada: {msLinked}</p>
      )}
      {msError && <p className={`${styles.notice} ${styles.noticeError}`}>{msError}</p>}

      <div className={styles.card}>
        <div className={styles.row}>
          <span className={styles.label}>Nombre</span>
          <span className={styles.value}>{usuario.nombre}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Correo</span>
          <span className={styles.value}>{usuario.email}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Roles</span>
          <span className={styles.value}>{usuario.roles.map((r) => ROL_LABELS[r] ?? r).join(', ')}</span>
        </div>
        {usuario.cargo && (
          <div className={styles.row}>
            <span className={styles.label}>Cargo</span>
            <span className={styles.value}>{usuario.cargo}</span>
          </div>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.row}>
          <span className={styles.label}>Cuenta de Microsoft</span>
          {usuario.microsoft_email ? (
            <Button type="button" variant="danger" onClick={handleDesvincular}>
              Desvincular ({usuario.microsoft_email})
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={iniciarVinculacionMicrosoft}>
              Vincular cuenta de Microsoft
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

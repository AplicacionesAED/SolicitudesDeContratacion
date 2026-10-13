// Mi perfil (rediseno 2026-10-09). Antes era una tarjeta con 4 datos; ahora responde a lo que la persona necesita saber
// de su propia cuenta: quien es, A QUE tiene acceso, en que frentes esta asignada y como protege su cuenta (cambiar la
// contrasena y vincular Microsoft). El resultado de vincular llega como ?ms_linked=... / ?ms_error=... (ver
// backend/src/modules/auth/auth.azure.js#callback).
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Circle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { cambiarPassword, desvincularMicrosoft, iniciarVinculacionMicrosoft } from '../../api/auth.js';
import { listFrentes } from '../../api/frentes.js';
import { usuarioTienePermiso, ROL_LABELS } from '../../utils/permisos.js';
import { NAV_GROUPS } from '../../utils/navModulos.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Field, TextInput } from '../../components/ui/Field.jsx';
import layoutStyles from '../../components/layout/WizardLayout.module.css';
import { iniciales } from '../configuracion/usuarioUtils.js';
import styles from '../configuracion/Usuarios.module.css';
import extra from '../terceros/Terceros.module.css';
import p from './PerfilPage.module.css';

// Mismas reglas que backend/src/utils/passwordRules.js (el backend sigue siendo quien valida de verdad).
const REQUISITOS = [
  { texto: 'Al menos 8 caracteres', cumple: (v) => v.length >= 8 },
  { texto: 'Una letra mayúscula', cumple: (v) => /[A-Z]/.test(v) },
  { texto: 'Un número', cumple: (v) => /[0-9]/.test(v) },
  { texto: 'Un carácter especial (!@#$%…)', cumple: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function PerfilPage() {
  const { usuario, refrescarPerfil } = useAuth();
  const [searchParams] = useSearchParams();
  const msLinked = searchParams.get('ms_linked');
  const msError = searchParams.get('ms_error');

  const [frentes, setFrentes] = useState(null);
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [errorMs, setErrorMs] = useState(null);

  useEffect(() => {
    if (!usuario) return;
    listFrentes()
      .then((res) => setFrentes(res.data.filter((f) => f.usuarioIds?.includes(usuario.id))))
      .catch(() => setFrentes([]));
  }, [usuario?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // A que pantallas entra esta persona, agrupadas por modulo -- sale del mismo arbol del menu lateral, filtrado
  // por sus permisos reales (no se pide la lista de roles, que solo ve un admin).
  const accesos = useMemo(() => {
    if (!usuario) return [];
    return NAV_GROUPS.map((g) => ({
      titulo: g.title,
      items: g.items.filter((i) => (i.soloAdmin ? usuario.esAdmin : !i.permiso || usuario.esAdmin || usuarioTienePermiso(usuario, i.permiso))).map((i) => i.label),
    })).filter((g) => g.items.length > 0);
  }, [usuario]);

  if (!usuario) return null;

  const requisitosOk = REQUISITOS.every((r) => r.cumple(nueva));
  const coinciden = confirmacion.length > 0 && nueva === confirmacion;

  async function handleCambiarPassword(e) {
    e.preventDefault();
    setMensaje(null);
    setGuardando(true);
    try {
      await cambiarPassword(nueva);
      setNueva('');
      setConfirmacion('');
      setMensaje({ tipo: 'ok', texto: 'Contraseña actualizada.' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.details?.requisitos_faltantes?.join(', ') ?? err.message ?? 'No se pudo cambiar la contraseña' });
    } finally {
      setGuardando(false);
    }
  }

  async function handleDesvincular() {
    setErrorMs(null);
    try {
      await desvincularMicrosoft();
      await refrescarPerfil();
    } catch (err) {
      setErrorMs(err.message);
    }
  }

  return (
    <div className={styles.page}>
      <section className={layoutStyles.hero}>
        <div className={layoutStyles.heroAvatar}>{iniciales(usuario.nombre)}</div>
        <div className={layoutStyles.heroInfo}>
          <h1 className={layoutStyles.heroName}>{usuario.nombre}</h1>
          <p className={layoutStyles.heroRole}>{usuario.cargo ? `${usuario.cargo} · ${usuario.email}` : usuario.email}</p>
          <p className={layoutStyles.heroMeta}>{(usuario.roles ?? []).map((r) => ROL_LABELS[r] ?? r).join(' · ')}</p>
        </div>
        <div className={layoutStyles.heroSide}>
          {usuario.microsoft_email ? <Badge variant="success" dot>Microsoft vinculada</Badge> : <Badge variant="neutral">Sin Microsoft</Badge>}
        </div>
      </section>

      {msLinked && <div className={extra.okBanner} role="status">Cuenta de Microsoft vinculada: {msLinked}</div>}
      {msError && <div className={styles.errorBanner} role="alert">{msError}</div>}

      <div className={styles.formStack}>
        <section className={styles.sectionCard}>
          <div>
            <h2 className={styles.sectionTitle}>A qué tienes acceso</h2>
            <p className={styles.sectionHint}>Según tus roles. Si necesitas algo más, pídeselo a un administrador.</p>
          </div>
          {accesos.length === 0 ? (
            <p className={styles.permisosVacio}>Tus roles no dan acceso a pantallas del menú.</p>
          ) : (
            <div className={p.accesos}>
              {accesos.map((g) => (
                <div key={g.titulo} className={p.accesoGrupo}>
                  <p className={p.accesoTitulo}>{g.titulo}</p>
                  <div className={extra.chips}>
                    {g.items.map((i) => (
                      <span key={i} className={extra.chip}>{i}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={styles.sectionCard}>
          <div>
            <h2 className={styles.sectionTitle}>Mis frentes</h2>
            <p className={styles.sectionHint}>Los frentes en los que estás asignado; de ahí salen las solicitudes que ves y que puedes crear.</p>
          </div>
          {frentes === null ? (
            <p className={styles.permisosVacio}>Cargando...</p>
          ) : frentes.length === 0 ? (
            <p className={styles.permisosVacio}>No estás asignado a ningún frente.</p>
          ) : (
            <div className={extra.chips}>
              {frentes.map((f) => (
                <span key={f.id} className={extra.chip}>{f.nombre}{f.proyecto?.nombre ? ` · ${f.proyecto.nombre}` : ''}</span>
              ))}
            </div>
          )}
        </section>

        <form className={styles.sectionCard} onSubmit={handleCambiarPassword}>
          <div>
            <h2 className={styles.sectionTitle}>Cambiar contraseña</h2>
            <p className={styles.sectionHint}>La nueva contraseña se aplica de inmediato.</p>
          </div>
          {mensaje && <div className={mensaje.tipo === 'ok' ? extra.okBanner : styles.errorBanner} role={mensaje.tipo === 'ok' ? 'status' : 'alert'}>{mensaje.texto}</div>}
          <div className={styles.row}>
            <Field className="fieldMd" label="Nueva contraseña" required>
              {(fp) => <TextInput {...fp} type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} />}
            </Field>
            <Field className="fieldMd" label="Confirmar contraseña" required error={confirmacion && !coinciden ? 'No coinciden' : undefined}>
              {(fp) => <TextInput {...fp} type="password" autoComplete="new-password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />}
            </Field>
          </div>
          <ul className={p.requisitos}>
            {REQUISITOS.map((r) => (
              <li key={r.texto} className={r.cumple(nueva) ? p.reqOk : ''}>
                {r.cumple(nueva) ? <Check size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />} {r.texto}
              </li>
            ))}
          </ul>
          <div className={styles.actions}>
            <span />
            <Button type="submit" variant="primary" disabled={guardando || !requisitosOk || !coinciden}>
              {guardando ? 'Guardando...' : 'Cambiar contraseña'}
            </Button>
          </div>
        </form>

        <section className={styles.sectionCard}>
          <div className={extra.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Cuenta de Microsoft</h2>
              <p className={styles.sectionHint}>{usuario.microsoft_email ? `Vinculada a ${usuario.microsoft_email}. Puedes entrar con ella desde el login.` : 'Vincúlala para entrar con "Continuar con Microsoft" sin escribir tu contraseña.'}</p>
            </div>
            {usuario.microsoft_email ? (
              <Button type="button" variant="danger" onClick={handleDesvincular}>Desvincular</Button>
            ) : (
              <Button type="button" variant="secondary" onClick={iniciarVinculacionMicrosoft}>Vincular cuenta de Microsoft</Button>
            )}
          </div>
          {errorMs && <div className={styles.errorBanner} role="alert">{errorMs}</div>}
        </section>
      </div>
    </div>
  );
}

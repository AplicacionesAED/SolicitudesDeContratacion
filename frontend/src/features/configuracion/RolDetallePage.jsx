// Detalle de un rol -- separado de RolesPage.jsx (que ahora es solo la
// lista) siguiendo el mismo patrón que Frentes: fila clickeable en la lista,
// edición completa en su propia ruta. No hay GET /roles/:nombre en el
// backend (la lista completa son ~9 filas, no justifica un endpoint aparte)
// -- se reusa listRoles() y se busca el rol por nombre en memoria, mismo
// criterio que list()+find() en vez de una llamada extra.
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listRoles, listFuncionalidadesDisponibles, updateRol } from '../../api/roles.js';
import { ROL_LABELS, ALCANCE_SOLICITUDES_LABELS } from '../../utils/permisos.js';
import { NAV_GROUPS } from '../../utils/navModulos.jsx';
import { BackLink } from '../../components/ui/BackLink.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Checkbox } from '../../components/ui/Checkbox.jsx';
import { CheckboxGroup } from '../../components/ui/CheckboxGroup.jsx';
import { Field, Select, TextInput } from '../../components/ui/Field.jsx';
import styles from './Configuracion.module.css';

// Un módulo del sidebar (`NAV_GROUPS`, ver navModulos.jsx) se muestra acá
// como "padre + sub-ítems indentados" -- exactamente el mismo árbol que ve
// el usuario en el sidebar, para que activar/desactivar un checkbox acá
// tenga un resultado predecible y visible ahí. El checkbox del padre
// refleja EXACTAMENTE la misma condición que usa `AppShell.jsx` para
// mostrar/ocultar el módulo en el sidebar -- "¿al menos un sub-ítem está
// concedido?" (`some`, no `every`) -- así el admin ve marcado el módulo
// padre cada vez que ese módulo YA es visible para el rol, sin importar si
// tiene todos sus sub-ítems o solo uno. No es un permiso propio -- no
// existe un slug "acceso total a Solicitudes Directas" en la base, el
// acceso real depende únicamente de qué sub-ítems tenga marcados; clickear
// el padre es solo un atajo para marcar/desmarcar todos sus sub-ítems de
// una (si ya hay alguno marcado, los desmarca todos; si no hay ninguno,
// los marca todos). Un módulo sin ítems con `permiso` (ej. Actividad,
// gateada por `soloAdmin`) no tiene nada que configurar por rol y no se
// renderiza -- esto hace que agregar un módulo nuevo a `NAV_GROUPS`
// alcance para que aparezca acá solo, sin tocar este archivo.
function ModuloPermisos({ titulo, items, permisos, onChange }) {
  if (items.length === 0) return null;
  const algunoMarcado = items.some((item) => permisos.has(item.permiso));

  function toggleTodos() {
    const nuevos = new Set(permisos);
    if (algunoMarcado) items.forEach((item) => nuevos.delete(item.permiso));
    else items.forEach((item) => nuevos.add(item.permiso));
    onChange(nuevos);
  }

  function toggleUno(slug) {
    const nuevos = new Set(permisos);
    if (nuevos.has(slug)) nuevos.delete(slug);
    else nuevos.add(slug);
    onChange(nuevos);
  }

  return (
    <div>
      <Checkbox label={titulo} checked={algunoMarcado} onChange={toggleTodos} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, marginLeft: 28 }}>
        {items.map((item) => (
          <Checkbox key={item.permiso} label={item.label} checked={permisos.has(item.permiso)} onChange={() => toggleUno(item.permiso)} />
        ))}
      </div>
    </div>
  );
}

export function RolDetallePage() {
  const { nombre } = useParams();
  const navigate = useNavigate();
  const [funcionalidades, setFuncionalidades] = useState({});
  const [borrador, setBorrador] = useState(null); // { permisos: Set, alcance_solicitudes }
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    Promise.all([listRoles(), listFuncionalidadesDisponibles()])
      .then(([rolesRes, funcRes]) => {
        const rol = rolesRes.data.find((r) => r.nombre === nombre);
        if (!rol) {
          navigate('/configuracion/roles');
          return;
        }
        setFuncionalidades(funcRes.data);
        setBorrador({ nombre: rol.nombre, permisos: new Set(rol.permisos), alcance_solicitudes: rol.alcance_solicitudes });
      })
      .catch((err) => setError(err.message));
  }

  useEffect(cargar, [nombre]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <p className={styles.errorBanner}>{error}</p>;
  if (!borrador) return null;

  function setPermisos(nuevoSet) {
    setBorrador((prev) => ({ ...prev, permisos: nuevoSet }));
  }

  // CheckboxGroup (usado para "Otros permisos", una lista plana sin árbol)
  // maneja su `value`/`onChange` como array, no como Set -- este wrapper
  // evita que el resto del archivo tenga que pensar en las dos formas.
  function setPermisosDesdeArray(nuevoArray) {
    setPermisos(new Set(nuevoArray));
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      const payload = { permisos: Array.from(borrador.permisos), alcance_solicitudes: borrador.alcance_solicitudes };
      if (borrador.nombre.trim() !== nombre) payload.nombre = borrador.nombre.trim();
      await updateRol(nombre, payload);
      navigate('/configuracion/roles');
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  // 2026-09-02 "permisos por módulo, desglosados": el acceso ya no se
  // configura por slug suelto -- se configura módulo por módulo, calcado
  // 1:1 del árbol real del sidebar (`NAV_GROUPS`, ver navModulos.jsx). Cada
  // ítem con `permiso` que exista HOY o se agregue MAÑANA a ese árbol
  // aparece acá solo, sin tocar este archivo (`ModuloPermisos` filtra
  // `items` a los que tengan `permiso` y no renderiza el módulo si no
  // queda ninguno -- ver su comentario arriba). Lo que sobra (slugs que no
  // corresponden a ningún ítem del sidebar, ej. `gestionar_especialidades`,
  // una capacidad de EDICIÓN, no de navegación) cae en "Otros permisos".
  const slugsDeModulos = new Set(NAV_GROUPS.flatMap((g) => g.items.map((i) => i.permiso).filter(Boolean)));
  const slugsOtros = Object.keys(funcionalidades).filter((s) => !slugsDeModulos.has(s));
  const opcionesOtros = slugsOtros.map((slug) => ({ value: slug, label: funcionalidades[slug].nombre }));

  return (
    <>
      <BackLink to="/configuracion/roles">Roles</BackLink>
      <div className={styles.header}>
        <h1 className={styles.title}>{ROL_LABELS[nombre] ?? nombre}</h1>
        <Button type="button" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.card} style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        <Field className="fieldMd" label="Nombre" required>
          {(p) => (
            <TextInput
              {...p}
              value={borrador.nombre}
              onChange={(e) => setBorrador((prev) => ({ ...prev, nombre: e.target.value }))}
            />
          )}
        </Field>

        <Field className="fieldMd" label="Alcance de solicitudes" helper="Dentro de una sección de Solicitudes a la que ya tiene acceso, cuáles filas puede ver.">
          {(p) => (
            <Select {...p} value={borrador.alcance_solicitudes} onChange={(e) => setBorrador((prev) => ({ ...prev, alcance_solicitudes: e.target.value }))}>
              {Object.entries(ALCANCE_SOLICITUDES_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          )}
        </Field>

        {NAV_GROUPS.map((grupo) => (
          <ModuloPermisos
            key={grupo.title}
            titulo={grupo.title}
            items={grupo.items.filter((item) => item.permiso && funcionalidades[item.permiso])}
            permisos={borrador.permisos}
            onChange={setPermisos}
          />
        ))}

        {opcionesOtros.length > 0 && (
          <CheckboxGroup
            label="Otros permisos"
            options={opcionesOtros}
            value={Array.from(borrador.permisos)}
            onChange={setPermisosDesdeArray}
          />
        )}
      </div>
    </>
  );
}

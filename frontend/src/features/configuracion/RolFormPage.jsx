// Crear rol -- puerto de Cartera, 2026-09-18, pedido explicito del usuario
// ("quiero poder crear roles"). El backend ya soportaba POST /roles
// (rol.routes.js), solo faltaba esta pantalla -- antes solo existia
// RolDetallePage.jsx (editar un rol ya creado). Mismo arbol de permisos por
// modulo que RolDetallePage.jsx (calcado 1:1 de NAV_GROUPS), duplicado aca
// en vez de compartido porque es un componente chico y local a cada
// pantalla, mismo criterio que el resto de este archivo.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRol, listFuncionalidadesDisponibles } from '../../api/roles.js';
import { ALCANCE_SOLICITUDES_LABELS } from '../../utils/permisos.js';
import { NAV_GROUPS } from '../../utils/navModulos.jsx';
import { BackLink } from '../../components/ui/BackLink.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Checkbox } from '../../components/ui/Checkbox.jsx';
import { CheckboxGroup } from '../../components/ui/CheckboxGroup.jsx';
import { Field, Select, TextInput } from '../../components/ui/Field.jsx';
import styles from './Configuracion.module.css';

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

export function RolFormPage() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [permisos, setPermisos] = useState(new Set());
  const [alcanceSolicitudes, setAlcanceSolicitudes] = useState('FRENTE');
  const [funcionalidades, setFuncionalidades] = useState({});
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    listFuncionalidadesDisponibles()
      .then((res) => setFuncionalidades(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function setPermisosDesdeArray(nuevoArray) {
    setPermisos(new Set(nuevoArray));
  }

  async function guardar(event) {
    event.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await createRol({ nombre: nombre.trim(), permisos: Array.from(permisos), alcance_solicitudes: alcanceSolicitudes });
      navigate('/configuracion/roles');
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  if (loading) return null;

  const slugsDeModulos = new Set(NAV_GROUPS.flatMap((g) => g.items.map((i) => i.permiso).filter(Boolean)));
  const slugsOtros = Object.keys(funcionalidades).filter((s) => !slugsDeModulos.has(s));
  const opcionesOtros = slugsOtros.map((slug) => ({ value: slug, label: funcionalidades[slug].nombre }));

  return (
    <form onSubmit={guardar}>
      <BackLink to="/configuracion/roles">Roles</BackLink>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Crear rol</h1>
        </div>
        <Button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Crear rol'}
        </Button>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.card} style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        <Field className="fieldMd" label="Nombre" required>
          {(p) => <TextInput {...p} value={nombre} onChange={(e) => setNombre(e.target.value)} />}
        </Field>

        <Field className="fieldMd" label="Alcance de solicitudes" helper="Dentro de una sección de Solicitudes a la que ya tiene acceso, cuáles filas puede ver.">
          {(p) => (
            <Select {...p} value={alcanceSolicitudes} onChange={(e) => setAlcanceSolicitudes(e.target.value)}>
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
            permisos={permisos}
            onChange={setPermisos}
          />
        ))}

        {opcionesOtros.length > 0 && (
          <CheckboxGroup
            label="Otros permisos"
            options={opcionesOtros}
            value={Array.from(permisos)}
            onChange={setPermisosDesdeArray}
          />
        )}
      </div>
    </form>
  );
}

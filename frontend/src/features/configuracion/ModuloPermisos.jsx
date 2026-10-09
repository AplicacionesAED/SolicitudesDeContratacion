// Arbol de permisos por modulo, con el diseno del HRMS (PermisosPorModulo): un grupo por modulo del menu
// lateral (NAV_GROUPS, utils/navModulos.jsx -- UNICA fuente de verdad del menu) y un checkbox por pantalla.
// Agregar un modulo o pantalla a NAV_GROUPS alcanza para que aparezca aqui solo. El checkbox del grupo NO es un
// permiso propio: se ve marcado en cuanto hay UNA pantalla marcada (misma condicion que usa AppShell para mostrar
// el modulo) y clickearlo marca/desmarca todas de una. Lo que no corresponde a ninguna pantalla del menu (ej.
// gestionar_especialidades, una capacidad de edicion) va en "Otros permisos". Compartido por RolFormPage y
// RolDetallePage. `value` es un array de slugs.
import { Checkbox } from '../../components/ui/Checkbox.jsx';
import { CheckboxGroup } from '../../components/ui/CheckboxGroup.jsx';
import { NAV_GROUPS } from '../../utils/navModulos.jsx';
import styles from './PermisosPorModulo.module.css';

export function ModuloPermisos({ value, onChange, funcionalidades }) {
  const slugsDeModulos = new Set(NAV_GROUPS.flatMap((g) => g.items.map((i) => i.permiso).filter(Boolean)));
  const opcionesOtros = Object.keys(funcionalidades)
    .filter((slug) => !slugsDeModulos.has(slug))
    .map((slug) => ({ value: slug, label: funcionalidades[slug].nombre }));

  function toggleGrupo(slugs, algunoMarcado) {
    onChange(algunoMarcado ? value.filter((s) => !slugs.includes(s)) : [...new Set([...value, ...slugs])]);
  }

  function toggleUno(slug) {
    onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]);
  }

  return (
    <div className={styles.tree} role="tree" aria-label="Permisos por módulo">
      {NAV_GROUPS.map((grupo) => {
        const items = grupo.items.filter((item) => item.permiso && funcionalidades[item.permiso]);
        if (items.length === 0) return null;
        const slugs = items.map((item) => item.permiso);
        const algunoMarcado = slugs.some((s) => value.includes(s));
        return (
          <div key={grupo.title} className={styles.group} role="treeitem" aria-expanded="true">
            <Checkbox label={grupo.title} checked={algunoMarcado} onChange={() => toggleGrupo(slugs, algunoMarcado)} />
            <div className={styles.children} role="group">
              {items.map((item) => (
                <Checkbox key={item.permiso} className={styles.child} label={item.label} checked={value.includes(item.permiso)} onChange={() => toggleUno(item.permiso)} />
              ))}
            </div>
          </div>
        );
      })}
      {opcionesOtros.length > 0 && <CheckboxGroup label="Otros permisos" options={opcionesOtros} value={value} onChange={onChange} />}
    </div>
  );
}

// Lista de usuarios -- fila clickeable navega a /configuracion/usuarios/:id
// (más de 3 campos por usuario, le toca página dedicada -- ver "Cuándo SÍ
// vale una página de edición dedicada" en ARQUITECTURA-FRONTEND.md).
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listUsuarios } from '../../api/usuarios.js';
import { ROL_LABELS } from '../../utils/permisos.js';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { SortHeader } from '../../components/ui/SortHeader.jsx';
import { useSortableTable, ariaSort } from '../../hooks/useSortableTable.js';
import { usePersistentState } from '../../hooks/usePersistentState.js';
import styles from './Configuracion.module.css';

export function UsuariosPage() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = usePersistentState('configuracion-usuarios:busqueda', '');

  useEffect(() => {
    listUsuarios()
      .then((res) => setUsuarios(res.data))
      .catch((err) => setError(err.message));
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter((u) => u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [usuarios, busqueda]);

  const valueGetters = useMemo(
    () => ({
      nombre: (u) => u.nombre,
      email: (u) => u.email,
      roles: (u) => u.roles.map((r) => ROL_LABELS[r] ?? r).join(', '),
      activo: (u) => (u.activo ? 1 : 0),
    }),
    []
  );
  const { sortedRows, sort, toggleSort } = useSortableTable(filtrados, valueGetters);

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Usuarios</h1>
        <Button type="button" onClick={() => navigate('/configuracion/usuarios/nueva')}>Crear usuario</Button>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <input
        type="text"
        className={styles.searchInput}
        placeholder="Buscar por nombre o correo..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        aria-label="Buscar usuarios"
      />

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-sort={ariaSort(sort, 'nombre')}><SortHeader label="Nombre" sortKey="nombre" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'email')}><SortHeader label="Correo" sortKey="email" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'roles')}><SortHeader label="Roles" sortKey="roles" sort={sort} onSort={toggleSort} /></th>
              <th aria-sort={ariaSort(sort, 'activo')}><SortHeader label="Estado" sortKey="activo" sort={sort} onSort={toggleSort} /></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((u) => (
              <tr key={u.id} onClick={() => navigate(`/configuracion/usuarios/${u.id}`)} style={{ cursor: 'pointer' }}>
                <td>{u.nombre}</td>
                <td>{u.email}</td>
                <td>{u.roles.map((r) => ROL_LABELS[r] ?? r).join(', ')}</td>
                <td>{u.activo ? <Badge variant="success" dot>Activo</Badge> : <Badge variant="neutral" dot>Inactivo</Badge>}</td>
              </tr>
            ))}
            {sortedRows.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.emptyState}>Sin usuarios que coincidan.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

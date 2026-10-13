// Árbol de navegación real de Solicitudes Indirectos -- ÚNICA fuente de
// verdad, consumida tanto por `AppShell.jsx` (arma el sidebar, filtrando
// cada item por `permiso`/`soloAdmin`) como por `RolDetallePage.jsx` (arma
// el árbol de checkboxes "módulo padre + sub-ítems" para configurar acceso
// por rol). Antes cada archivo tenía su propia copia de la estructura --
// agregar un módulo nuevo obligaba a tocar los dos y mantenerlos en sync a
// mano. Ahora agregar un módulo (o un item a uno existente) acá alcanza:
// aparece automáticamente en el sidebar (si el usuario tiene el permiso) Y
// en el editor de Roles (como un checkbox más, sin escribir código nuevo).
//
// 2026-09-02 (pedido explícito): cada item que controla una pantalla real
// declara `permiso` -- si el rol/usuario no lo tiene, el item NO aparece en
// el sidebar (no solo deshabilitado) y la ruta correspondiente en App.jsx
// debe estar protegida con el mismo slug. Un módulo entero (ej.
// "Solicitudes Directas") se oculta del sidebar si NINGUNO de sus items
// tiene el permiso concedido -- ver AppShell.jsx. Un item sin `permiso` (ej.
// uno gateado por `soloAdmin` en cambio) no aparece
// en el editor de Roles -- no hay nada que configurar por rol, ADMIN
// siempre lo ve, nadie más lo ve nunca.
import { FileText, FileSignature, Building2 } from 'lucide-react';

const ICON_SIZE = 16;
const ICON_STROKE_WIDTH = 1.75;

function IconSolicitudesIndirectas() {
  return <FileText size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} aria-hidden="true" />;
}

function IconSolicitudesDirectas() {
  return <FileSignature size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} aria-hidden="true" />;
}

function IconTerceros() {
  return <Building2 size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} aria-hidden="true" />;
}

export const NAV_GROUPS = [
  {
    title: 'Solicitudes Directas',
    icon: IconSolicitudesDirectas,
    items: [
      { label: 'Todas las solicitudes', to: '/solicitudes-directas', permiso: 'ver_solicitudes_directas' },
      { label: 'Nueva solicitud', to: '/solicitudes-directas/nueva', permiso: 'crear_solicitudes_directas' },
    ],
  },
  {
    title: 'Solicitudes Indirectas',
    icon: IconSolicitudesIndirectas,
    items: [
      { label: 'Todas las solicitudes', to: '/solicitudes-indirectas', permiso: 'ver_solicitudes_indirectas' },
      { label: 'Nueva solicitud', to: '/solicitudes-indirectas/nueva', permiso: 'crear_solicitudes_indirectas' },
    ],
  },
  {
    title: 'Terceros',
    icon: IconTerceros,
    items: [
      { label: 'Directorio', to: '/terceros', permiso: 'ver_terceros' },
      { label: 'Especialidades', to: '/terceros/especialidades', permiso: 'ver_especialidades' },
    ],
  },
];

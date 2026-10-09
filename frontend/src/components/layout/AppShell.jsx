// ============================================================================
// PLANTILLA — sidebar principal, copiado tal cual del HRMS aed.
//
// Va en frontend/src/components/layout/AppShell.jsx del proyecto nuevo (junto
// con AppShell.module.css y componentes/ui/Badge.jsx, que ya trae el mismo
// paquete de arquitectura frontend). Requiere `lenis`, `react-router-dom` y
// `lucide-react` como dependencias (ver ARQUITECTURA-FRONTEND.md).
//
// Qué se copia TAL CUAL (la mecánica, el patrón — no cambia entre proyectos):
//   - La estructura de dos columnas: riel de categorías (botón, no navega) +
//     panel flotante con los items reales, que aparece a la derecha con
//     hover Y foco de teclado (nunca solo hover).
//   - El cierre con debounce de 300ms (scheduleClose/cancelScheduledClose) --
//     sin esto, un movimiento diagonal del mouse cierra el panel de casualidad
//     a mitad de camino.
//   - El header de marca (logo + separador + nombre) -- ver
//     componentes/assets/aed-logo.png, mismo logo, mismo lugar. Es el logo
//     degradado verde->azul, pensado para fondo claro -- sin bloque Azul
//     Profundo detrás (no existe una versión blanca/mono del logo todavía),
//     así que se queda sobre el fondo Surface del sidebar en TODOS los
//     proyectos, sin excepción, hasta que exista esa versión del logo.
//   - La convención de icono: **iconos de `lucide-react`** (ver más abajo),
//     16px, `currentColor`, nunca un emoji o glifo unicode. Mismo criterio
//     que usa hoy el HRMS (`DESIGN.md` y `AppShell.jsx` ya migrados).
//   - Los items con `enDesarrollo: true` en vez de un link real -- así el
//     mapa completo del producto queda visible en la IA aunque la pantalla
//     todavía no exista, sin ofrecer un link muerto.
//   - El `.topbar` dentro de `<main>` (antes del `<ReactLenis>`), con
//     `<UserMenu />` -- sesión activa + "Cerrar sesión", ver
//     componentes/UserMenu.jsx. Requiere el paquete de auth ya copiado. Un
//     engranaje de Accesos (administración de cuentas/roles) va ahí también
//     en cuanto el proyecto tenga esa pantalla -- ver el comentario dentro
//     de `.topbar` más abajo, y la regla de Accesos en
//     ARQUITECTURA-FRONTEND.md antes de construirla: es una RUTA NORMAL con
//     su propio nav vertical (igual que cualquier vista de detalle con
//     Section Navigation), nunca un panel flotante/drawer/modal.
//
// Qué SÍ cambia por proyecto (contenido, no mecánica):
//   - `NAV_GROUPS` completo: los títulos, iconos por categoría, y las rutas
//     reales de este proyecto en particular son contenido del HRMS, no del
//     patrón. Reemplázalo por el árbol de navegación real del proyecto nuevo.
//   - El icono de `lucide-react` asignado a cada categoría -- elige el que
//     mejor represente esa categoría nueva (ver el catálogo en
//     https://lucide.dev/icons), no hace falta que coincida con el del HRMS
//     si las categorías son distintas.
//   - `RR.HH.` en `.brandName` -- el nombre corto del módulo/producto nuevo.
// ============================================================================

import { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ReactLenis } from 'lenis/react';
import { ChevronRight, Home, Settings } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { usuarioTienePermiso } from '../../utils/permisos.js';
import { NAV_GROUPS } from '../../utils/navModulos.jsx';
import { usePresence } from '../../hooks/usePresence.js';
import { Badge } from '../ui/Badge.jsx';
import { UserMenu } from './UserMenu.jsx';
import { NotificacionesBell } from './NotificacionesBell.jsx';
import styles from './AppShell.module.css';

const ICON_STROKE_WIDTH = 1.75;

// Flecha que indica "esto abre un panel a la derecha" -- mismo criterio de
// icono que las categorias de arriba (lucide-react).
function ChevronIcon() {
  return <ChevronRight size={10} strokeWidth={ICON_STROKE_WIDTH} aria-hidden="true" className={styles.chevron} />;
}

export function AppShell() {
  const location = useLocation();
  const { usuario } = useAuth();
  usePresence();
  const [openGroup, setOpenGroup] = useState(null);
  const navRef = useRef(null);
  const closeTimerRef = useRef(null);

  // La categoria "activa" (fill Azul Profundo permanente, ver Navigation en
  // DESIGN.md) es la que contiene la ruta actual -- independiente de cual
  // panel este abierto por hover/foco en este momento.
  const activeGroupTitle = NAV_GROUPS.find((group) =>
    group.items.some((item) => item.to && (location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)))
  )?.title;

  // El flyout esta separado de su fila por un gap (ver .flyout en el CSS),
  // asi que moviendo el mouse en diagonal -- sobre todo despacio -- el
  // cursor puede pasar por un pixel que no es ni la fila ni el panel y
  // dispara mouseleave de mitad de camino. Cerrar con un pequeno retraso en
  // vez de al toque, cancelable apenas el mouse vuelve a entrar a CUALQUIER
  // parte del nav, absorbe ese cruce sin que el usuario note el delay --
  // solo se cierra de verdad si el mouse (o el foco) se va del nav en serio.
  function scheduleClose() {
    closeTimerRef.current = setTimeout(() => setOpenGroup(null), 300);
  }

  function cancelScheduledClose() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function closeNow() {
    cancelScheduledClose();
    setOpenGroup(null);
  }

  function closeIfFocusLeftNav(event) {
    if (!navRef.current?.contains(event.relatedTarget)) {
      closeNow();
    }
  }

  useEffect(() => cancelScheduledClose, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Defensa general contra el bug real encontrado con Playwright
  // (2026-09-18): esta app nunca debe scrollear la página nativa -- el
  // único scroll real vive en `.scrollArea` (Lenis, ver index.css#html,body
  // { overflow: hidden }). `overflow: hidden` bloquea el scroll manejado
  // por el usuario (rueda/touch/scrollbar), pero NO bloquea que el propio
  // navegador mueva `scrollTop` de `<html>`/`<body>` -- pasa, por ejemplo,
  // cuando un elemento recupera el foco fuera de la vista (el caso real
  // encontrado: el input de archivo oculto al volver del diálogo nativo del
  // SO, corregido en FileField.module.css) y también puede pasar con
  // cualquier otro elemento enfocable (un checkbox de un dropdown, etc.)
  // que el navegador decida "traer a la vista" por su cuenta. El resultado
  // es que el `<html>` real queda desincronizado del contenido que Lenis ya
  // movió con un `transform` -- la página se ve "cortada" (la barra lateral
  // y el topbar, que viven fuera de `.scrollArea`, desaparecen). En vez de
  // perseguir cada elemento enfocable uno por uno, esto corrige la causa de
  // raíz: si `window` llega a moverse, se revierte al toque.
  useEffect(() => {
    function resetStrayScroll() {
      if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
    }
    window.addEventListener('scroll', resetStrayScroll, { passive: true });
    return () => window.removeEventListener('scroll', resetStrayScroll);
  }, []);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        {/* 2026-09-02: el logo dejó de ser un botón que lleva al inicio --
            pedido explícito del usuario, "ya no quiero que mi logo del
            sidebar sea un botón". Volver al dashboard ahora es el item
            "Inicio" de más abajo, como cualquier otro módulo. */}
        <div className={styles.brand}>
          <img className={styles.brandLogo} src="/aed-logo.png" alt="aed" />
          <span className={styles.brandDivider} aria-hidden="true" />
          <span className={styles.brandName}>CONTRATACIÓN</span>
        </div>
        {/* Dos columnas al estilo Buk/HubSpot: esta lista es solo la
            categoria (no navega a ningun lado), el segundo panel con los
            items reales aparece flotando a la derecha al pasar el mouse o
            el foco -- nunca empuja el contenido principal. "Inicio" es la
            excepción -- un destino único, sin sub-items, así que es un
            link directo (mismo estilo que el botón de categoría, sin
            flecha ni panel porque no hay nada que desplegar). */}
        <nav
          ref={navRef}
          className={styles.nav}
          aria-label="Navegacion principal"
          onMouseEnter={cancelScheduledClose}
          onMouseLeave={scheduleClose}
          onBlurCapture={closeIfFocusLeftNav}
        >
          <NavLink
            to="/"
            end
            onClick={closeNow}
            className={({ isActive }) => `${styles.navGroupButton} ${isActive ? styles.navGroupButtonActive : ''}`}
          >
            <span className={styles.navGroupLabel}>
              <Home size={16} strokeWidth={ICON_STROKE_WIDTH} aria-hidden="true" />
              Inicio
            </span>
          </NavLink>
          {NAV_GROUPS.map((group) => {
            // Un item se muestra si no es soloAdmin (o el usuario es ADMIN)
            // Y si no declara `permiso` (siempre visible, ej. Especialidades)
            // o el usuario lo tiene -- ADMIN bypassea vía usuarioTienePermiso.
            // Un grupo entero (ej. "Solicitudes Directas") se oculta si
            // ningún item suyo quedó visible -- antes de este chequeo, un
            // usuario sin acceso a Directas/Indirectas igual veía las dos
            // categorías completas en el sidebar (el bug reportado).
            const itemsVisibles = group.items.filter(
              (item) => (!item.soloAdmin || usuario?.esAdmin) && (!item.permiso || usuarioTienePermiso(usuario, item.permiso))
            );
            if (itemsVisibles.length === 0) return null;

            const isOpen = openGroup === group.title;
            const isActiveGroup = activeGroupTitle === group.title;
            const GroupIcon = group.icon;
            return (
              <div key={group.title} className={styles.navGroupRow}>
                <button
                  type="button"
                  className={`${styles.navGroupButton} ${isActiveGroup ? styles.navGroupButtonActive : ''}`}
                  onMouseEnter={() => setOpenGroup(group.title)}
                  onFocus={() => setOpenGroup(group.title)}
                  onClick={() => setOpenGroup((current) => (current === group.title ? null : group.title))}
                  aria-expanded={isOpen}
                >
                  <span className={styles.navGroupLabel}>
                    <GroupIcon />
                    {group.title}
                  </span>
                  <ChevronIcon />
                </button>
                {isOpen && (
                  <div className={styles.flyout} role="menu">
                    {itemsVisibles.map((item) =>
                      item.enDesarrollo ? (
                        <span key={item.label} className={styles.navItemDisabled} role="menuitem" aria-disabled="true">
                          {item.label}
                          <Badge variant="neutral">En desarrollo</Badge>
                        </span>
                      ) : (
                        <NavLink
                          key={item.label}
                          to={item.to}
                          // `end` obligatorio -- sin esto, NavLink matchea por
                          // PREFIJO (comportamiento default de React Router),
                          // así que "Directorio" (/terceros) quedaba marcado
                          // activo también en /terceros/especialidades, y
                          // "Todas las solicitudes" (/solicitudes) en
                          // /solicitudes/nueva -- dos items del mismo flyout
                          // encendidos a la vez. El resaltado de la categoría
                          // (el botón de afuera, `activeGroupTitle` arriba) sí
                          // debe seguir matcheando por prefijo -- por eso el
                          // fix va acá, no ahí.
                          end
                          role="menuitem"
                          onClick={closeNow}
                          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                        >
                          {item.label}
                        </NavLink>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
      <main className={styles.main}>
        <div className={styles.topbar}>
          {/* Engranaje de Accesos (Fase 2: Usuarios/Roles/Proyectos/Frentes) --
              <NavLink> normal, nunca un trigger con estado propio. Visible con
              'ver_usuarios' O 'ver_roles' (o ADMIN, que ve ademas
              Workflows/Proyectos/Frentes) -- ya no es esAdmin puro, puerto de
              HRMS 2026-09-18: un rol con solo uno de los dos permisos
              granulares igual debe ver el acceso. Las rutas de abajo ya estan
              protegidas con <ProtectedRoute permiso=.../soloAdmin>, esto es
              solo para no mostrar un link muerto a quien no puede usarlo. Si
              solo tiene 'ver_roles' (no 'ver_usuarios'), lleva directo a
              /configuracion/roles en vez de /configuracion (que redirige a
              usuarios y lo rebotaria). */}
          <NotificacionesBell />
          {(usuario?.esAdmin || usuarioTienePermiso(usuario, 'ver_usuarios') || usuarioTienePermiso(usuario, 'ver_roles')) && (
            <NavLink
              to={usuario?.esAdmin || usuarioTienePermiso(usuario, 'ver_usuarios') ? '/configuracion' : '/configuracion/roles'}
              className={styles.topbarIconLink}
              aria-label="Accesos y configuración"
            >
              <Settings size={20} strokeWidth={ICON_STROKE_WIDTH} aria-hidden="true" />
            </NavLink>
          )}
          <UserMenu />
        </div>
        <ReactLenis root={false} className={styles.scrollArea} options={{ smoothWheel: true }}>
          <Suspense fallback={<div className={styles.routeLoading}>Cargando...</div>}>
            <Outlet />
          </Suspense>
        </ReactLenis>
      </main>
    </div>
  );
}

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Solicitudes Indirectos AED (nueva arquitectura) — gestión de solicitudes de
contratación indirecta de Baía Kristal, siguiendo `Plantilla-Arquitectura-AED`
(vinculada como submódulo en `plantilla-arquitectura/`, hermana de esta
carpeta), sobre una base de datos PostgreSQL propia
(`solicitudes_indirectos_v2`, servidor remoto).

**Historia / estado (2026-09-01): la migración ya terminó.** Este repo
originalmente tenía DOS apps en paralelo: `solicitudes-indirectos/` (Next.js +
Prisma, la app real de producción) y una carpeta `SOLICITUDES/` donde se
construyó este backend+frontend nuevo, módulo por módulo, fase por fase (0-9),
verificando cada fase contra la app original antes de avanzar. Las 9 fases
están completas, los datos reales de producción ya se migraron (Fase 9,
`backend/scripts/importarDatosLegado.js`), y **el usuario pidió borrar
`solicitudes-indirectos/` y aplanar `SOLICITUDES/` a la raíz del repo** --
por eso las referencias a rutas tipo `SOLICITUDES/backend/...` en secciones
más viejas de este archivo (más abajo) hay que leerlas como `backend/...`
directo desde la raíz; no se reescribió todo el documento línea por línea,
pero la estructura real del repo HOY es la que describe la sección
"Directory layout" de abajo, sin el prefijo `SOLICITUDES/`. El plan de
migración original (fases, decisiones de arquitectura) vivió en
`~/.claude/plans/humble-wondering-crane.md` durante toda la migración -- ese
mismo archivo se **reescribió** el 2026-09-02 con el plan de "Solicitudes
Directas" (ver sección propia más abajo) una vez la migración quedó
completa y documentada acá, así que ya no sirve para reconstruir el
razonamiento de las Fases 0-9; ese razonamiento vive de ahora en más
únicamente en las secciones de este archivo.

**Pendiente del corte a producción** (no es código, son acciones/decisiones
del usuario): reconfigurar el servicio de despliegue (Coolify) para que
construya desde este Dockerfile en la raíz en vez de
`solicitudes-indirectos/Dockerfile` (ya no existe), con las variables de
entorno nuevas; generar un `JWT_SECRET` real; registrar el nuevo
`AZURE_REDIRECT_URI` (`.../api/auth/azure/callback`) en el App Registration
de Azure; recuperar 2 archivos perdidos de una solicitud real
(`SOL-ODS-BK-KALIZA1-001`). Ver la sección "Corte a producción" más abajo
para el detalle completo de cada uno.

A diferencia de Cartera (que simplificó permisos a `es_admin`+`modulos_permitidos`),
este proyecto **porta el modelo de permisos granular** de la app original: cada
`Usuario.roles` es un array (puede tener varios roles a la vez, ej.
SOLICITANTE+TECNICA), la tabla `Rol` guarda qué slugs de permiso tiene cada rol
(editable en runtime), y `funcionalidades_adicionales` permite conceder un slug
extra a un usuario puntual — ver `utils/permisos.js#tienePermiso()`. El motor de
aprobaciones de Solicitudes (Fase 4) depende de esto.

## Solicitudes Directas (2026-09-02)

Con la migración ya en producción, el usuario pidió ampliar el alcance: la
misma app pasa a manejar también contratación **directa**, no solo indirecta.
Es la misma `Solicitud`/el mismo motor de aprobación (11 estados, mismos
roles, mismo `AprobadorFrente` por concepto) parametrizado por una nueva
columna `categoria` (`'DIRECTA' | 'INDIRECTA'`) — **no** un módulo nuevo.
Todo lo real migrado en la Fase 9 quedó marcado `INDIRECTA` (era lo único que
existía). Ver el plan completo (contexto, decisiones, verificación) en
`~/.claude/plans/humble-wondering-crane.md`.

- **`Solicitud.categoria`** (`solicitud.model.js`, migración
  `20260831000504-add-categoria-solicitud.js`) — `STRING(20)`, default
  `'INDIRECTA'`, indexada (es el filtro principal de cada listado). Requerida
  en `createSchema` (Zod); no viaja por `CAMPO_DB`, así que no es parcheable
  después de creada, igual que `tipo`/`estado`. Un otrosí SIEMPRE hereda la
  categoría del padre (`solicitud.service.js#crearOtrosi` valida que lo que
  mande el cliente coincida con `parent.categoria` y persiste siempre esta
  última — nunca confiar en el valor del body para el dato real, solo para
  resolver el permiso antes de tocar la BD).
- **Consecutivo** (`solicitud.consecutivo.js`) — las indirectas mantienen el
  formato de siempre, **sin tocar nada** (compatibilidad total con los ~396
  consecutivos reales ya migrados: la `key` de `contador_consecutivos` para
  INDIRECTA se dejó bit a bit igual). Las directas llevan un segmento `D`
  (`SOL-D-{TIPO}-{PROY}-{FRENTE}-{NNN}`) y una `key` de contador nueva
  (`` `DIRECTA-${tipo}-${proyAbbr}-${frenAbbr}` ``), así que su numeración es
  independiente de la indirecta del mismo tipo/frente, arrancando en 1 sin
  colisión posible.
- **`AprobadorFrente` por categoría** — un mismo frente puede tener
  aprobadores distintos para sus solicitudes directas que para las
  indirectas (decisión explícita del usuario, no una simplificación). Pasó
  de "una fila por frente" (`frente_id` único) a "una fila por (frente,
  categoria)" (migración `20260831000505-add-categoria-aprobador-frente.js`,
  constraint única compuesta `aprobador_frentes_frente_id_categoria_key`; las
  20 filas reales quedaron marcadas `INDIRECTA`). `getByFrenteId`/`update`
  (`aprobadorFrente.service.js`) y las 4 llamadas a
  `usuarioEstaEnArrayDelFrente()` en `solicitud.estado.js` ahora exigen
  `categoria` explícita. `GET/PUT /frentes/:frenteId/aprobador` requieren
  `?categoria=`/`categoria` en el body. **Frontend**:
  `FrenteDetallePage.jsx` pasó de un solo bloque de 4 `<SelectorUsuarios>` a
  dos pestañas (Indirecta/Directa, cada una con su propio "Guardar") — mismo
  criterio de "cada sección con su propio botón" ya usado en
  `TerceroDetallePage.jsx`.
- **Permisos separados por categoría** (`utils/permisos.js`, back y front) —
  los 8 slugs del ciclo de vida de una solicitud (`crear_enviar_solicitudes`,
  `crear_otrosi`, `crear_solicitudes_diseno`, `aprobar_director_tecnico`,
  `aprobar_solicitudes_frente`, `revisar_contratos`, `registrar_adpro`,
  `aprobacion_final`) se duplicaron en variantes `_directa`/`_indirecta` (16
  slugs nuevos) — decisión explícita del usuario, no un default mío
  (`crear_terceros`/`gestionar_especialidades` no tienen relación con
  solicitudes, quedan sin dividir). El seeder de roles
  (`20260831000003-seed-roles.js`) es un no-op si `roles` ya tiene filas
  (las tiene, con los permisos reales de producción de la Fase 9) — por eso
  hizo falta una migración de **datos**, no solo de código:
  `20260831000506-split-permisos-por-categoria.js` reescribe `roles.permisos`
  y `usuarios.funcionalidades_adicionales` reemplazando cada slug viejo por
  sus dos variantes nuevas (nadie pierde acceso el día 1; el admin puede
  restringir a una sola categoría después desde `RolesPage`/
  `UsuarioFormPage` — ambas 100% data-driven desde el endpoint de
  funcionalidades, cero cambios de frontend necesarios ahí).
- **`solicitud.estado.js`** — el chequeo de permiso ahora depende de la
  categoría de la solicitud, así que la carga de `Solicitud.findByPk(...)` se
  **reordenó** para pasar ANTES del chequeo (antes ocurría al revés, cuando
  el slug era estático). `TRANSICIONES` se queda con slugs BASE sin sufijo —
  el sufijo (`_directa`/`_indirecta`) se resuelve en runtime según
  `solicitud.categoria`. Mismo patrón en `solicitud.controller.js#create`
  (usa `req.body.categoria`) y en las dos ramas de
  `solicitud.importarHistorico.js`. También se corrigieron dos chequeos que
  quedaban rotos por la sola existencia de los slugs nuevos (usaban el slug
  viejo `revisar_contratos` a secas, que ya no existe):
  `solicitud.service.js#getById` (visibilidad "ver todo") y `#update` (quién
  puede editar fuera del estado editable normal) — ambos ya tenían la
  `solicitud` cargada en memoria, así que resolver el sufijo ahí fue directo.
- **`SolicitudActions.jsx` (frontend) — el cambio más delicado**: este
  componente decidía qué botones mostrar con chequeos de ROL hardcodeados
  (`usuario.roles.includes('DIRECTOR_TECNICO')`, etc.), **sin pasar por
  `tienePermiso`/slugs en absoluto** — un mecanismo total y silenciosamente
  distinto del que se volvió la fuente real de autorización en el backend.
  Sin corregir esto, restringir un rol a una sola categoría (el objetivo
  mismo de este pedido) no habría tenido efecto visible en la UI: el botón
  seguiría apareciendo para la categoría restringida, y el usuario solo se
  habría enterado con un 403 al hacer clic. Se migraron los 12 `can*` a
  `tienePermiso(usuario.roles, usuario.funcionalidades_adicionales,
  `${slugBase}_${sufijo}`)` usando `solicitud.categoria`, con el mismo mapeo
  acción→slug que `TRANSICIONES` en el backend — las condiciones de
  `estado`/`solicitanteId`/`aprobadorId` que acompañaban cada `can*` se
  mantuvieron intactas.
- **Rutas nuevas, sin tocar `/solicitudes/:id`** — `/solicitudes/directas`
  habría colisionado exactamente con el patrón `/solicitudes/:id` (mismo
  shape de 2 segmentos; React Router no distingue por contenido, y ese
  patrón ya está en uso real por 86 notificaciones de la Fase 9 con URLs
  `/solicitudes/123`). Por eso el listado/creación por categoría vive en
  prefijos top-level separados: `/solicitudes-directas` y
  `/solicitudes-indirectas` (`App.jsx`), cada uno con su propio `Nueva
  solicitud` en `AppShell.jsx` (el grupo único "Solicitudes" del sidebar se
  separó en dos: "Solicitudes Directas"/"Solicitudes Indirectas", con
  íconos `lucide-react` distintos). El detalle/edición por id
  (`/solicitudes/:id`, `/solicitudes/:id/editar`) y el import histórico
  (`/solicitudes/importar-historico`) NO se movieron. Los 4 wrapper
  `Nueva*Page.jsx` (`NuevaContratoPage`, etc.) y `NuevaSolicitudTipoPage.jsx`
  reciben `categoria` como PROP del elemento de ruta (`<NuevaContratoPage
  categoria="DIRECTA" />`), no como route param — evita duplicar 8 archivos
  wrapper nuevos.
- **`ImportarHistoricoPage.jsx`** ganó un selector de categoría (mismo
  patrón visual que el picker CONTRATO/OTROSI ya existente) — el buscador de
  "contrato base" en modo OTROSI filtra por la categoría elegida, igual que
  `OtrosiForm.jsx`. Como esta página no vive bajo un prefijo de ruta
  categorizado, la categoría se elige DENTRO del formulario, no se infiere
  de la URL.
- **Gap encontrado durante la implementación, corregido de una vez**:
  `DashboardPage.jsx` tenía 5 links (`to="/solicitudes"` × 4 KPIs + "Ver
  todas" + un `navigate('/solicitudes/nueva')`) que dejaron de tener
  cualquier ruta a la que apuntar (antes ya eran un enlace "roto" en el
  sentido de que `SolicitudesPage` nunca leía el querystring `?estado=...`,
  pero al menos la ruta existía) — se apuntaron a `/solicitudes-indirectas`
  como default razonable (el único universo que existía hasta hoy). El
  Dashboard en sí **no distingue categoría** en sus KPIs (mezcla
  directas+indirectas) — quedó fuera de alcance a propósito, no es un
  descuido.

**Corrección del mismo día (2026-09-02)**: se descubrió que el desvío de
ENVIAR a `PENDIENTE_DIRECTOR_TECNICO` (rol `TECNICA`) NO tenía guard de
`categoria` -- una DIRECTA de un solicitante `TECNICA` habría pasado por
Director Técnico igual, contradiciendo el flujo real de negocio ("el área
de Técnica no participa en solicitudes directas": Solicitante → Director de
Proyecto → Trámite Contratos → Creación de Minuta → N° Adpro/Controles →
Aprobación Final → Completada, sin excepción). Corregido en
`solicitud.estado.js` agregando `solicitud.categoria === 'INDIRECTA'` a la
condición -- **este fix quedó luego absorbido por el módulo Workflows** (ver
abajo), que reemplazó ese `if` hardcodeado por una fila configurable en
`workflow_desvios`.

## Módulo Workflows (2026-09-02)

Después del fix de arriba, el usuario pidió no depender de un cambio de
código la próxima vez que el negocio ajuste una regla así — quiere
configurar el motor de aprobación desde una pantalla. Se le presentaron dos
alcances (parámetros sobre el flujo fijo vs. un motor de workflows genérico
tipo BPM) y **eligió explícitamente el primero**: la secuencia de 11
estados/acciones de `solicitud.estado.js` sigue hardcodeada (no hay builder
de estados/transiciones) — lo configurable es (1) qué permiso exige cada
acción y (2) desvíos condicionales rol+categoría → estado alternativo,
activables/desactivables sin borrar la config. Un motor genérico se
descartó a propósito: sin suite de tests automatizada, y esto gatea
aprobaciones reales de contratos — el riesgo de un builder totalmente libre
no se justificaba frente al problema real (una regla condicional puntual
había cambiado dos veces en el mismo día).

- **`workflow_pasos`** (`backend/src/modules/workflow/workflowPaso.model.js`)
  — una fila fija por acción (11, no se crean/borran desde la UI), con
  `permisos_base` JSONB (slugs SIN sufijo — el `_directa`/`_indirecta` se
  sigue resolviendo en runtime según `categoria`, igual que siempre).
  Reemplaza `TRANSICIONES[accion].permisosPermitidos`.
- **`workflow_desvios`** (`workflowDesvio.model.js`) — 0 o más filas por
  acción; `condicion_rol`/`condicion_categoria` NULL = "aplica sin esa
  condición" (AND entre ambas si las dos están puestas), `estado_destino`,
  `activo`. Reemplaza el único `if` hardcodeado que existía para ENVIAR.
- **Migraciones, no seeders, para los datos iniciales**
  (`20260831000507`/`508`/`509`) — mismo criterio que
  `20260831000506-split-permisos-por-categoria.js`: en producción
  `entrypoint.sh`/`npm start` solo corren `db:migrate`, **nunca** `db:seed`,
  así que sembrar las 11 filas de `workflow_pasos` + el desvío de ENVIAR
  como un seeder de `sequelize-cli db:seed:all` las habría dejado vacías
  para siempre en un deploy real. `20260831000509-seed-workflow.js` es una
  migración con el mismo patrón idempotente (`SELECT COUNT(*)`, insertar
  solo si está vacía) que cualquier seeder de este proyecto, pero SÍ corre
  sola en cualquier ambiente. Los valores sembrados son bit a bit los que
  `TRANSICIONES`/el `if` de `solicitud.estado.js` tenían hardcodeados —
  este deploy no cambia ningún comportamiento real, solo lo vuelve editable.
- **`workflow.service.js#getPermisosBase()`/`getDesviosActivos()`** — los
  helpers de RUNTIME que consume `solicitud.estado.js`, mismo criterio de
  resiliencia que `utils/permisos.js#getRolesFuncionalidades()`: si la fila
  no existe o la tabla no existe todavía (query lanza), caen a un mapa
  hardcodeado que reproduce el comportamiento original — un ambiente que
  corrió `db:migrate` sin este módulo (imposible en la práctica, ya que la
  migración de seed corre junto con las demás, pero es la misma defensa en
  profundidad que ya existía para roles) no se queda sin motor de
  aprobación.
- **`solicitud.estado.js` reescrito**: `TRANSICIONES` se renombró a
  `ESTADOS_ORIGEN` y perdió `permisosPermitidos` (la secuencia de estados
  sigue fija ahí, a propósito); el chequeo de permiso ahora resuelve
  `await workflowService.getPermisosBase(accion)` en vez de un array
  literal; el desvío ahora es un loop genérico sobre
  `workflowService.getDesviosActivos(accion)` que evalúa `condicion_rol`/
  `condicion_categoria` contra la solicitud real — funciona para cualquier
  acción, no solo ENVIAR, sin volver a tocar este archivo si el negocio
  agrega otro desvío en el futuro.
- **Frontend** (`/configuracion/workflows`, admin-only, mismo patrón
  lista+detalle que Roles/Frentes): `WorkflowsPage.jsx` lista las 11
  acciones con sus permisos actuales; `WorkflowDetallePage.jsx`
  (`/configuracion/workflows/:accion`) edita `permisos_base` vía
  `<CheckboxGroup>` y los desvíos de esa acción con edición inline por fila
  (mismo patrón que `ProyectosPage.jsx`) — rol/categoría/estado destino vía
  `<Select>`, "Cualquiera" = sin esa condición, más un form para agregar un
  desvío nuevo. `PERMISOS_BASE_LABELS` (nuevo, `utils/permisos.js`) es un
  mapa chico solo para este selector — los 6 slugs base no tienen label
  propio en ningún otro lado (`FUNCIONALIDADES_DISPONIBLES` solo trae las
  variantes ya sufijadas).

**`WorkflowsPage.jsx` rediseñado como diagrama de flujo (2026-09-02)** — el
primer corte era una tabla plana de 11 filas; el usuario pidió verlo como el
flujo real, vertical, en un canvas arrastrable. Se agregó `@xyflow/react`
(primera dependencia npm nueva de este proyecto desde el scaffold inicial —
`frontend/package.json`) en vez de construir un SVG a mano: da pan/zoom/
arrastre de nodos gratis, que era parte explícita del pedido ("hoja tipo
canvas para poder arrastrar").

- `EstadoNode.jsx` (nodo custom) — una caja por ESTADO, coloreada con
  `ESTADO_BADGE_VARIANT` (mismo mapa que ya usa `<SolicitudBadge>` en toda la
  app, cero paleta nueva). Cada nodo declara sus propios `Handle` (puntos de
  anclaje) vía `data.handles` -- no todos los nodos necesitan los mismos
  (ej. `ENVIADA` tiene 4: entra desde arriba y desde la derecha, sale hacia
  abajo y hacia la derecha).
- `AccionEdge.jsx` (arista custom) — cada flecha es una ACCIÓN; la píldora
  clickeable (`EdgeLabelRenderer`) navega a `WorkflowDetallePage.jsx`. Como
  `DEVOLVER` tiene 3 orígenes posibles y `REENVIAR` 2, esas líneas comparten
  color/estilo pero solo UNA por acción trae `data.pildora` (evita repetir
  la misma etiqueta 3 veces superpuesta) -- el campo se llama `pildora`, no
  `accion`, justamente para poder tener varias aristas de la misma acción
  con una sola etiqueta visible.
- **`nodesConnectable={false}` + `elementsSelectable={false}`** en el
  `<ReactFlow>` -- se puede arrastrar la posición de los nodos (el pedido
  explícito), pero no dibujar una conexión nueva ni seleccionar/borrar nada:
  la FORMA del flujo sigue sin ser editable, coherente con la decisión
  original del alcance de este módulo. Las posiciones arrastradas no se
  persisten (es para acomodar la lectura en el momento, no un editor de
  layout guardado).
- Nodo fantasma `ENVIO_CONTRATO_POLIZAS` (origen de `PASAR_CONTROLES`,
  borde punteado y atenuado) y el conector punteado sin píldora entre
  `BORRADOR` y `PENDIENTE_DIRECTOR_TECNICO` (indica visualmente que `ENVIAR`
  puede desviarse, sin ser una acción en sí misma) se mantuvieron del primer
  diseño SVG.
- Verificado con `esbuild --bundle` apuntando a `@xyflow/react` real (no
  solo un chequeo de sintaxis) para confirmar que los named exports usados
  (`ReactFlow`, `Background`, `Controls`, `MarkerType`, `Position`,
  `Handle`, `BaseEdge`, `EdgeLabelRenderer`, `getSmoothStepPath`) existen en
  la versión instalada (`^12.11.6`) antes de darlo por bueno -- no se pudo
  probar visualmente en un navegador real desde la sesión que lo construyó.

## Estado de la migración

- **Fase 0 (esqueleto) — hecha.** Monorepo `backend/`+`frontend/`, submódulo de
  plantilla, `DESIGN.md`/`tokens.css`, `AppShell` con `NAV_GROUPS` (Solicitudes/
  Terceros/Actividad, todo `enDesarrollo: true` todavía).
- **Fase 1 (usuario/auth/SSO) — hecha.** Ver detalle abajo.
- **Fase 2 (Configuración: Proyectos/Frentes/AprobadorFrente/Roles) — hecha.**
  Ver detalle abajo. Ruta real: engranaje del topbar (solo visible para ADMIN)
  → `/configuracion/*`, con su propio `AccesosLayout` (nav vertical: Usuarios,
  Roles, Proyectos, Frentes).
- **Fase 3 (Terceros + Especialidades + sync SharePoint) — hecha.** Ver
  detalle abajo. Rutas reales en `NAV_GROUPS` → Terceros → Directorio
  (`/terceros`) y Especialidades (`/terceros/especialidades`). Verificado
  contra el SharePoint real de producción: 387 terceros sincronizados sin
  errores de lógica (3 errores del propio dataset, no de código).
- **Fase 4 (Solicitudes — núcleo, máquina de estados) — hecha.** Ver detalle
  abajo. Verificado de punta a punta (backend por `curl` con los 8 usuarios
  reales de la Fase 2, frontend en el navegador): BORRADOR → ENVIADA → EN_TRAMITE_CONTRATOS
  → CREACION_MINUTA → EN_CONTROLES → APROBACION_FINAL → COMPLETADA, la
  desviación a PENDIENTE_DIRECTOR_TECNICO, y los rechazos (aprobador
  incorrecto, nota faltante, reenviador incorrecto, anexos faltantes). Rutas
  reales en `NAV_GROUPS` → Solicitudes → Todas las solicitudes/Nueva
  solicitud.
- **Fase 5 (Cronograma + generación de documentos) — hecha.** Ver detalle
  abajo. Verificado con `curl` (crear/leer cronograma, generar `.docx` y
  `.xlsx` reales) y por lectura de código el resto (regla de 13 días hábiles,
  herencia de cronograma al crear un otrosí, bloqueo de contrato vencido) —
  ya no se usa Playwright para verificar frontend en esta migración (el
  usuario revisa la UI directamente).
- **Fase 6 (Notificaciones + Actividad/Presencia) — hecha.** Ver detalle
  abajo. Verificado con `curl` de punta a punta: login → ENVIAR una
  solicitud real → el aprobador recibe la notificación en `GET
  /notificaciones`; `/actividad/{historial,sesiones,stats,export}` y
  `/presence` probados con datos reales (incluye actividad real generada por
  el propio navegador del usuario mientras probaba el frontend en paralelo).
  Ruta real: Actividad → Historial de actividad (`/actividad`, solo ADMIN).
- **Fase 7 (Dashboard) — hecha.** Ver detalle abajo. Verificado con `curl`
  contra usuarios reales de distintos roles (ADMIN, SOLICITANTE,
  DIRECTOR_PROYECTO) -- los 4 KPIs y la lista de recientes escopean
  correctamente por visibilidad en cada caso. Ruta real: `/` (índice,
  reemplaza el placeholder de `InicioPage` de las Fases 0-6 -- es a donde
  redirige el login, igual que en el original).
- **Fase 8 (Import histórico + archivos reales) — hecha.** Ver detalle
  abajo. Verificado con `curl`: subida real de archivo → descarga
  autenticada → extensión bloqueada rechazada → import de un CONTRATO
  histórico → import de un OTROSI histórico sobre ese mismo contrato. Ruta
  real: `/solicitudes/importar-historico` (enlazada desde el paso 1 de
  `OtrosiForm.jsx`, igual que en el original).
**Corte a producción -- arquitectura de despliegue (2026-09-01)**

Un solo contenedor: el proceso de Express sirve también el build estático
del frontend (mismo patrón que `Human-Resource-Management-System-AED`).
Decisión explícita del usuario tras plantear la alternativa (dos servicios
separados, sin cambios de código, vs. este refactor) -- eligió este por
terminar en un solo servicio/dominio, igual que el resto de la familia.

**Cambio de raíz que esto obligó**: TODAS las rutas de la API ahora viven
bajo `/api/*` (`backend/src/app.js#app.use('/api', routes)`, antes montado
en `/`). Es obligatorio porque varias rutas de API coinciden EXACTAMENTE con
una página real del frontend en el mismo path -- `GET /solicitudes/:id`
(API) vs. `/solicitudes/:id` (la vista de detalle); sin el prefijo, un
refresh del navegador en esa página le pegaría al JSON de la API en vez de
servir el SPA. `frontend/src/api/client.js#API_BASE_URL` ya apunta a
`.../api` por defecto (dev y producción usan el mismo prefijo a propósito,
para no tener un comportamiento distinto entre los dos) -- **cualquier
código nuevo que arme una URL de fetch a mano en vez de pasar por ese
cliente también necesita el prefijo**. También se actualizó el default de
`AZURE_REDIRECT_URI` en `auth.azure.js`/`.env.example` a
`.../api/auth/azure/callback`.

`backend/src/app.js`: después de montar `/api`, si existe
`frontend/dist/` (el build de Vite, solo se genera dentro de la imagen
Docker -- en dev esta carpeta no existe y este bloque no hace nada) sirve
esos estáticos y cae a `index.html` para cualquier GET que no sea `/api/*`
ni un archivo real (SPA fallback). Un `/api/*` que no matchea ninguna ruta
real sigue devolviendo el 404 normal de Express, nunca `index.html`.

`SOLICITUDES/Dockerfile` (+ `entrypoint.sh`, `.dockerignore`) -- copiado del
mismo patrón que `Human-Resource-Management-System-AED/Dockerfile`: 3 stages
(build frontend con Vite, instalar deps del backend sin `devDependencies`,
imagen final que junta ambos). **`VITE_API_URL` es un build-arg, no una env
var de runtime** -- Vite la incrusta en el bundle en tiempo de compilación
(`docker build --build-arg VITE_API_URL=https://tu-dominio/api .`), a
diferencia de `PGHOST`/`JWT_SECRET`/etc. que sí se leen recién al arrancar
el contenedor. `entrypoint.sh` corre `npm start` (ya encadena
`db:migrate` + arranque, ver `backend/package.json`) -- **nunca**
`db:seed`, la base de producción ya tiene los datos reales de la Fase 9,
sembrar el dataset de demo encima sería un error real, no un no-op.

Verificado sin Docker corriendo en esta sesión (Docker Desktop no estaba
disponible): build real de Vite con `VITE_API_URL` real (confirmado el
string embebido en el bundle final), y el backend real sirviendo ese `dist/`
en un puerto de prueba -- SPA fallback para una ruta del frontend, assets
estáticos con content-type correcto, `/api/solicitudes` funcionando, y
`/api/ruta-inexistente` devolviendo 404 real (no `index.html`). No se pudo
probar el `docker build` en sí (daemon no disponible), pero cada paso que
hace el Dockerfile se probó por separado con el mismo resultado esperado.

**Variables de entorno de producción** -- el usuario compartió las de la
app actual (Next.js); la traducción a las que necesita el backend nuevo
(discretas `PG*` en vez de un `DATABASE_URL`, sin `NEXTAUTH_*`/
`MICROSOFT_*`/`SHAREPOINT_SITE_ID` que este backend no usa) se le entregó
en el chat, no en este archivo (contienen secretos reales). Puntos clave a
no olvidar si se retoca el despliegue más adelante: `JWT_SECRET` debe ser
uno **nuevo**, nunca `NEXTAUTH_SECRET` reciclado (son sistemas de auth
distintos); `MASTER_KEY_HASH` se copia **sin** escapar los `$` (este backend
usa `dotenv` plano, no `dotenv-expand` -- lo contrario de la app original);
`LEGACY_DATABASE_URL` **no** debe configurarse en producción (es una
credencial de migración de un solo uso, ya se usó); y falta agregar el
nuevo `AZURE_REDIRECT_URI` (`.../api/auth/azure/callback`) como Redirect URI
en el App Registration de Azure -- acceso al Portal que esta sesión no
tiene, pendiente de que el usuario lo haga.

- **Fase 9 (Datos reales) — hecha, corte de tráfico pendiente.** `solicitudes_indirectos_v2`
  ya tiene el snapshot real de producción (corrido 2026-08-31): 28 usuarios,
  9 roles, 2 proyectos, 20 frentes, 66 especialidades, 396 terceros, 3
  solicitudes, 22 entradas de historial, 3 cronogramas, 86 notificaciones,
  1518+ registros de actividad, 22 contadores de consecutivo. Ver detalle
  abajo. **El corte real de tráfico** (Dockerfile/DNS/variables de
  producción apuntando a `SOLICITUDES/` en vez de `solicitudes-indirectos/`)
  sigue siendo una decisión operativa aparte, no tomada todavía.

## Commands

Desde la raíz (`SOLICITUDES/`): `npm run dev` levanta backend (puerto **3021**)
y frontend (puerto **5193**, Vite) juntos. `npm run install:all` instala ambos
sub-paquetes de una. `npm run db:migrate`/`db:seed` proxean al backend.

Comandos individuales corren desde `backend/`:

```
npm install           # instalar dependencias
npm run db:migrate    # aplicar migraciones pendientes via sequelize-cli (idempotente)
npm run db:seed       # sequelize-cli db:seed:all (admin + los 8 roles base, idempotente)
npm run dev            # nodemon src/server.js
npm start               # sin watch (corre migraciones primero, usado en producción)
```

Requiere un `.env` (copiar `.env.example`) con `PGHOST/PGPORT/PGUSER/PGPASSWORD/
PGDATABASE` (Postgres remoto compartido con la app actual, base separada
`solicitudes_indirectos_v2`), `CORS_ORIGIN`, `FRONTEND_URL`, `PORT`, `JWT_SECRET`,
`AZURE_TENANT_ID/AZURE_CLIENT_ID/AZURE_CLIENT_SECRET/AZURE_REDIRECT_URI` (SSO +
más adelante el sync de terceros con SharePoint), `SHAREPOINT_FILE_ID`,
`MASTER_KEY_HASH` (opcional). Ver la nota de Azure AD abajo — el redirect URI de
`AZURE_REDIRECT_URI` tiene que estar registrado en el App Registration de Azure
o el login SSO falla con `AADSTS50011`.

No hay suite de tests automatizada todavía — la verificación es manual vía
`curl`/Postman contra el servidor corriendo y navegación manual del frontend
(Playwright cuando el navegador está disponible).

## Backend architecture (`backend/src`)

**Con ORM (Sequelize).** Mismas reglas que `ARQUITECTURA-BACKEND.md` (en
`plantilla-arquitectura/`, léelo antes de escribir el primer módulo nuevo): 5
archivos por módulo, migraciones forward-only con `sequelize-cli`, lógica de
negocio siempre en `.service.js` nunca en `.model.js`, `zDateOnly()` para
columnas `DATEONLY`.

**Módulo `usuario`** (`modules/usuario/`) — adaptado de la plantilla: en vez de
un `rol` string único, `roles` es un array JSONB (`["SOLICITANTE","TECNICA"]`,
etc.) + `funcionalidades_adicionales` (array de slugs concedidos a mano) +
`cargo`/`telefono`/`microsoft_id`/`microsoft_email`/`ultima_conexion`. `ADMIN`
dentro de `roles` es bypass total (`requireAdmin`/`tienePermiso`), no un
booleano separado.

**Módulo `rol`** (`modules/rol/`, nuevo — no viene en la plantilla) — tabla
`roles` editable en runtime (`nombre`, `permisos` JSONB, `ver_todas_solicitudes`),
sembrada con los 8 roles de negocio + ADMIN y sus permisos base (puerto literal
de `FUNCIONALIDADES_POR_ROL`/`FALLBACK_VER_TODAS` de
`solicitudes-indirectos/src/lib/utils.ts`+`roles.ts`). `utils/permisos.js#
getRolesFuncionalidades()`/`getRolesVerTodas()` leen esta tabla con fallback al
mapa hardcodeado si está vacía.

**Módulo `auth`** (`modules/auth/`) — login por contraseña + refresh + cambiar
password, copiado de la plantilla (cookies `solind_access_token`/
`solind_refresh_token`, prefijo obligatorio — ver "Nombres de cookie por
proyecto" en ARQUITECTURA-BACKEND.md, no reutilizar `hrms_`/`scp_bases_`/
`cartera_`). `MASTER_KEY_HASH` como fallback de login (mismo log
`[MASTER_KEY_LOGIN]` que el original).

**SSO de Azure AD** (`modules/auth/auth.azure.js`) — hecho a mano con
`@azure/msal-node` (`ConfidentialClientApplication`, flujo de código de
autorización), la plantilla no trae esto. `GET /auth/azure/login` (login
normal), `GET /auth/azure/link` (requireAuth — vincular la cuenta de un usuario
ya logueado, vía la cookie de corta vida `solind_ms_link_intent`), `GET
/auth/azure/callback` (ambos casos), `POST /auth/azure/unlink`. Mismo
comportamiento que el `signIn`/`jwt` callback de next-auth en la app original:
sin `microsoft_id` vinculado → `OAuthAccountNotFound`/`OAuthNotLinked`, usuario
inactivo → `OAuthAccountInactive`.

**Pendiente de configurar en Azure Portal (no lo puede hacer una sesión de
Claude Code):** agregar `http://localhost:3021/auth/azure/callback` (y más
adelante el equivalente de producción) como Redirect URI tipo "Web" en la app
`32e9b6d7-5990-4c79-bf54-bde2561e4231` (App registrations > Authentication) —
sin esto el login con Microsoft falla con `AADSTS50011: redirect URI mismatch`.
No se pudo probar el flujo real de SSO en esta sesión por esta razón; sí se
probó login por contraseña, cambio de contraseña forzado, sesión persistente
por cookie, `/usuarios/me`, `requireAdmin`, y `tienePermiso()` contra la tabla
`Rol` sembrada.

**Módulo `proyecto`** (`modules/proyecto/`) — puerto directo de `model Proyecto`.
Lectura para cualquier autenticado, escritura solo ADMIN. Sin delete físico
(`activo` toggle).

**Módulos `frente`/`aprobadorFrente`** (`modules/frente/`, `modules/aprobadorFrente/`)
— puerto de `Frente`/`FrenteUsuario`/`AprobadorFrente`. `FrenteUsuario` es una
tabla puente explícita (PK compuesta), expuesta vía
`Frente.belongsToMany(Usuario, { through: FrenteUsuario })` para poder hacer
`include` directo; `frente.service.js#setUsuarios()` reemplaza TODA la
asignación de un frente de una vez (`destroy` + `bulkCreate` en una
transacción) en vez de diffear. Los 4 arrays de `AprobadorFrente`
(`aprobador_ids`/`contratos_tramite_ids`/`contratos_minuta_ids`/
`director_controles_ids`) son `DataTypes.JSONB` nativo (mejora sobre el
JSON-string-en-TEXT que forzaba Prisma sin adapter), pero el filtrado de
pertenencia se sigue resolviendo en memoria en el service que los consuma
(Fase 4), no con `@>` de Postgres, para no cambiar el comportamiento del motor
de aprobaciones. `aprobadorFrente.routes.js` usa
`express.Router({ mergeParams: true })`, montado en
`/frentes/:frenteId/aprobador` desde `routes/index.js`. `GET` siempre
devuelve una fila (crea la config vacía la primera vez que se consulta un
frente sin una, vía `findOrCreate`).

**Registro central de modelos** (`backend/src/models/index.js`) — desde la
Fase 2 hay asociaciones reales entre módulos (`Proyecto`↔`Frente`,
`Frente`↔`Usuario` vía `FrenteUsuario`, `Frente`↔`AprobadorFrente`), así que
existe este archivo único que importa todos los `.model.js` y llama a su
`associate(models)` — requerido una sola vez desde `app.js`, antes de montar
`routes/index.js`. Cualquier módulo nuevo con asociaciones se registra acá,
nunca resolviendo `associate()` desde otro lugar.

**Datos de demo** (`db/seeders/20260831000104-seed-demo-proyectos.js`) — mismo
dataset que `prisma/seed.ts` de la app original: proyectos "Baia Kristal"/"Oliv",
10 frentes (KALIZA 1-4, KALA 1-4, LIVA, SEIVA), los 7 usuarios de negocio +
admin (mismos emails/`Abc123!`, ver seed credentials más abajo), asignación de
frentes por usuario, y `AprobadorFrente.aprobador_ids` (Carlos Rodríguez →
KALIZA, Valentina Torres → KALA). Idempotente por email/nombre único —
`npm run db:seed` no duplica si ya corrió.

**Módulos `tercero`/`especialidad`** (`modules/tercero/`, `modules/especialidad/`)
— puerto de `Tercero`/`Especialidad`/la relación implícita m:n
`TerceroEspecialidades` (ahora explícita, `TerceroEspecialidad`, mismo
criterio que `FrenteUsuario`). La API expone **camelCase** (`razonSocial`,
`tipoContrato`, etc. — mismo vocabulario que la app Next.js original, para
comparar/migrar datos reales en la Fase 9) sobre columnas **snake_case** en la
BD; `tercero.service.js` es el único archivo que traduce entre los dos
(`CAMPO_DB`/`_enrich()`) — cualquier campo nuevo de `Tercero` se agrega en las
tres partes: modelo (snake_case), migración, y ese mapa.

Permisos de escritura de `Tercero` son **dinámicos según el body**, no
estáticos por ruta: los campos de contacto (`nit`, `representanteLegal`,
`correoFirma`, etc. — ver `CONTACT_FIELDS` en `tercero.schema.js`) los puede
tocar cualquier autenticado; cualquier otro campo (los 6 `dd_*`, `tipoContrato`,
`confidencialidad`) exige el permiso `editar_terceros`. Ese slug **no está**
en `FUNCIONALIDADES_DISPONIBLES` (`utils/permisos.js`) — es intencional, mismo
comportamiento que la app original: solo `ADMIN` lo satisface por defecto
(bypass total), a menos que se conceda como `funcionalidades_adicionales` a un
usuario puntual desde `UsuarioFormPage`.

`aprobado_debida_diligencia` se escribe por DOS caminos independientes que
coexisten a propósito (igual que el original): (1) `tercero.service.js#update()`
lo deriva automáticamente a `true` solo cuando los 6 campos `dd_*` quedan
TODOS en `true` tras un PATCH que toca alguno de ellos; (2)
`tercero.sync.js` lo setea directo desde la columna `DD` del Excel de
SharePoint, sin pasar por los 6 booleanos. La pantalla de debida diligencia
(`TerceroDetallePage.jsx`) es contenido nuevo de esta migración — la app
original tenía los 6 campos en el modelo y la API pero **nunca** una UI para
editarlos manualmelte, solo se llenaban vía sync.

**`tercero.sync.js`** — puerto casi literal de
`api/terceros/sync-sharepoint/route.ts` (fetch + OAuth2 client-credentials
contra Microsoft Graph, sin SDK). Un bug se corrigió al portar: el upsert
original de Prisma escribía el `nit` en el `create` pero NUNCA en el
`update`; un `Model.upsert()` de Sequelize aplica el MISMO objeto de valores a
ambos caminos, así que un upsert ingenuo habría vaciado (`nit: ''`) el NIT de
cualquier tercero ya completado a mano en cada sync. Se resolvió a mano
(`findOne` → `update` sin `nit` | `create` con `nit: ''`) — ver el comentario
en `upsertTerceros()`. Verificado contra el SharePoint real: 387/390
registros sincronizados.

**Módulo `solicitud`** (`modules/solicitud/`, Fase 4 — el núcleo del dominio)
— puerto de `Solicitud`/`HistorialSolicitud`/`ContadorConsecutivo` (~40
columnas, mismo criterio camelCase-API-sobre-snake_case-BD que `tercero`).
Varios archivos, cada uno con una responsabilidad:

- `solicitud.consecutivo.js` — `abbreviate`/`normalizeFrenteName`/
  `buildConsecutivo` (puerto literal de `src/lib/utils.ts`) +
  `generarConsecutivo()`, que **no** usa `findOrCreate`+incremento (dos pasos
  no atómicos, hay una carrera real entre el find y el update bajo
  concurrencia) sino un `INSERT ... ON CONFLICT DO UPDATE SET ultimo =
  ultimo + 1` de una sola sentencia -- el mismo nivel de atomicidad que el
  `upsert` de Prisma original, con bind parameters posicionales.
- `solicitud.otrosi.js` — `nextNumeroOtrosi`/`pickMostRecentOtrosi`, puerto
  literal de `src/lib/otrosi.ts`.
- `solicitud.estado.js` — la máquina de estados completa (puerto literal de
  las 454 líneas de `api/solicitudes/[id]/estado/route.ts`): `TRANSICIONES`/
  `ESTADO_DESTINO`, las 11 acciones, todas las validaciones por acción
  (campos obligatorios al ENVIAR, nota obligatoria en DEVOLVER/REVISAR,
  pertenencia a los arrays de `AprobadorFrente` para
  APROBAR_DIRECTOR/TRAMITAR_OK/AVANZAR_CONTRATOS/APROBAR_FINAL, el desvío a
  PENDIENTE_DIRECTOR_TECNICO, la propagación de `valorFinal` al padre en un
  OTROSI_TIEMPO_CANTIDAD completado), dentro de un `sequelize.transaction()`.
  Las notificaciones del original (`notificarNuevaSolicitud`, etc.) se
  difieren a la Fase 6 -- hay un TODO explícito en el archivo, la transición
  de estado en sí ya es correcta y completa sin ellas.
- `solicitud.service.js` — `list()`/`getById()` (visibilidad),
  `create()`/`crearNormal()`/`crearOtrosi()`, `update()`, `remove()`.

**Corregido respecto al original**: `GET /api/solicitudes` en la app Next.js
restringía la query SQL a un `where.OR` de "soy responsable de esto" ANTES de
aplicar el filtro en memoria por pertenencia a frente -- eso hacía que ese
filtro en memoria nunca pudiera aportar nada (las filas por frente ya estaban
excluidas a nivel SQL), contradiciendo la regla documentada arriba
("Visibilidad"). Acá se trae el conjunto candidato sin esa restricción y el
filtro en memoria aplica las dos condiciones de verdad (responsable OR
frente) -- una app en producción nunca se enteró de este hueco porque
under-showing es un bug silencioso, no un error visible.

**Quirk portado tal cual, no corregido** (documentar, no arreglar): el
selector de contratista del wizard (`SolicitudForm.jsx#terceroSeleccionable`)
exige `aprobadoDebidaDiligencia && confidencialidad` -- la revisión de este
código hizo notar que `confidencialidad` como requisito estricto es raro
semánticamente (¿por qué un contratista tendría que ser "confidencial" para
aparecer en el selector?), pero es exactamente lo que hace
`solicitudForm.tsx` original, y con los datos reales de SharePoint (271
aprobados, 257 con `confidencialidad=true`) el impacto es pequeño (~14
contratistas aprobados quedarían invisibles). Vale la pena que el negocio lo
confirme -- si es un bug real del original, se puede quitar la condición acá
sin tocar nada más.

**Datos reales de SolicitudActions/SolicitudForm**: `contratanteNombre`/
`contratanteNit` que el wizard envía siempre son `"PROMOTORA BARLOVENTO DEL
MAR S.A.S"`/`"901307871"` -- ese es el valor que el formulario React
original realmente mandaba (hardcodeado en sus `defaultValues`), **no** el
default `"AED CONSTRUCTORES S.A.S"`/`"901237628-1"` del modelo Prisma (que
solo aplicaba si el campo llegaba `undefined`, algo que nunca pasaba viniendo
de ese formulario) -- se portó el comportamiento real observado, no el
default del schema.

**Diferido a fases posteriores**: adjunto real de archivos (Fase 8,
`POST /upload`) -- por ahora `archivoCuadroComparativo`/`archivoCotizacion`/etc.
siguen siendo campos de texto libre (una referencia/nombre), no una subida
real. Cronograma, generación de documento y export ya se portaron en la Fase 5
(ver sección propia abajo).

**Corrección post-Fase 9 (2026-09-01): el detalle no mostraba toda la
información real.** El puerto original de la Fase 4 (`SolicitudDetallePage.jsx`)
era un resumen, no el detalle completo del original
(`(app)/solicitudes/[id]/page.tsx`) -- al probar con datos reales de
producción se notó que faltaban secciones enteras, principal reporte del
usuario: **no mostraba ningún archivo adjunto**, ni los 6 campos
`archivo*` ni `archivosAnexos` (los backend ya los devolvía completos desde
la Fase 4/8 -- era 100% un hueco de UI, no de API). Se corrigió de una:

- `solicitud.service.js#getById` gana `proyectoNombre`/`frentesNombres`/
  `etapasUnicas` (antes no se resolvían -- el original los calculaba con dos
  queries extra en la propia Server Component; acá se resuelven una vez en
  el service, mismo criterio que `dashboard.service.js#recientes`).
- `SolicitudDetallePage.jsx` reescrito para cubrir todo lo que mostraba el
  original: banner "Este otrosí pertenece al contrato base X" cuando
  `solicitudPadre` existe; card "Información del solicitante" (cargo, correo,
  fecha aprobación director, director aprobador -- ya venían en la API,
  nunca se pintaban); card "Proyecto y frentes" (nombre de proyecto, frentes,
  etapas como chips, N° Adpro); "Datos de la solicitud" ganó Tercero (como
  link a `/terceros/:id`), Tipo de contrato, Alcance, Términos de referencia,
  Condiciones especiales (los tres últimos ya eran editables en
  `SolicitudForm.jsx` desde la Fase 4, pero el detalle nunca los mostraba);
  **sección nueva "Documentos adjuntos"**: los 6 `archivo*` como links de
  descarga (con el prefijo de `API_BASE_URL` para los subidos por esta app,
  `/files/...`, vs. una URL absoluta tal cual para un anexo externo) más
  `archivosAnexos` con el mismo chip de plataforma (SharePoint/Drive/
  Dropbox/Enlace) que ya usaba `SolicitudActions.jsx`.
- **Bug propio corregido de paso**: el banner de `notaContratacion` estaba
  condicionado a `estado === 'DEVUELTA' || estado === 'EN_REVISION'` -- una
  restricción que el original NUNCA tenía (ahí se muestra siempre que el
  campo tenga valor, sin importar el estado actual). Con datos reales esto
  escondía notas reales: la solicitud `SOL-ODS-BK-KALA2-001` pasó por un
  ciclo `REVISAR`→`REENVIAR` y quedó `COMPLETADA`, pero su nota de revisión
  ("No se pueden descargar los archivos...") seguía siendo información
  relevante del expediente -- ya no se oculta.
- **Excepción a esa regla (2026-09-21, pedido explícito del Jefe Gabriel,
  revisada por Ryan)**: "se muestra siempre que el campo tenga valor" ya NO
  es 100% cierto -- es "siempre, EXCEPTO cuando la nota viene de un Devolver
  ya reenviado". `notaContratacion` es un SOLO campo compartido entre
  DEVOLVER/REVISAR/ANULAR ("el último valor gana", sin saber qué acción lo
  escribió), así que ocultarlo no se puede decidir mirando solo el campo.
  `SolicitudDetallePage.jsx` ahora oculta el banner cuando la ÚLTIMA de
  {DEVOLVER, REVISAR, ANULAR} en `solicitud.historial` fue `DEVOLVER` y el
  estado actual ya no es `DEVUELTA` (es decir, se reenvió):
  `const ultimaAccionNota = solicitud.historial?.find((h) =>
  ['DEVOLVER', 'REVISAR', 'ANULAR'].includes(h.accion))?.accion` (el
  historial llega ordenado descendentemente de getById, así `.find()` da la
  más reciente de las 3) y `const ocultarNotaPorReenvio = ultimaAccionNota
  === 'DEVOLVER' && solicitud.estado !== 'DEVUELTA'`; la condición del banner
  es `solicitud.notaContratacion && !ocultarNotaPorReenvio`. **Alcance
  acotado a Devolver a propósito**: REVISAR y ANULAR no cambiaron -- sus
  notas siguen mostrándose siempre, exactamente como describe el párrafo
  anterior (confirmado explícitamente con el usuario que la excepción es
  solo para Devolver).
- **No portado, deferido a decisión del negocio**: el original tiene un
  botón "Documentos del proceso" (`ResumenLicitacionButton`/
  `CronogramaExportButton`, visible solo en `CREACION_MINUTA` para
  CONTRATOS/ADMIN) que genera un HTML con el logo de aed en un iframe oculto
  y dispara `window.print()` para un "Generador de Gastos" y un cronograma
  en formato imprimible -- **distinto** del "Generar documento" (.docx) y
  "Exportar a Excel" ya portados en la Fase 5. No se portó por alcance (es
  una funcionalidad de impresión nueva, no información faltante) -- avisar
  si el negocio la necesita.

**Módulo `solicitud` — Fase 5 (Cronograma + generación de documentos)**

- `cronogramaContrato.model.js`/`faseCronograma.model.js`/
  `actividadCronograma.model.js` -- puerto de `CronogramaContrato`/
  `FaseCronograma`/`ActividadCronograma`. Todas las columnas de fecha son
  `DataTypes.DATEONLY` (mejora deliberada sobre el `DateTime` de Prisma, seguía
  la propia regla "Fechas" del proyecto original) -- **ojo con el gotcha**: un
  objeto `Date` de JS pasado a una columna `DATEONLY` se formatea en la zona
  horaria LOCAL del proceso Node, así que `new Date('2026-09-15')` (medianoche
  UTC) cae en el día calendario ANTERIOR en `America/Bogota` (UTC-5) y termina
  guardado como `'2026-09-14'`. `cronograma.js#upsertCronograma` usa los
  objetos `Date` solo para la validación en memoria (mínimo de días hábiles,
  fin > inicio) y pasa los strings `fechaInicio`/`fechaFin` crudos (sin
  envolver en `new Date()`) a `CronogramaContrato.create()` -- cualquier código
  nuevo que toque estas columnas debe seguir el mismo patrón. Encontrado
  probando con `curl`: se mandaba `"2026-09-15"` y el `GET` posterior devolvía
  `"2026-09-14"`.
- `cronograma.js` -- upsert transaccional (borra y recrea fases/actividades en
  cascada dentro de la misma transacción, más simple que diffear); expuesto en
  `POST /solicitudes/:id/cronograma` y `PUT` (alias, mismo handler).
- `documento.js` -- puerto literal (458 líneas) de la generación `.docx` con
  el paquete `docx` (14 secciones numeradas, la numeración salta el "11" igual
  que el original). Lee los campos snake_case crudos de Sequelize directo, sin
  pasar por `_enrich*()`. Control de acceso ported tal cual: solo
  SOLICITANTE/DIRECTOR_PROYECTO están restringidos a dueño-o-frente, cualquier
  otro rol puede generar el documento de cualquier solicitud sin restricción
  adicional (así era en el original). `POST /solicitudes/:id/documento`.
- `cronogramaExport.js` -- puerto literal (238 líneas) del export `.xlsx` con
  `exceljs` (estilos, celdas combinadas, panel congelado). `POST
  /solicitudes/cronograma/export` recibe el cronograma completo en el body (no
  un id) -- pensado para exportar el cronograma que el usuario está editando
  en el wizard antes incluso de guardar la solicitud.
- `utils/holidays.js` (backend) -- puerto literal de `src/lib/holidays.ts`
  (festivos de Colombia vía el algoritmo de Gauss/Butcher para Pascua + la
  regla "Ley Emiliani" de traslado a lunes; **sin ninguna dependencia npm de
  feriados**, cálculo manual -- una suposición inicial de usar `date-holidays`
  resultó incorrecta al leer el código real). `frontend/src/utils/holidays.js`
  es una copia exacta (mismo criterio que `utils/permisos.js`: el frontend no
  importa código del backend).
- **Reinstaurado en `solicitud.service.js#crearOtrosi`**: el bloqueo de "el
  contrato ya venció" -- compara la fecha de hoy en `America/Bogota` contra
  `fecha_fin` del cronograma "baseline" (el otrosí COMPLETADO más reciente por
  `numero_otrosi`, o el padre si no tiene otrosís -- `pickMostRecentOtrosi` en
  `solicitud.otrosi.js`). El comentario en ese archivo documenta por qué NO
  puede ordenarse solo por `creado_en`: un import histórico (Fase 8) puede
  crear todos los otrosís de un contrato "hoy", en cualquier orden, así que
  `numero_otrosi` es el criterio primario y la fecha solo desempata. `getById`
  ahora expone `numeroOtrosi` en cada elemento de `enriched.otrosis` (antes no
  viajaba al frontend) para que `OtrosiForm.jsx` pueda replicar exactamente el
  mismo criterio de selección de baseline en el navegador.
- **Frontend** -- `CronogramaBuilder.jsx` es un puerto literal del componente
  original: valida fecha de inicio ≥ `minDays` días hábiles desde hoy (13 en
  `SolicitudForm`, 2 en `OtrosiForm` -- mismos valores que el original),
  calcula duración total en días hábiles. Limitación real portada tal cual, NO
  arreglada acá: el componente **solo edita `actividades`**, nunca crea ni
  muestra `fases` nuevas -- un cronograma heredado de un baseline con
  `tieneFases: true` se guarda/exporta bien pero no se puede editar su
  estructura de fases desde la UI. `SolicitudForm.jsx` guarda el cronograma
  con `POST /solicitudes/:id/cronograma` después de crear/actualizar la
  solicitud. `SolicitudDetallePage.jsx` agrega el botón "Generar documento" en
  el header y, si `solicitud.cronograma` existe, una sección con la tabla de
  actividades (soporta tanto la forma con fases como la plana) y "Exportar a
  Excel". `OtrosiForm.jsx` precarga el cronograma del baseline vigente al
  elegir un padre (mismo `pickMostRecentOtrosi`, en JS de frontend), bloquea
  la selección si ya venció, muestra `<CronogramaBuilder>` para ajustar antes
  de crear, y guarda el cronograma (editado o heredado tal cual) después de
  crear el otrosí -- todas las descargas autenticadas (`descargarDocumento`/
  `descargarCronogramaExport` en `api/solicitudes.js`) usan el patrón
  `fetch(credentials:'include')` → `blob` → `<a download>` temporal, porque
  son POST cross-origin (backend `:3021`, frontend `:5193`) y un `<a href>`
  plano no manda la cookie de sesión.

**Frontend** (`features/solicitudes/`) -- `SolicitudBadge.jsx` traduce los
~12 colores Tailwind de `ESTADO_COLORS` original a las 5 variantes fijas de
`<Badge>` (`utils/solicitudes.js#ESTADO_BADGE_VARIANT`, una simplificación
deliberada del sistema de diseño). `SolicitudActions.jsx` es un puerto
literal de las reglas de visibilidad de `solicitudActions.tsx` (819 líneas en
el original) usando el `<Modal>` nuevo (`components/ui/Modal.jsx` -- no viene
en la plantilla, ver el comentario ahí sobre por qué este SÍ es un caso
legítimo de modal). `SolicitudForm.jsx` es un puerto simplificado de
`solicitudForm.tsx` (1181 líneas) para CONTRATO/ORDEN_SERVICIO -- mismo
`asunto` auto-generado y `valorEnLetras` (`utils/solicitudes.js#numeroALetras`,
puerto literal), sin el editor de tercero embebido (ya vive en
`TerceroDetallePage`) -- sí incluye Cronograma (Fase 5, ver sección propia
arriba). `OtrosiForm.jsx` es la versión simplificada de `otrosiForm.tsx` para
OTROSI_TIEMPO/OTROSI_TIEMPO_CANTIDAD, con precarga de cronograma desde el
baseline (Fase 5). `GET /frentes` (Fase 2) devuelve la instancia
Sequelize cruda en **snake_case** (`proyecto_id`, no `proyectoId`) -- a
diferencia de `tercero`/`solicitud`, que sí traducen a camelCase; ojo con
esto al leer datos de frente desde cualquier componente nuevo.

## Fase 9 — Migración de datos reales

`backend/scripts/importarDatosLegado.js` -- lee `LEGACY_DATABASE_URL` (la
base Postgres de producción real de `solicitudes-indirectos/`, remota,
**SOLO LECTURA** -- el script nunca ejecuta un INSERT/UPDATE/DELETE contra
esa conexión) y repuebla `solicitudes_indirectos_v2` desde cero. **⚠ Corte
único, NO idempotente** -- vacía TODAS las tablas de negocio
(`TRUNCATE ... RESTART IDENTITY CASCADE`) antes de insertar; volver a
correrlo borraría cualquier dato real creado en `SOLICITUDES/` después del
corte. Ya se corrió una vez (2026-08-31).

**Remapeo de IDs**: `Proyecto`/`Frente`/`Especialidad`/`Tercero`/`Solicitud`
usan `Int` autoincrement en ambos esquemas -- se preservan idénticos (con
`setval()` al final de cada tabla para no chocar con el próximo
autoincrement). `Usuario.id` es la única excepción: era un `cuid` (String)
en Prisma, es `INTEGER` autoincrement acá -- el script arma una tabla de
mapeo (`legacy cuid -> id nuevo`) al insertar usuarios y la reutiliza en
cualquier FK que apunte a un usuario, incluyendo los 4 arrays de
`AprobadorFrente`.

**Fechas**: los campos de "instante" (`creadoEn`, `fecha`, etc.) se pasan
tal cual -- ambos esquemas son `timestamp` sin zona y el servidor legado
corre en UTC, sin ambigüedad. Los de "solo fecha" del cronograma
(`CronogramaContrato`/`ActividadCronograma`) se extraen con
`to_char(col, 'YYYY-MM-DD')` directo en la query a Postgres, nunca dejando
que el driver los convierta a un objeto `Date` de JS primero -- mismo
gotcha ya documentado para `cronograma.js` en la Fase 5 (un `Date` de JS
reformateado más tarde en la zona horaria del proceso puede correr el día).

**Descubrimiento real, no un bug de esta migración**: la tabla `User` de
producción tiene 8 cuentas semilla (`smercado@baiak.com`,
`crodriguez@baiak.com`, etc. -- exactamente las de la sección "Seed
credentials" más abajo) mezcladas con las 20 cuentas reales `@aed.com.co`.
Son residuos del `prisma/seed.ts` original, corrido una vez contra
producción antes de que se sumaran los usuarios reales, y **ya estaban
`activo: false`** en el propio origen. La primera corrida del script las
migró tal cual (fiel al espejo); el usuario pidió explícitamente
eliminarlas después -- se verificó primero que ningún FK real las
referenciara (0 solicitudes/historial/actividad/sesiones, solo 9
notificaciones viejas dirigidas a ellas, borradas en cascada) y se
eliminaron con un `DELETE FROM usuarios WHERE email LIKE '%baiak.com%'`.
`importarDatosLegado.js` ahora excluye ese dominio en el `SELECT` de origen
(`WHERE email NOT LIKE '%@baiak.com'`), así que una futura re-corrida no las
vuelve a traer. La sección "Seed credentials" de este archivo ya NO aplica:
esos 8 emails no existen en la base. Los 20 usuarios reales usan sus
propias contraseñas de producción (el hash bcrypt se copió tal cual,
compatible porque ambas apps usan `bcryptjs`).

**Archivos subidos**: `archivoCuadroComparativo`/`archivoCotizacion`
apuntan a `/api/files/...`, un volumen Docker de producción
(`/app/data/uploads`) sin acceso directo desde acá. De las 3 solicitudes
reales, el usuario recuperó a mano los archivos de 2
(`SOL-ODS-BK-KALA2-001`, `SOL-ODS-BK-LAGUNAYAMBIENTAL-001`) y los puso en
`SOLICITUDES/files/<consecutivo>/` -- el script los copió a
`backend/uploads/` con el mismo esquema de nombre que usa
`upload.controller.js` y reescribió la URL a `/files/...`. La tercera
(`SOL-ODS-BK-KALIZA1-001`) tiene sus 2 archivos perdidos en producción (pendiente
de recuperar por el usuario) -- esa sí conserva la URL vieja
`/api/files/...` tal cual, rota hasta que se recupere el archivo real y se
suba a mano.

**Verificado**: conteos de filas post-migración coinciden con el origen;
`GET /dashboard/stats` sin cookie devuelve 401 (las cookies de sesión viejas,
con IDs de usuario de prueba, quedaron inválidas -- esperado); login con
`admin@aed.com.co` y contraseña incorrecta devuelve 401 "Credenciales
incorrectas" (no "usuario no encontrado", confirma que el usuario real
existe); `roles.ver_todas_solicitudes` refleja la config real de producción
(ej. `DIRECTOR_TECNICO=false`, no el fallback hardcodeado); los 4 archivos
recuperados quedan servidos correctamente vía `GET /files/:filename`.

## Eliminar permisos de rol para solicitudes (2026-09-02)

Refactor grande, pedido por el usuario: antes había una doble puerta
redundante para autorizar una acción de Solicitud -- un permiso de ROL (16
slugs `_directa`/`_indirecta`, ej. `aprobar_solicitudes_frente_indirecta`)
**y**, para 4 de las 8 acciones de aprobación, además había que estar en el
array correspondiente de `AprobadorFrente` para ese frente. Un admin podía
asignar a alguien como aprobador de un Frente y esa persona igual quedaba
bloqueada porque su ROL no tenía el slug exacto -- dos fuentes de verdad
para la misma decisión. Plan completo en
`~/.claude/plans/humble-wondering-crane.md` de la sesión que lo hizo.

- **Roles pasa a controlar solo acceso de MÓDULO**, no acciones finas:
  `utils/permisos.js#FUNCIONALIDADES_DISPONIBLES` (backend y su duplicado a
  mano en frontend) se redujo de 16+2 slugs a 4:
  `modulo_solicitudes_directas`/`_indirectas` (cubre crear + otrosí + diseño
  de una categoría, sin distinción fina -- ya no existe
  `crear_otrosi_X`/`crear_solicitudes_diseno_X` como slugs separados) +
  `crear_terceros`/`gestionar_especialidades` (sin cambios, no son parte de
  este refactor). Migración de datos (no seeder)
  `20260831000511-modulo-permisos.js` retrofitea `roles.permisos`/
  `usuarios.funcionalidades_adicionales` reales: si tenía cualquiera de los
  8 slugs `_directa` agrega `modulo_solicitudes_directas` (nadie pierde
  acceso el día del deploy), ídem `_indirecta`, después quita los 16 viejos.
- **Aprobar una acción ya NO depende de ningún permiso de rol** -- se
  resuelve 100% contra `AprobadorFrente`, reshapeado
  (`20260831000510-reshape-aprobador-frente.js`) de 4 arrays planos de
  `usuario_id` + `controles_id` suelto, a **6 columnas JSONB**
  (`director_proyecto`, `contratos_tramite`, `contratos_minuta`,
  `director_controles`, y 2 nuevas: `director_tecnico`, `controles_adpro`),
  cada una `{ usuarios: [ids], roles: [nombresDeRol] }` -- alguien califica
  si está en `usuarios` **o** si tiene alguno de los `roles`. Esto además
  incorpora los 2 casos que antes eran un chequeo de rol puro hardcodeado
  sin ningún alcance por frente (Director Técnico, Controles/ADPRO) al
  mismo mecanismo configurable -- sus roles se sembraron con
  `['DIRECTOR_TECNICO']`/`['CONTROLES']` (no vacíos) para no cambiar el
  comportamiento actual el día del deploy. Editable en
  `FrenteDetallePage.jsx` -- cada uno de los 6 "roles de responsabilidad"
  tiene un `CheckboxListSelect` de personas + un `CheckboxGroup` de roles de
  sistema ("O cualquiera con estos roles").
- **`backend/src/modules/solicitud/solicitud.autorizacion.js`** (nuevo,
  compartido) -- única fuente de verdad, consumida tanto por
  `solicitud.estado.js#cambiarEstado` (la puerta real de la mutación) como
  por `solicitud.service.js#getById` (expone `accionesDisponibles`, que
  `SolicitudActions.jsx` simplemente LEE en vez de recalcular reglas de
  autorización por su cuenta -- eliminando la duplicación real que ya había
  causado un bug esta sesión: ese componente nunca pasaba por
  `tienePermiso`). Expone `puedeEjecutarAccion`/`getAccionesDisponibles`
  (mapea cada acción a su slot vía `ACCION_SLOT_FIJO`/`SLOT_POR_ESTADO_ORIGEN`
  para DEVOLVER/REVISAR, con un atajo si el usuario coincide con el
  responsable "snapshot" ya guardado en la propia solicitud al crearse) y
  `puedeGestionarSolicitud` (reemplaza el viejo `revisar_contratos_${sufijo}`
  -- "¿puede ver/editar cualquier solicitud?" ahora es "¿está autorizado en
  cualquiera de los 6 slots posibles?"). `ENVIAR`/`REENVIAR` son la
  excepción: no tienen un frente resuelto de esa forma, siguen gateados por
  `tieneModuloSolicitudes` (el permiso de módulo).
- **Workflows pierde media función**: como ninguna acción se gatea ya por un
  permiso de rol, el editor de "permiso requerido" por acción
  (`WorkflowPaso`) dejó de tener sentido -- se eliminó el modelo/tabla
  (`20260831000512-drop-workflow-paso.js`), las rutas/servicio/controller de
  `pasos`, y la card correspondiente en `WorkflowDetallePage.jsx`. Los
  **desvíos condicionales** (`WorkflowDesvio`) NO se tocaron -- siguen
  siendo el mecanismo real e independiente para "a dónde va la solicitud"
  (distinto de "quién puede moverla").
- **Verificado** (2026-09-02): migraciones 510/511/512 corridas contra la
  base real de dev -- los `AprobadorFrente` reales (frentes 20-24+) quedaron
  con `director_proyecto.usuarios`/etc. poblados desde los arrays viejos
  (`roles: []` en los 4 heredados, sin perder a nadie), `director_tecnico`/
  `controles_adpro` con sus roles default; los 9 roles reales de `roles`
  quedaron con `modulo_solicitudes_directas`/`indirectas` en vez de los 16
  slugs viejos; `workflow_pasos` ya no existe. Sintaxis verificada con
  `node --check` (backend) y `esbuild` por archivo (frontend) en todos los
  tocados. Servidores de dev (nodemon, puertos 3021/5193) siguieron
  arriba y respondiendo tras el `db:migrate` sin reiniciar manualmente.
  **Pendiente de verificar con navegación real** (no se probó con una
  sesión de usuario real en esta pasada): que un usuario sin el permiso de
  rol viejo pero SÍ en un array de `AprobadorFrente` ahora puede aprobar; que
  los botones de `SolicitudActions.jsx` siguen apareciendo/desapareciendo
  igual que antes para los flujos ya validados en la Fase 4, ahora leyendo
  `accionesDisponibles`.
- **Fuera de alcance, a propósito**: `dashboard.service.js#contarPendientesMiAprobacion`
  sigue contando por rol a secas (ej. cualquier `CONTRATOS` ve TODAS las
  `EN_TRAMITE_CONTRATOS` del sistema) -- queda filosóficamente inconsistente
  con "el que está asignado en el frente es el que aprueba", pero es un
  cambio aparte (solo afecta un número en el Dashboard, no la autorización
  real) que el usuario no pidió tocar.

## Desglose ver/crear + fixes de acceso (2026-09-02)

El mismo día del refactor anterior, el usuario reportó que usuarios sin
acceso a Solicitudes Directas/Indirectas igual las veían en el sidebar, y
pidió un desglose más fino ("puede ver todas las solicitudes directas,
pero no puede acceder a nueva solicitud", mismo criterio para Terceros).
Investigar el reporte encontró TRES problemas independientes, los tres
corregidos en esta pasada:

- **El sidebar nunca filtraba por módulo** -- `AppShell.jsx#NAV_GROUPS`
  solo filtraba items `soloAdmin`; nada chequeaba si el usuario tenía
  acceso a Solicitudes Directas/Indirectas/Terceros. Tampoco había
  protección de RUTA: `/solicitudes-directas`, `/terceros`, etc. no tenían
  ningún `<ProtectedRoute permiso=...}>` -- cualquier autenticado podía
  navegar a mano aunque el link no apareciera.
- **El frontend nunca reflejaba los permisos reales de un rol** -- este es
  el bug de fondo, independiente del anterior. `GET /usuarios/me` solo
  devolvía `roles`/`funcionalidades_adicionales`; el frontend evaluaba
  `tienePermiso()` SIEMPRE contra el mapa hardcodeado
  `FUNCIONALIDADES_POR_ROL` (nunca contra la tabla `Rol` real). El backend
  sí lee la tabla real (`getRolesFuncionalidades()`), así que si un admin
  personalizaba un rol desde `RolDetallePage`, el cambio funcionaba en el
  backend pero el sidebar/los botones seguían mostrando el default
  hardcodeado -- dos fuentes de verdad desincronizadas. Corregido: `GET
  /usuarios/me` (`usuario.service.js#getMe`) ahora manda también
  `funcionalidadesPorRol` (el mismo mapa real que usa el backend);
  `frontend/src/utils/permisos.js` ganó `usuarioTienePermiso(usuario, slug)`
  -- un wrapper que SIEMPRE pasa `usuario.funcionalidadesPorRol` como
  cuarto argumento de `tienePermiso`, para no repetirlo (y arriesgarse a
  olvidarlo) en cada call site. Todos los usos sueltos de `tienePermiso`
  en componentes (`ProtectedRoute`, `TercerosPage`, `TerceroDetallePage`,
  `SolicitudesPage`, `AppShell`) se migraron a este wrapper.
- **El desglose ver/crear en sí** -- el corte anterior había colapsado
  crear/enviar en un solo permiso de MÓDULO por categoría
  (`modulo_solicitudes_directas`/`indirectas`), sin forma de dar "puede
  ver pero no crear" -- el caso real de CONTRATOS/CONTROLES/
  DIRECTOR_TECNICO/DIRECTOR_CONTROLES/GERENCIA (necesitan navegar el
  listado para actuar sobre lo que tienen asignado vía AprobadorFrente,
  pero nunca deberían generar una solicitud nueva). Cada módulo se separó
  en dos slugs (`utils/permisos.js#FUNCIONALIDADES_DISPONIBLES`):
  `ver_solicitudes_directas`/`crear_solicitudes_directas` (ídem
  indirectas), más `ver_terceros` (NUEVO -- antes el Directorio no tenía
  ningún permiso propio, cualquier autenticado lo veía) junto al ya
  existente `crear_terceros`. `ver_solicitudes_X` **nunca** reemplaza el
  filtro de visibilidad por registro (dueño/frente/AprobadorFrente/
  ver_todas_solicitudes, `solicitud.service.js#getById`) -- ese sigue
  siendo el único que decide si UNA solicitud puntual es visible; el nuevo
  slug solo decide si el usuario puede entrar a la sección/listado
  general. Por la misma razón, `/solicitudes/:id` (el detalle sin
  categoría en la URL, el que usan los links de notificación) **no** pide
  `ver_solicitudes_X` -- si se le pidiera, revocarle el "ver" general a un
  `DIRECTOR_TECNICO` le rompería poder abrir una solicitud puntual que sí
  está autorizado a aprobar vía su slot de `AprobadorFrente`.
  `solicitud.autorizacion.js#tieneModuloSolicitudes` se separó en
  `tieneVerSolicitudes`/`tieneCrearSolicitudes` + `puedeListarSolicitudes`
  (ver O crear -- así alguien con solo `crear` sigue pudiendo buscar el
  "contrato base" al armar un otrosí en `OtrosiForm.jsx`/
  `ImportarHistoricoPage.jsx`, que llaman `GET /solicitudes?categoria=X`
  igual que el listado principal). `GET /solicitudes` ahora exige
  `puedeListarSolicitudes` cuando la query trae `categoria` (los 3
  llamadores reales siempre la mandan).
  **Migración de datos** `20260831000513-desglose-ver-crear.js` (no
  seeder, mismo criterio que las anteriores): traduce
  `modulo_solicitudes_directa/indirecta` -> `ver_+crear_solicitudes_X`, y
  agrega `ver_solicitudes_directas`/`ver_solicitudes_indirectas`/
  `ver_terceros` a TODOS los roles reales sin condición -- "nadie pierde
  acceso el día del deploy": antes de este desglose, listar/navegar
  Solicitudes y Terceros no tenía ningún permiso propio en absoluto (el
  filtro real era por registro, no por sección). Verificado contra la
  base real de dev: `CONTRATOS`/`DIRECTOR_TECNICO` conservaron el
  `crear_solicitudes_*` que ya tenían configurado en producción (no todos
  los roles sin `modulo_solicitudes_X` en el mapa hardcodeado de fallback
  resultaron ser así en la config real -- la migración respetó el dato
  real, no el fallback).
  **Frontend**: `RolDetallePage.jsx` pasó de 2 `<Checkbox>` (un slug por
  categoría) a 3 `<CheckboxGroup>` (Directas/Indirectas/Terceros, cada uno
  con sus opciones Ver/Crear) + el "Otros permisos" sin cambios
  (`gestionar_especialidades`). `RolesPage.jsx` -- la columna "Permisos"
  mostraba `rol.permisos.length` (un número pelado, motivo de la pregunta
  "¿qué dice esa columna?" del usuario) -- ahora renderiza cada slug
  concedido como un `<Badge>` con su nombre corto (`LABEL_CORTO`), visible
  de un vistazo sin entrar al detalle.
- **`FrenteDetallePage.jsx` -- candidatos a aprobador restringidos al
  frente**: el selector de personas de cada uno de los 6 "roles de
  responsabilidad" ofrecía la lista COMPLETA de usuarios del sistema,
  permitiendo asignar como aprobador a alguien sin ninguna relación con
  ese frente. Ahora cada `CheckboxListSelect` solo ofrece usuarios ya
  asignados al frente (la sección "Usuarios asignados al frente" de
  arriba) -- con una excepción: si un slot ya tenía elegida a una persona
  que DESPUÉS dejó de estar asignada al frente (dato real preexistente),
  esa persona se sigue mostrando como opción para no hacerla desaparecer
  en silencio de una configuración ya guardada (`CheckboxListSelect` oculta
  cualquier seleccionado que no esté en `options`, sin avisar).

## Permisos por módulo, desglosados (2026-09-02)

Mismo día, tercer pedido sobre el mismo tema: el usuario pidió que el editor
de permisos de Roles deje de ser una lista de slugs sueltos y pase a ser un
árbol "módulo padre + sub-ítems", calcado 1:1 del sidebar real (ej.
"Solicitudes Directas" → "Todas las solicitudes"/"Nueva solicitud"), y que
esto sea **genérico**: cualquier módulo que exista hoy o se agregue mañana
debe aparecer así solo, sin escribir código nuevo cada vez.

- **`frontend/src/utils/navModulos.jsx`** (nuevo) -- ÚNICA fuente de verdad
  del árbol de navegación (`NAV_GROUPS`: título + ícono + items con
  `label`/`to`/`permiso`/`soloAdmin`), movida acá desde `AppShell.jsx`
  (que antes la tenía hardcodeada solo para armar el sidebar). Ahora
  `AppShell.jsx` Y `RolDetallePage.jsx` importan este mismo array -- agregar
  un módulo (o un ítem a uno existente) en este único archivo alcanza para
  que aparezca automáticamente en el sidebar (filtrado por `permiso`, ya
  existía) Y en el editor de Roles (como un checkbox más). Es `.jsx` y no
  `.js` porque los íconos (`IconSolicitudesDirectas`, etc., copiados tal
  cual de `AppShell.jsx`) son JSX -- Vite/esbuild solo transforma JSX en
  archivos `.jsx`/`.tsx` por default.
- **`RolDetallePage.jsx#ModuloPermisos`** (nuevo, interno) -- por cada grupo
  de `NAV_GROUPS`, renderiza el checkbox del módulo (título del grupo,
  marcado si TODOS sus ítems con `permiso` están concedidos, clickear lo
  marca/desmarca todos de una) más los checkboxes de cada ítem indentados
  debajo, con la MISMA etiqueta que ve el usuario en el sidebar ("Todas las
  solicitudes", no "Ver Solicitudes Directas") -- para que el editor de
  permisos sea un espejo exacto de lo que el usuario final va a ver. El
  checkbox del módulo **no es un permiso propio** -- no existe un slug
  "acceso total a Solicitudes Directas" en la base, es pura conveniencia de
  UI para marcar/desmarcar el grupo entero de una. Un módulo sin ítems con
  `permiso` (ej. "Actividad", gateada por `soloAdmin` -- ADMIN siempre la ve,
  nadie más la ve nunca, no hay nada que configurar por rol) no se
  renderiza -- `items.length === 0` corta antes de pintar nada. Los slugs
  que no correspondan a ningún ítem del sidebar (hoy, solo
  `gestionar_especialidades` -- una capacidad de EDICIÓN, no de navegación)
  siguen cayendo en el bloque "Otros permisos" de siempre.
- **`ver_especialidades`** (nuevo) -- "Especialidades" es un ítem del
  sidebar (dentro de Terceros) igual que "Directorio", así que necesitaba su
  propio slug de VER para poder aparecer/ocultarse individualmente --
  exactamente el mismo caso que `ver_terceros` un rato antes. Antes de este
  permiso, `GET /especialidades` estaba abierto a cualquier autenticado (el
  selector de especialidades de `TerceroDetallePage.jsx`/
  `NuevoTerceroPage.jsx` lo necesitaba sin importar el rol) -- **al
  restringir `ver_especialidades` a un rol, ese selector también se rompe
  para ese rol** (la llamada a `listEspecialidades()` que alimenta el
  multi-select del Tercero pasa por la misma ruta y ahora exige el mismo
  permiso) -- consecuencia esperada del pedido, documentada en el comentario
  de `especialidad.routes.js`, no un bug. `gestionar_especialidades` no
  cambia -- sigue siendo la única puerta de escritura (crear/editar/borrar/
  importar especialidades), independiente de poder verlas o no. Migración
  de datos `20260831000514-agregar-ver-especialidades.js` (mismo criterio
  de "nadie pierde acceso el día del deploy" que
  `20260831000513-desglose-ver-crear.js`): se lo agrega a los 9 roles
  reales sin condición.
- **Verificado** (2026-09-02): migración 514 corrida contra la base real de
  dev -- los 9 roles quedaron con `ver_especialidades`; `CONTRATOS` en la
  base real resultó tener SOLO `ver`+`crear` de INDIRECTAS (nunca tuvo
  acceso a Directas configurado) -- confirma que las migraciones respetan
  el dato real de producción, no el mapa hardcodeado de fallback (que para
  ese rol asume ambas categorías). Sintaxis verificada con `esbuild`/`node
  --check` en todos los archivos tocados; servidores de dev (nodemon,
  3021/5193) reiniciaron solos y siguieron respondiendo.

## Verificación end-to-end del desglose de permisos (2026-09-02)

El usuario reportó "le quito el acceso a todo a un rol, pero le sigue
mostrando todo" y pidió verificación real, no solo lectura de código. Se
armó un caso de prueba real contra la base de dev: un rol sintético
(`ZTEST_SINACCESO`, `permisos: []`) y un usuario de prueba con ese rol,
más un usuario ADMIN de prueba para manejar `RolDetallePage.jsx` -- ambos
por `bcryptjs`/inserción directa (mismo hash que usa
`utils/security.js#hashPassword`), sin tocar ningún usuario ni rol real.
Con eso se probó la cadena COMPLETA, no solo el código:

1. **Backend puro (`curl`)**: login real, `GET /usuarios/me` (confirmó que
   `funcionalidadesPorRol.ZTEST_SINACCESO` llega como `[]`), y `GET
   /solicitudes?categoria=DIRECTA|INDIRECTA`, `GET /terceros`, `GET
   /especialidades` -- los 4 devolvieron 403 real. Los checks de
   autorización del backend (el trabajo de las dos sesiones anteriores)
   quedaron 100% confirmados, sin ambigüedad.
2. **Frontend real (Playwright, navegador de verdad)**: login como el
   usuario de prueba -- el sidebar quedó completamente vacío (ni un solo
   grupo), y navegar a mano a `/solicitudes-directas`, `/terceros`,
   `/terceros/especialidades`, `/solicitudes-directas/nueva/contrato`
   rebotó a `/` en los 4 casos (`ProtectedRoute` funcionando).
3. **El flujo de admin real**: login como el admin de prueba, entrar a
   `/configuracion/roles/ZTEST_SINACCESO` -- el árbol de checkboxes
   (`ModuloPermisos`, ver sección de arriba) renderizó todo destildado,
   como se esperaba. Se marcó SOLO "Todas las solicitudes" bajo
   "Solicitudes Directas" (el checkbox del módulo padre quedó
   correctamente SIN marcar, porque "Nueva solicitud" seguía sin marcar --
   confirma que el padre exige TODOS los hijos, no CUALQUIERA), se guardó,
   y se confirmó en la base que `roles.permisos` quedó exactamente
   `["ver_solicitudes_directas"]`. Volviendo a entrar como el usuario de
   prueba (con el MISMO login, sesión nueva), el sidebar mostró
   únicamente "Solicitudes Directas → Todas las solicitudes" -- sin
   "Nueva solicitud", sin Indirectas, sin Terceros.
4. **Bug real encontrado y corregido en esta misma verificación**:
   `DashboardPage.jsx` (la home tras login) tenía los 4 KPIs + el botón
   "Nueva solicitud" + el link "Ver todas" **hardcodeados** a
   `/solicitudes-indirectas`, sin mirar ningún permiso -- un usuario sin
   ACCESO A NADA igual veía 4 tarjetas clickeables y un botón "Nueva
   solicitud" en su Dashboard (aunque `ProtectedRoute` los rebotaba en
   silencio al hacer clic). Esto es, casi con certeza, lo que el usuario
   vio y reportó como "le sigue mostrando todo" -- el sidebar SÍ estaba
   bien, pero la home no. Corregido: `linkVerTodas`/`linkNueva` ahora se
   calculan con `usuarioTienePermiso()` (prefieren Indirecta si el usuario
   tiene acceso a ambas, igual que el link hardcodeado de antes: mismo
   comportamiento visible cuando SÍ hay acceso completo); si el usuario no
   tiene `ver_solicitudes_{directas,indirectas}` en absoluto, `StatCard` se
   renderiza como un `<div>` no-clickeable en vez de `<Link>`, y "Ver
   todas"/"Nueva solicitud" directamente no se muestran. Reverificado con
   el mismo usuario de prueba en las dos configuraciones (cero acceso, y
   solo `ver_solicitudes_directas`) -- en ambos casos el Dashboard ahora
   coincide exactamente con lo que el sidebar permite.
5. **Limpieza**: el rol y los 2 usuarios de prueba se borraron de la base
   de dev al terminar -- no quedó ningún dato sintético.

## Checkbox del módulo padre + sidebar en vivo (2026-09-02)

Dos ajustes puntuales sobre `RolDetallePage.jsx`/`AuthContext.jsx`, mismo día:

- **`ModuloPermisos` (RolDetallePage.jsx)**: el checkbox del módulo padre
  pasó de exigir que TODOS sus sub-ítems estuvieran marcados (`every`) a
  marcarse con que UNO SOLO lo esté (`some`) -- pedido explícito del
  usuario ("si hay uno marcado, debe estar marcado el padre"). Esto además
  hace que el padre refleje EXACTAMENTE la misma condición que usa
  `AppShell.jsx` para decidir si el módulo aparece en el sidebar (también
  `some`), así que "el checkbox padre está marcado" ahora significa
  literalmente "este módulo ya es visible para el rol", sin importar si
  tiene todos sus sub-ítems o solo uno.
- **Refresco automático del perfil (`AuthContext.jsx`)**: si un admin le
  revoca un permiso a un rol mientras alguien con ese rol ya tenía una
  sesión abierta, esa sesión seguía viendo el sidebar viejo indefinidamente
  -- `usuario.funcionalidadesPorRol` (ver sección "Verificación end-to-end"
  arriba) solo se pedía una vez, al cargar la app o hacer login. Se agregó
  un refresco periódico de `GET /usuarios/me` cada 30s (mismo intervalo que
  el heartbeat de presencia, `usePresence.js#HEARTBEAT_MS`, por
  consistencia) mientras haya sesión activa (gateado con un `ref` para no
  reiniciar el intervalo en cada tick ni pollear si no hay usuario). Como
  `usuario` es un objeto de Context, cualquier componente que lo consuma
  (`AppShell`, `ProtectedRoute`) se re-renderiza solo con el valor
  actualizado -- si la ruta actual dejó de estar permitida, `ProtectedRoute`
  saca a la persona de ahí en el mismo tick, sin que tenga que cerrar
  sesión.

## Alcance de solicitudes en 3 niveles (2026-09-02)

El usuario preguntó cómo funcionaba la visibilidad de fila dentro de una
sección de Solicitudes (distinto del `ver_solicitudes_directas/indirectas`
de las secciones de arriba, que solo decide si puede ENTRAR a la sección) y
pidió cambiar el enfoque: en vez de un checkbox único "Ve todas las
solicitudes" (que ataba "propias" y "de mi frente" como un solo paquete sin
poder separarlos), un selector de 3 niveles -- "que se pueda ver las
propias, o las de los frentes asignados, o todas".

- **`roles.alcance_solicitudes`** (STRING, reemplaza `ver_todas_solicitudes`
  BOOLEAN -- migración `20260831000515-alcance-solicitudes.js`, columna
  vieja eliminada) -- 3 valores, cada uno superset del anterior:
  - `PROPIAS` -- solo lo que el usuario creó (`solicitante_id`). Nivel
    nuevo, más restrictivo que cualquier cosa que existiera antes.
  - `FRENTE` -- propias + donde es responsable en algún paso (snapshot de
    `AprobadorFrente` al crearse: aprobador, contratos trámite/minuta,
    controles) + lo que pertenece a un frente asignado. Es EXACTAMENTE lo
    que hacía `ver_todas_solicitudes: false` antes -- el backfill de datos
    mapea `false -> FRENTE` (el paquete completo que ya tenían, nunca el
    más restrictivo PROPIAS -- "nadie pierde acceso el día del deploy").
  - `TODAS` -- sin filtro. `true -> TODAS` en el backfill.
- **`utils/permisos.js#getRolesAlcanceSolicitudes()`/`resolverAlcanceSolicitudes()`**
  (backend, nuevo) reemplaza `getRolesVerTodas()`/`FALLBACK_VER_TODAS` (lista
  plana de roles con acceso total) por un mapa rol->alcance +
  `FALLBACK_ALCANCE_SOLICITUDES`. `resolverAlcanceSolicitudes(roles,
  alcancePorRol)` se queda con el MÁS PERMISIVO de los roles del usuario
  (mismo criterio que `tienePermiso`: un rol adicional solo puede sumar
  acceso) -- un rol sin fila en la tabla cae en `FRENTE` (mismo default que
  tenía `false`). Consumido por `solicitud.service.js#list()` (reemplaza el
  bloque `if (!puedeVerTodas) {...}` por un `if/else if` de 3 ramas) y
  `dashboard.service.js#filtrarVisibles()` (mismo criterio, para que
  Dashboard y `/solicitudes` cuenten exactamente lo mismo, como ya
  documentaba el comentario original de ese archivo) -- de paso se
  simplificó `recientes()`, que repetía el chequeo de "ver todas" a mano
  antes de llamar a `filtrarVisibles()` cuando esa función ya lo hacía
  internamente (redundancia real preexistente, no introducida por este
  cambio).
- **NO afecta** `solicitud.service.js#getById()` -- el acceso a UN registro
  puntual nunca usó `ver_todas_solicitudes`/`alcance_solicitudes`, se
  resuelve con `puedeGestionarSolicitud()` (AprobadorFrente) + dueño +
  frente, sin cambios (ver la sección "Eliminar permisos de rol para
  solicitudes" más arriba) -- por diseño, para no romper el acceso a una
  solicitud puntual de alguien autorizado a actuar sobre ella (ej. por un
  link de notificación) si su alcance de LISTADO es más restrictivo.
- **Frontend**: `RolDetallePage.jsx` cambió el `<Checkbox>` "Ve todas las
  solicitudes" por un `<Select>` de 3 opciones
  (`utils/permisos.js#ALCANCE_SOLICITUDES_LABELS`, mismo mapa reusado en
  `RolesPage.jsx`, cuya columna "Ve todas las solicitudes" (Sí/No) pasó a
  "Alcance de solicitudes" con la etiqueta completa).
- **Verificado**: migración 515 corrida contra la base real de dev --
  confirmé por query directa que el backfill respetó el dato REAL de cada
  rol (no el fallback hardcodeado): `DIRECTOR_PROYECTO`/`CONTRATOS`/
  `CONTROLES`/`DIRECTOR_CONTROLES`/`GERENCIA`/`ADMIN` quedaron en `TODAS`
  (tenían `ver_todas_solicitudes: true` real), `SOLICITANTE`/`TECNICA`/
  `DIRECTOR_TECNICO` en `FRENTE`; la columna vieja ya no existe. Sintaxis
  verificada con `node --check`/`esbuild` en todos los archivos tocados;
  servidores de dev reiniciaron solos y siguieron respondiendo. **No se
  probó en navegador** -- el usuario pidió no usar Playwright en esta
  sesión y va a probar por su cuenta.

## Workflows separados por categoría (2026-09-02)

El usuario pidió reorganizar el módulo Workflows: "en estos momentos
existen dos, un workflow de directos y otro de indirectos con sus
condiciones... quiero que los separemos [en un listado] y los hagas
visuales". Antes había UN solo diagrama con los desvíos de las dos
categorías mezclados (la única señal de "esto es distinto para Directas"
era una píldora ⚡ genérica, sin distinguir para cuál categoría). El motor
en sí (las 11 acciones, `ESTADOS_ORIGEN`/`ESTADO_DESTINO`) sigue siendo
UNO SOLO compartido -- lo que cambió es la presentación: cada categoría
ahora tiene su propia fila en un listado y su propio diagrama, calculado en
vivo a partir de qué desvíos están activos para esa categoría.

- **`WorkflowsPage.jsx` pasó a ser el LISTADO** (2 filas: Solicitudes
  Directas / Solicitudes Indirectas, con la cuenta de desvíos condicionales
  activos de cada una) -- mismo patrón lista+detalle que Roles/Frentes. El
  diagrama en sí se movió a **`WorkflowDiagramaPage.jsx`** (nuevo,
  `/configuracion/workflows/:categoriaSlug`).
- **El diagrama es dinámico, no hardcodeado por categoría**: la única parte
  del diagrama que de verdad difiere entre Directas e Indirectas es si hay
  un desvío ACTIVO que lleve a `PENDIENTE_DIRECTOR_TECNICO` para esa
  categoría (hoy solo existe uno, INDIRECTA+TECNICA -- el negocio ya había
  documentado que "el área de Técnica no participa en solicitudes
  directas"). `WorkflowDiagramaPage.jsx` calcula `tecnicoActivo` en vivo
  contra los desvíos reales (`desvios.some(d => d.activo && d.accion ===
  'ENVIAR' && d.estado_destino === 'PENDIENTE_DIRECTOR_TECNICO')`, filtrado
  primero a los desvíos de esa categoría) -- si el negocio agrega un desvío
  nuevo para Directas más adelante, el diagrama de Directas lo refleja
  solo, sin tocar código. Cuando no está activo para la categoría actual,
  ese nodo y sus 3 aristas se pintan "fantasma" (mismo lenguaje visual que
  ya existía) en vez de desaparecer -- comunica "existe en el motor, no
  aplica hoy a esta categoría" en vez de ocultarlo en silencio.
- **`WorkflowDetallePage.jsx`** (`/configuracion/workflows/:categoriaSlug/:accion`)
  ahora solo lista/edita los desvíos de ESA categoría (un desvío con
  `condicion_categoria: null` aplica a las dos y aparece en ambas
  pantallas). El selector de categoría del formulario se acotó a
  "Cualquiera" o la categoría actual -- ya no se puede crear/editar por
  error un desvío para la OTRA categoría desde la pantalla equivocada; una
  fila nueva queda pre-seleccionada para la categoría actual por defecto.
- **`ENVIO_CONTRATO_POLIZAS`/`PASAR_CONTROLES` se quitaron del diagrama**
  (pedido explícito del usuario, "no existe, quitarlo de ambos") -- ese
  nodo llevaba desde el diseño original marcado como "fantasma" porque
  ningún `ESTADO_DESTINO` de ninguna otra acción lo produce nunca (residuo
  del puerto original, nunca alcanzable). Se quitó de las dos categorías
  en `WorkflowDiagramaPage.jsx` (nodo, arista, y el handle `in-left` de
  `EN_CONTROLES` que solo esa arista usaba) -- **sin tocar el motor real**
  (`solicitud.autorizacion.js`/`workflow.schema.js` siguen teniendo la
  acción/el estado, por si el negocio los necesita reactivar; solo se dejó
  de dibujar un camino que ninguna solicitud real recorre).
- **No requirió cambios de backend** -- `GET /workflows/desvios` (sin
  filtro de categoría en el servidor) ya traía todo lo necesario; el
  filtrado por categoría (incluyendo el caso `condicion_categoria: null`)
  se resuelve en el frontend, en las 3 pantallas nuevas/tocadas.
- Sintaxis verificada con `esbuild` en los 4 archivos tocados
  (`WorkflowsPage.jsx`, `WorkflowDiagramaPage.jsx` nuevo,
  `WorkflowDetallePage.jsx`, `App.jsx`); servidores de dev siguieron
  arriba. No probado en navegador (mismo motivo que la sección anterior).

## Canvas de Workflows: reorganizado, editable, y a todo el alto (2026-09-02)

Seguimiento el mismo día sobre `WorkflowDiagramaPage.jsx`: el usuario mandó
una captura del diagrama real y reportó que no se entendía (líneas
cruzadas), pidió que el canvas usara todo el alto de pantalla, que
Directas/Indirectas fueran "dos workflows distintos" de verdad (Director
Técnico no debe aparecer en absoluto si no aplica, no alcanza con
atenuarlo), y por último pidió poder reorganizar las líneas él mismo desde
el navegador en vez de que el acomodo quedara fijo en el código.

- **Rediseño de coordenadas/handles para que no se crucen las líneas** --
  el problema real: `ENVIADA` (6 aristas distintas) tenía TODAS sus
  conexiones de un mismo lado saliendo/entrando del mismo punto exacto (el
  centro, default de React Flow sin offset), así que se cruzaban al abrirse
  en abanico hacia destinos a distinta altura -- y "Aprobar (Dir. Técnico)"
  salía por ARRIBA de `PENDIENTE_DIRECTOR_TECNICO`, obligándola a arquearse
  sobre la línea de "Enviar". `EstadoNode.jsx` ganó soporte para `offset`
  por handle (posición a lo largo del lado en vez del centro fijo -- ver
  `estiloOffset()`), y `NODOS_DEF` en `WorkflowDiagramaPage.jsx` se
  reescribió de punta a punta separando el tronco principal
  (Enviar/Devolver/Revisar) de la rama de excepción
  (Pendiente/Devuelta/En Revisión) con handles a offsets distintos en vez
  de todos al centro. `AccionEdge.jsx` ganó soporte opcional para
  `data.centerX` (fuerza el punto de quiebre del `smoothstep`) -- no se usa
  por default hoy (las posiciones ya no son fijas, ver el punto de abajo),
  pero queda disponible para ajustar una línea puntual si hiciera falta.
- **Directas e Indirectas como "dos workflows distintos" de verdad** --
  pedido explícito: "si en Directos no existe Director Técnico no debe
  aparecer". El primer corte de esta sesión pintaba `PENDIENTE_DIRECTOR_TECNICO`
  como nodo "fantasma" (atenuado) en la categoría donde no aplicaba; ahora
  el nodo y sus 3 aristas simplemente NO se agregan al array de
  `nodes`/`edges` cuando `tecnicoActivo` es falso para esa categoría --
  sigue siendo dinámico (calculado contra los desvíos reales), no
  hardcodeado por categoría.
- **`ENVIO_CONTRATO_POLIZAS`/`PASAR_CONTROLES` se quitaron del diagrama**
  (pedido explícito, "no existe, quitarlo de ambos") -- ningún
  `ESTADO_DESTINO` de ninguna otra acción produce ese estado, era un nodo
  fantasma sin ninguna solicitud real que pasara por ahí. Solo se quitó del
  dibujo -- el estado/acción siguen existiendo en el motor real
  (`solicitud.autorizacion.js`/`workflow.schema.js`), sin tocar.
- **Canvas editable y persistido, compartido entre admins** -- antes
  arrastrar un nodo era solo para leer más cómodo (se perdía al recargar).
  Nuevo módulo `workflow_layouts` (migración
  `20260831000516-create-workflow-layout.js`, modelo
  `workflowLayout.model.js`): una fila por categoría, `posiciones` es un
  JSONB `{ idEstado: {x, y} }`. `GET/PUT /workflows/layout?categoria=X`
  (mismo `workflow.service.js`/`.controller.js`/`.routes.js` de los
  desvíos, admin-only). El usuario confirmó explícitamente que quería esto
  **compartido para todos los admins**, no por navegador (se le preguntó
  porque la alternativa -- `localStorage` -- era más simple pero cada
  admin vería un acomodo distinto). `WorkflowDiagramaPage.jsx` pasó de un
  `nodes` derivado con `useMemo` a `useNodesState` de `@xyflow/react`
  (estado real que `onNodesChange` mantiene al día con cada arrastre); un
  botón "Guardar posiciones" en el header persiste `nodes` tal cual están
  en ese momento. `nodesConnectable={false}` se mantiene a propósito --
  se puede reacomodar DÓNDE está cada estado, pero no dibujar una conexión
  nueva ni cambiar qué acción une a cuáles estados (eso es "el flujo", pedido
  explícitamente para más adelante, no en este alcance). `elementsSelectable`
  pasó a `true` (antes `false`) para que también se puedan seleccionar
  aristas, no solo nodos.
- **Canvas a todo el alto de pantalla -- primer intento, INCORRECTO, ver la
  sección "Canvas a todo el alto: el fix real" más abajo**: se probó
  `AccesosLayout` con una prop opt-in `fullHeight` (`.wrapFullHeight`/
  `.contentInnerFullHeight`, `grid-template-rows: minmax(0, 1fr)`) más
  `WorkflowDiagramaPage.jsx#.page` en `height:100%` y `.diagramWrap` en
  `flex:1 1 auto` -- una cascada de `height:100%` de abajo hacia arriba. El
  usuario reportó que seguía sin verse a todo el alto; investigado con
  Playwright, resultó estar mal diagnosticado (ver la sección de abajo) y
  se **revirtió por completo** (la prop `fullHeight`, las dos clases CSS, y
  el `height`/`flex` de `.page`/`.diagramWrap` ya no existen).
- **Verificado (en su momento, sobre lo que SÍ quedó)**: migración 516
  corrida contra la base real de dev (tabla `workflow_layouts` creada,
  columnas confirmadas); `GET /workflows/layout` devuelve 401 sin cookie
  (ruta registrada, `requireAuth` activo). El resto de la verificación real
  del alto de pantalla se hizo en el fix siguiente.

## Líneas arrastrables + guías de alineación (2026-09-02)

Dos pedidos de seguimiento el mismo día, sobre el canvas recién hecho
editable: "¿puedo mover las líneas también?" y "que me diga que estoy
alineado/centrado".

- **`AccionEdge.jsx` ganó un grip arrastrable** -- un puntito gris
  (`.gripArista`) en el punto de quiebre de cada línea (corrido a la
  derecha de la píldora cuando la línea tiene una, para no taparla).
  Arrastrarlo llama `data.onMoveBend(id, x, y)` -- `useReactFlow().
  screenToFlowPosition()` convierte la posición del mouse (coordenadas de
  pantalla) a coordenadas del canvas, necesario porque el lienzo se puede
  paniar/zoomear. `data.centerY` es nuevo (antes `AccionEdge.jsx` solo
  soportaba forzar `centerX`) -- entre los dos definen dónde bloquea el
  `smoothstep` su quiebre.
- **`workflow_layouts.posiciones` cambió de forma** -- de un mapa plano
  `idEstado -> {x,y}` a `{ nodos: {...}, aristas: { idArista:
  {centerX,centerY} } }` (`workflow.schema.js#layoutSchema`,
  `workflowLayout.model.js`) -- sin necesidad de migrar datos viejos
  porque la función se acababa de agregar esa misma sesión, nadie había
  guardado un layout real todavía. `WorkflowDiagramaPage.jsx` ganó
  `aristaOverrides` (mismo patrón que los nodos: arranca desde
  `layoutGuardado.aristas`, `onMoveBend` lo actualiza en vivo, "Guardar
  posiciones" ahora manda las dos partes juntas).
- **Guías de alineación al arrastrar un nodo** -- mientras se arrastra, si
  la posición queda a ≤6px de la de otro nodo (en x o en y), el nodo se
  "engancha" exacto a esa coordenada (mismo criterio que Figma/PowerPoint)
  y aparece una línea punteada azul cubriendo todo el lienzo en esa
  coordenada (`guiaLineas`, dibujada con `<ViewportPortal>` -- vive en el
  mismo espacio de coordenadas que los nodos, así que pania/zoomea junto
  con el resto en vez de quedar fija en pantalla). Como todos los nodos
  miden 180px (`.nodo`), compartir la misma `x` ya es compartir el centro
  horizontal -- "alineado" y "centrado" resultan ser la misma condición
  acá, no hizo falta una cuenta aparte para cada uno. Implementado
  reemplazando el `onNodesChange` que traía `useNodesState` por uno propio
  que hace lo mismo (`applyNodeChanges`, confirmado idéntico al de la
  librería) más la detección de imán -- no se perdió ningún comportamiento
  del hook original.
- **Sin cambios de alcance** -- el grip mueve el PUNTO DE QUIEBRE de la
  línea (dónde dobla), no la línea completa a mano alzada, y sigue sin
  poder cambiar CUÁL acción une CUÁLES estados (`nodesConnectable={false}`
  intacto) -- eso sigue siendo "el flujo" que el usuario pidió dejar para
  más adelante.
- **Verificado**: sintaxis con `esbuild` en los 3 archivos tocados
  (`AccionEdge.jsx`, `WorkflowDiagramaPage.jsx`, `Workflows.module.css`) +
  bundle completo de `App.jsx`; `node --check` en el schema/modelo del
  backend; servidor de dev reiniciado solo y respondiendo. **No probado en
  navegador** -- mismo motivo que las secciones anteriores.

## Fix real: el grip no respondía al arrastre (2026-09-02)

El usuario reportó que el grip de la sección anterior no se podía arrastrar
("no me deja mover las líneas... no sé si es que por defecto tengo el mouse
de arrastre") y pidió que el punto solo apareciera en la línea seleccionada,
no en todas a la vez.

- **Causa real del "no arrastra"**: `<EdgeLabelRenderer>` (la propia
  librería) fija `pointer-events: none` en el contenedor donde vive
  cualquier contenido HTML superpuesto al canvas (para no bloquear el pan/
  zoom del lienzo que tiene debajo) -- CUALQUIER hijo interactivo ahí adentro
  necesita su propio `pointer-events: auto` explícito o simplemente nunca
  recibe el clic/drag (queda documentado en el propio código fuente de
  `@xyflow/react`: "to add mouse interactions you need to set the style
  pointerEvents: all"). Ni el grip ni la píldora de acción lo tenían -- un
  clic ahí "atravesaba" al lienzo de abajo, lo que el usuario percibía como
  "se activa el arrastre del mouse" (en realidad estaba paniando el canvas
  entero, nunca agarró el grip). Agregado a `.pildoraAccion`/`.gripArista`
  en `Workflows.module.css` -- esto de paso corrige un bug latente que
  probablemente ya afectaba a la píldora original desde antes de esta
  sesión (nunca se había hecho clic-test real sobre ella, toda la
  verificación de ese módulo fue por lectura de código).
- **El grip ahora solo aparece en la arista seleccionada**: `AccionEdge.jsx`
  recibe `selected` como prop directa de React Flow (se la pasa sola en
  cuanto el usuario hace clic sobre la línea -- `elementsSelectable` ya
  estaba en `true`, no hizo falta convertir `edges` en estado controlado
  para que este prop llegue bien) y el grip solo se renderiza cuando
  `selected` es `true`. Clic en cualquier parte vacía del canvas
  deselecciona todo -- el grip desaparece solo, sin lógica extra. La línea
  seleccionada además se dibuja un poco más gruesa (`strokeWidth: 3` en vez
  de `2`) para que quede claro cuál es "la activa".
- **Verificado**: sintaxis con `esbuild` en `AccionEdge.jsx`/
  `Workflows.module.css` + bundle completo de `WorkflowDiagramaPage.jsx` y
  `App.jsx`; servidor de dev siguió respondiendo. **No probado en
  navegador** -- mismo motivo que las secciones anteriores; esta vez en
  particular vale la pena confirmar que el grip realmente arrastra ahora
  (la causa raíz identificada es consistente con el síntoma reportado, pero
  no hay forma de confirmarlo 100% sin abrir el navegador).

**El grip de líneas quedó pendiente sin resolver** -- el usuario confirmó
que seguía sin poder arrastrarlo después del fix de `pointer-events`
de arriba, y pidió seguir con otra cosa por ahora. Queda para retomar en
otra sesión (probablemente con el usuario describiendo qué pasa exactamente
al intentarlo, o con Playwright habilitado, ya que sin poder ver el
navegador esta sesión se quedó sin más hipótesis verificables por lectura
de código).

## Aprobadores de frente: filtro por rol + Director Técnico dinámico (2026-09-02)

Dos correcciones sobre `FrenteDetallePage.jsx`, seguimiento del mismo
refactor de "eliminar permisos de rol para solicitudes":

- **El selector de personas de cada slot ahora también filtra por rol** --
  antes solo exigía que la persona estuviera asignada al frente
  (`usuarioIds`), sin mirar su rol de sistema, así que se podía elegir por
  ejemplo un `SOLICITANTE` como "Director Técnico". `SLOTS` ganó un campo
  `rol` (el rol de sistema esperado para cada uno de los 6 --
  `DIRECTOR_TECNICO`/`DIRECTOR_PROYECTO`/`CONTRATOS` ×2/`CONTROLES`/
  `DIRECTOR_CONTROLES`) y `usuariosElegibles` ahora exige "está en el
  frente Y tiene ese rol" (con la misma excepción de antes: alguien ya
  elegido en el slot se sigue mostrando aunque ya no cumpla ninguna de las
  dos condiciones, para no esconder en silencio una selección real ya
  guardada). Esto es solo una ayuda del selector -- el backend
  (`aprobadorFrente.schema.js`) sigue sin validar el rol de un
  `usuario_id` guardado, a propósito, para no romper datos ya cargados si
  alguien cambia de rol después.
- **"Director Técnico" deja de mostrarse cuando no participa en la
  categoría activa** -- el usuario notó que el slot aparecía igual en la
  pestaña Directa aunque el workflow de Directas ya no incluye a Director
  Técnico en absoluto (ver la sección "Workflows separados por categoría"
  más arriba). `FrenteDetallePage.jsx` ahora trae los desvíos reales
  (`listDesvios()`, mismo dato que consume `WorkflowDiagramaPage.jsx`) y
  calcula `tecnicoActivoPara(categoria)` con el mismo criterio exacto que
  el diagrama (desvío activo de `ENVIAR` a `PENDIENTE_DIRECTOR_TECNICO`,
  con `condicion_categoria` nula o igual a la categoría) -- el slot de
  Director Técnico se oculta de la lista si no aplica a la pestaña
  activa, calculado en vivo contra los desvíos reales, no hardcodeado por
  categoría (mismo principio de "una sola fuente de verdad" ya aplicado en
  el diagrama). Como consecuencia, el número de orden de cada slot
  (antes fijo en el string del label, "1. Director Técnico", "2. Director
  de Proyecto"...) pasó a calcularse en el render a partir de la posición
  en la lista YA FILTRADA -- si no, la lista de Directas arrancaría en
  "2." sin que exista un "1." a la vista.
- **Verificado**: sintaxis con `esbuild` + bundle de
  `FrenteDetallePage.jsx`; confirmado contra la base real de dev que el
  único desvío activo hoy es `ENVIAR/TECNICA/INDIRECTA ->
  PENDIENTE_DIRECTOR_TECNICO` (así que `tecnicoActivoPara('DIRECTA')` da
  `false` y `('INDIRECTA')` da `true`, el comportamiento esperado); y que
  existen usuarios reales activos con cada uno de los 6 roles de sistema
  usados para el nuevo filtro (`DIRECTOR_TECNICO`, `DIRECTOR_PROYECTO`,
  `CONTRATOS`, `CONTROLES`, `DIRECTOR_CONTROLES`), así que el filtro no
  deja ningún slot sin candidatos posibles en la práctica. No requirió
  cambios de backend -- `listUsuarios()` ya devolvía `roles` completo, solo
  no se usaba para filtrar acá. **No probado en navegador**.

## El logo deja de ser un link -- "Inicio" pasa a ser un módulo (2026-09-02)

Reversión explícita de una regla que se había formalizado unas fases atrás
("el logo del sidebar es un botón que lleva al inicio", agregada a
`ARQUITECTURA-FRONTEND.md` después de un hueco real encontrado en la Fase 7
-- ver esa sección más arriba). El usuario pidió volver atrás para este
proyecto puntual: "ya no quiero que mi logo del sidebar sea un botón,
quiero que en el sidebar aparezca el módulo 'Inicio'".

- **`.brand` (AppShell.jsx)** volvió a ser un `<div>` decorativo (no
  `<Link>`) -- se le quitaron `hover`/`focus-visible`/el padding+margen
  negativo que existían solo para simular un hitbox de botón sin mover el
  logo de su lugar (ya no hace falta ninguno de los dos).
- **"Inicio" es un `<NavLink>` directo** al principio del riel de nav,
  ANTES de `NAV_GROUPS` -- a diferencia de las demás categorías (botón +
  panel flotante con sub-items), "Inicio" no tiene nada que desplegar (un
  solo destino, `/`), así que navega directo al primer clic. Reusa las
  mismas clases `.navGroupButton`/`.navGroupButtonActive` que ya usa el
  botón de cada categoría, para que se vea como "un módulo más" (mismo
  tamaño/tipografía/estado activo), con el ícono `Home` de `lucide-react`.
- No se tocó `NAV_GROUPS`/`navModulos.jsx` -- "Inicio" no es un módulo
  filtrable por permiso (todo autenticado tiene Dashboard) ni tiene
  sub-items, así que no encajaba en esa estructura de todos modos; vive
  como un elemento hermano suelto dentro del mismo `<nav>`, no como una
  entrada más del array.
- **Verificado**: `esbuild` + bundle completo de `App.jsx` sin errores
  (confirma que `Link` (ya no usado) se quitó del todo del import y no
  quedó ninguna referencia suelta); servidor de dev sin cambios (edición
  100% frontend). **No probado en navegador**.

**Fix real sobre "canvas a todo el alto" (2026-09-02, mismo día, con
captura de pantalla del usuario)** -- el `fullHeight` de la sección
"Canvas de Workflows..." más arriba NO estaba funcionando en la práctica
(el usuario mandó una captura: el canvas quedaba chico, con un montón de
espacio en blanco debajo de la leyenda). Causa real: `AccesosLayout.
module.css#.wrapFullHeight` le ponía `height:100%` y `align-items:stretch`
al grid, pero sin `grid-template-rows` la única fila implícita del grid
queda con alto `auto` (el de su contenido) -- `align-items:stretch` solo
estira los ITEMS **dentro** de esa fila, nunca la fila misma para que
ocupe el alto del contenedor. Se agregó `grid-template-rows: minmax(0,
1fr)` a `.wrapFullHeight`, que fuerza esa fila a repartirse TODO el alto
de `.wrap` -- recién ahí `align-items:stretch` tiene un alto real que
repartir hacia `.contentInner`, y de ahí para abajo la cadena
`height:100%` que ya estaba armada (`.contentInnerFullHeight` ->
`WorkflowDiagramaPage.jsx#.page` -> `.diagramWrap{flex:1 1 auto}`) recién
puede resolver correctamente. Esta es la clase de bug que solo se nota con
los ojos puestos en el navegador -- quedó como ejemplo real de por qué "no
probado en navegador" en las secciones anteriores no era solo una
formalidad.

## Cuadro Comparativo estructurado (2026-09-09)

El usuario compartió una plantilla Excel real del "cuadro comparativo" que
se usaba antes de este sistema (ítems presupuestales comparados contra
varios proveedores, con AIU + IVA sobre utilidad) y pidió sacar esto del
modelo "archivo adjunto" (`archivoCuadroComparativo`, un simple
`STRING(500)` en `solicitudes` dentro de "Documentos requeridos") y
capturarlo como datos reales estructurados en `SolicitudForm.jsx`. Aplica a
Contrato y Orden de Servicio (mismo alcance que tenía el campo de archivo),
NUNCA a Otrosí. Sigue siendo obligatorio para `ENVIAR` -- ahora validado
también en el backend (antes solo se exigía en el frontend, hueco real
confirmado durante la exploración de este cambio).

- **El campo de archivo NO se borró de la base** -- 3 solicitudes reales
  migradas en la Fase 9 lo tienen poblado (`SOL-ODS-BK-KALA2-001`,
  `SOL-ODS-BK-KALIZA1-001`, `SOL-ODS-BK-LAGUNAYAMBIENTAL-001`). Se congeló:
  se sacó de `createSchema` (`solicitud.schema.js`) y de `CAMPO_DB`
  (`solicitud.service.js` -- ya no es escribible por `PATCH`), pero
  `_enrichBase()` lo sigue devolviendo tal cual para esos 3 registros (nunca
  perder un dato real de producción, mismo criterio de siempre).
- **3 tablas nuevas** (migraciones `20260831000517/518/519`, mismo estilo
  `up`-only que todas las migraciones de este proyecto), mismo patrón que
  Cronograma (`cronogramaContrato.model.js`→`faseCronograma.model.js`/
  `actividadCronograma.model.js`, un padre 1:1 con la Solicitud + un
  borra-y-recrea transaccional entero en cada guardado):
  - `cuadros_comparativos` (`cuadroComparativo.model.js`) -- padre, solo
    `id`+`solicitud_id` (FK única), sin columnas propias (a diferencia del
    cronograma, acá no hay ninguna "fecha de cabecera").
  - `cuadro_comparativo_proveedores` (`cuadroComparativoProveedor.model.js`)
    -- un proveedor/cotización, con SUS propios `administracion_pct`/
    `imprevisto_pct`/`utilidad_pct`/`iva_utilidad_pct` (cada cotización
    puede traer un AIU distinto) y `seleccionado` (marca cuál ganó).
  - `cuadro_comparativo_items` (`cuadroComparativoItem.model.js`) -- un
    ítem presupuestal (código, actividad, alcance, unidad, cantidad,
    observaciones) + **`precios` JSONB `{ [proveedorId]: valorUnitario }`**
    -- mapa en vez de una 4ª tabla de unión, mismo idioma ya usado en este
    proyecto para "id -> valor" (`AprobadorFrente`, `WorkflowLayout.posiciones`).
  - `valorTotal` por ítem/proveedor y los totales por proveedor (subtotal,
    +administración, +imprevisto, +utilidad, +IVA sobre utilidad, costo
    total) **NUNCA se guardan** -- se calculan en el FRONTEND en cada
    render (`CuadroComparativoBuilder.jsx#calcularValorTotalItem`/
    `calcularTotalesProveedor`, exportadas y reusadas tal cual por
    `SolicitudDetallePage.jsx` para que las dos vistas -- edición y
    lectura -- nunca puedan mostrar un número distinto), mismo criterio ya
    usado para `valorEnLetras`.
- **`backend/src/modules/solicitud/cuadroComparativo.js`** (nuevo, mismo
  patrón que `cronograma.js`) -- `POST`/`PUT /solicitudes/:id/cuadro-comparativo`
  hacen lo mismo: dentro de una transacción, borra el `CuadroComparativo`
  existente (cascada borra proveedores/items), crea el padre, crea los
  proveedores UNO POR UNO (no `bulkCreate` -- hace falta el id real de cada
  uno apenas se crea), arma un mapa `clientId → id real` con esos ids, y
  recién con ESE mapa remapea el `precios` de cada ítem (que el frontend
  arma keyed por `clientId`, un string temporal generado en el navegador,
  nunca un id real) antes de insertarlo. `clientId` de un proveedor ya
  guardado es `String(id)` (ver `normalizarCuadroComparativo` en el
  frontend) -- el backend no distingue "proveedor nuevo" de "ya existía",
  siempre hace un recreate completo.
- **`solicitud.estado.js`** -- nueva validación para `ENVIAR`, solo si
  `tipo` es `CONTRATO`/`ORDEN_SERVICIO`: exige un `CuadroComparativo` con
  al menos 1 proveedor y 1 ítem. Esto reemplaza al chequeo viejo del
  archivo (que en realidad NUNCA existió en el backend, solo en
  `SolicitudForm.jsx#validar` -- se corrige el hueco de una).
- **Frontend**: `CuadroComparativoBuilder.jsx` (nuevo) -- componente
  controlado (`{value: {proveedores, items}, onChange}`, sin fetch/save
  propio, mismo contrato que `CronogramaBuilder.jsx`) con una tabla ancha
  (ítems=filas, `overflow-x:auto`) donde cada proveedor agrega un par de
  columnas (Valor unitario editable / Valor total calculado); encabezado de
  cada proveedor con nombre editable + radio "seleccionado" + botón quitar;
  filas de resumen al final con los % de AIU/IVA editables por proveedor +
  el costo total calculado. `SolicitudForm.jsx` perdió el
  `<FileField accept=".xlsx,.xls">` de "Cuadro comparativo" de "Documentos
  requeridos" y ganó una sección propia "Cuadro Comparativo" (no anidada)
  con este builder, más `guardarCuadroComparativoSiAplica()` (mismo patrón
  que `guardarCronogramaSiAplica`, no llama a nada si no hay proveedores ni
  items) invocado junto al de cronograma en `guardar()`.
  `SolicitudDetallePage.jsx` ganó una sección de solo lectura "Cuadro
  Comparativo" (mismo patrón visual que la de Cronograma) justo después de
  "Documentos adjuntos" -- esta última **no se tocó** (`ARCHIVOS_LABELS`
  sigue mostrando el link de descarga del archivo viejo para las 3
  solicitudes reales que lo tengan).
- **Verificado** contra la base real de dev con fixtures `ZTEST_*`
  (creados y borrados en la misma sesión, sin dejar dato sintético):
  migraciones 517/518/519 corridas; `POST /solicitudes/:id/estado`
  (`ENVIAR`) en una `CONTRATO` sin cuadro comparativo → 400 con el mensaje
  esperado; `POST /solicitudes/:id/cuadro-comparativo` con 2 proveedores +
  2 ítems → `GET` posterior confirma que `precios` quedó remapeado a los
  ids reales de los proveedores recién creados; reintentar `ENVIAR` con el
  cuadro ya guardado → éxito (`ENVIADA`). Confirmado por query directa que
  las 3 solicitudes reales con `archivo_cuadro_comparativo` poblado siguen
  teniendo la columna intacta. `node --check`/`esbuild --bundle` (incluido
  el bundle completo de `App.jsx`) sin errores en todos los archivos
  nuevos/tocados. **No probado en navegador** -- el usuario no pidió usar
  Playwright para esto.

**Rediseño: tabla ancha → pestañas + tarjetas (2026-09-09, mismo día)** --
el usuario reportó el problema real de la tabla item×proveedor original
("una tabla puede ser muy ancha"): cada proveedor agregaba 2 columnas más,
sin límite. Se le presentaron dos alcances (pestañas por proveedor +
tarjetas resumen, vs. mantener la tabla acotada a 2-3 proveedores visibles)
y **eligió pestañas + tarjetas** explícitamente. La UI de
`CuadroComparativoBuilder.jsx` se separó en 3 piezas que ya no dependen del
número de proveedores para el ancho:

1. **Tabla de ÍTEMS** (fija, sin ninguna columna de precio) -- código,
   "Descripción de ítem" como encabezado agrupador de 2 columnas
   (Actividad o insumo | Alcance, fiel a la hoja Excel real que compartió
   el usuario), unidad, cantidad, observaciones. Se edita una sola vez, sin
   importar cuántos proveedores se comparen después.
2. **Tarjetas de comparación** (una por proveedor, en fila/wrap, nunca una
   columna de tabla) -- Costo Total en grande + Subtotal, con el proveedor
   `seleccionado` resaltado en verde. Clic en una tarjeta abre esa pestaña.
3. **Pestañas por proveedor** (mismo patrón "horizontal underline tabs" que
   `FrenteDetallePage.jsx#categoriaTab`) -- cada pestaña edita SOLO el
   precio unitario de ESE proveedor por ítem (la descripción del ítem no se
   repite, ya está arriba) + su nombre/radio "seleccionado"/AIU%/IVA%, con
   un resumen de subtotal/AIU/costo total al pie de la pestaña activa.

**Decisión explícita descartada, documentar por si se retoma**: el usuario
preguntó por traer de vuelta también "Pendiente por consumir"/"Cantidades
reales según PPTO" de la hoja Excel original -- se confirmó que NO: esas
columnas dependen de un presupuesto que esta app no tiene y hubiera
significado otra migración para campos que nadie iba a poder llenar con
datos reales. Solo se agregó el encabezado agrupador "Descripción de ítem"
(cosmético, cero cambio de esquema) sobre los campos que ya existían
(`actividad`/`alcance`).

`SolicitudDetallePage.jsx` (modo lectura) se rediseñó igual -- misma tabla
de ítems fija + tarjetas de comparación + pestañas de solo lectura por
proveedor (estado local `ccTab`, cae al primer proveedor si no se eligió
ninguno todavía). `calcularValorTotalItem`/`calcularTotalesProveedor`
siguen siendo la única fuente de verdad para los totales, exportadas desde
`CuadroComparativoBuilder.jsx` y reusadas tal cual acá -- las dos vistas
nunca pueden mostrar un número distinto para lo mismo.

Verificado con `esbuild --bundle` en los 2 archivos tocados
(`CuadroComparativoBuilder.jsx`, `SolicitudDetallePage.jsx`) + el bundle
completo de `App.jsx`, sin errores. **No probado en navegador**.

**Ajustes de UI sobre el cuadro comparativo, mismo día**: (1) el `<select>`
de Unidad se veía recortado -- causa real, sin `table-layout: fixed` un
texto largo en Actividad/Observaciones "robaba" ancho de las columnas
cortas (el `width` de un `<th>` es solo una sugerencia en auto-layout), y
`.card` tiene `overflow: hidden` en los DOS ejes (el `overflowX: 'auto'`
inline solo pisaba ese eje) -- se agregó `table-layout: fixed` + anchos
reorganizados + `overflowY: 'visible'` en las 4 tablas del cuadro
comparativo (editor y lectura). (2) "Quitar proveedor" no eliminaba, solo
vaciaba los precios -- bug real: `quitarProveedor` llamaba a
`setProveedores`/`setItems` por separado, y las dos leen el mismo `value`
del closure (congelado en ese render); la segunda pisaba a la primera con
la lista de proveedores SIN filtrar. Se unificó en un solo `onChange` con
las dos partes ya combinadas. (3) esa misma fila (Nombre del proveedor +
"Proveedor seleccionado" + "Quitar proveedor") no alineaba con
`align-items:flex-end` porque un `<Field>` mide más alto que un control
suelto (le suma su propio label) -- se agregó `.actionRow`/
`.actionRowSpacer` a `Solicitudes.module.css` (spacer oculto que reproduce
el alto de label+gap del Field, en vez de adivinar un padding/margin). (4)
"no me gusta que el texto largo crezca a la derecha" -- las celdas de
Actividad/Alcance/Observaciones eran `<input>` de una sola línea (scroll
horizontal interno); se cambiaron a un `<textarea>` que crece de alto vía
la técnica CSS-only "grid + `::after` replicado" (`.growWrap` en
Solicitudes.module.css, sin JS de medición/refs) -- el primer intento no
funcionó porque faltaba `grid-template-columns: minmax(0, 1fr)` (sin eso la
única columna del grid se mide por el ancho preferido del propio
`<textarea>`, no por el ancho real de la celda, mismo síntoma que el punto
1).

**Bug real encontrado por el usuario al revisar una solicitud de prueba en el
navegador (2026-09-09)**: en el detalle de solo lectura, la pestaña de cada
proveedor mostraba la tabla de ítems (Ítem/Cantidad/Valor unitario/Valor
total) pero le faltaban dos cosas que el EDITOR sí muestra para ese mismo
proveedor: los 4 % de AIU/IVA, y el desglose del total (Subtotal + cada
componente ya calculado + Costo total) -- solo quedaba el resumen compacto
"Costo Total"/"Subtotal" de la tarjeta de comparación de arriba, sin forma
de ver de dónde salía ese número. Causa: al portar el rediseño
tabla-ancha→pestañas+tarjetas (ver más arriba, mismo día), ese bloque del
editor (`CuadroComparativoBuilder.jsx`, el `CAMPOS_AIU.map` de los % +
el resumen de totales al pie de cada pestaña) nunca se replicó en
`SolicitudDetallePage.jsx` -- quedó fuera sin querer, no era una decisión de
alcance.

- **`CAMPOS_AIU`** (la lista de los 4 campos `[campoPct, campoValor, label]`)
  se exportó desde `CuadroComparativoBuilder.jsx` -- antes era una constante
  interna, ahora es la única fuente de verdad para "qué campos de AIU
  existen", reusada tal cual por las dos vistas (si el negocio pide un 5º
  campo de AIU en el futuro, agregarlo a esa lista alcanza para que aparezca
  en ambas).
  `SolicitudDetallePage.jsx` la importa junto con `calcularTotalesProveedor`
  (ya se importaba para las tarjetas de comparación).
- Se agregaron, en la pestaña de cada proveedor: una fila con los 4 % (`{ ...
  proveedorActivo[campoPct] ?? 0 }%`, valores fijos ya que es solo lectura) y
  el mismo bloque de resumen de totales que el editor (fondo
  `--color-surface-sunken`, Subtotal + Administración/Imprevisto/Utilidad/IVA
  ya calculados + Costo total), calculado con
  `calcularTotalesProveedor(items, { ...proveedorActivo, clientId:
  String(proveedorActivo.id) })` -- mismo criterio de siempre: nunca
  recalcular con una fórmula propia, siempre la función compartida, para que
  el editor y el detalle no puedan mostrar un número distinto para lo mismo.
- Encontrado y corregido revisando la solicitud de prueba real
  `SOL-D-CONT-BK-KABO1-002` (creada ese mismo día vía API para verificación
  visual, con 2 proveedores con AIU distinto cada uno) -- confirma el valor
  de crear datos de prueba reales en vez de solo leer el código: este hueco
  no era visible por lectura de código a simple vista (la función correcta
  YA estaba importada y usada para las tarjetas, solo faltaba en la vista de
  detalle de la pestaña).

Verificado con `esbuild --bundle` en los 2 archivos tocados
(`CuadroComparativoBuilder.jsx`, `SolicitudDetallePage.jsx`) + el bundle
completo de `App.jsx`, sin errores; ambos servidores de dev respondiendo.
**No probado en navegador por esta sesión** -- pendiente de que el usuario
confirme en la misma solicitud de prueba que ya quedó viendo.

## Formato de Solicitud restaurado (2026-09-09)

El usuario mandó una captura de la app original (Next.js) mostrando una
sección "Formato de Solicitud" (badge "Opcional") que la migración de la
Fase 4 había simplificado de más: acá solo quedó "Detalle adicional
(opcional)" con 3 textareas sueltas (Alcance/Términos de referencia/
Condiciones especiales), sin placeholders, perdiendo todo el resto
(resumen de Área/frente, Solicitante, Proyecto, Tipo, Contratante, "Datos
del contratista" con link "Editar datos", preview del Objeto). Se
restauró en `SolicitudForm.jsx`, con 4 decisiones explícitas del usuario:

- **No es plegable** -- se descartó el chevron expandir/colapsar del
  original, es un `.section` normal siempre visible (más simple, el
  usuario lo prefirió así).
- **Nombre/NIT del contratante siguen fijos por código** (`CONTRATANTE_NOMBRE`/
  `CONTRATANTE_NIT`, sin cambios de comportamiento) -- ahora se HACEN
  VISIBLES en un `<TextInput disabled>` (fieles a como se veían en la
  imagen, con borde/fondo de campo) en vez de quedar completamente ocultos
  del formulario como estaban.
- **"Editar datos" es un link real** a `/terceros/:id` (`target="_blank"`)
  -- reusa `TerceroDetallePage.jsx` ya existente, sin duplicar edición acá.
- **Reemplaza, no se agrega aparte** -- "Detalle adicional (opcional)"
  desapareció como sección propia; Alcance/Términos de referencia/
  Condiciones especiales viven ahora DENTRO de "Formato de Solicitud",
  con el mismo texto de ejemplo (placeholder) que traía el original.

Contenido de la sección nueva, de arriba hacia abajo: `.infoGrid` con
Área/frente (nombres de `frentesSeleccionados`, nuevo `useMemo` compartido
que reemplazó 2 `.filter()` repetidos en el auto-generado del asunto y en
`buildPayload()`) + Solicitante (nombre/cargo del `usuario` logueado) +
Proyecto (`frentesSeleccionados[0]?.proyecto?.nombre`) + Tipo (Otros
Servicios/Diseño para Contrato, "—" para Orden de Servicio, fiel a la
imagen); Nombre/NIT del contratante (disabled); "Datos del contratista"
-- solo si hay `terceroSeleccionado`, 7 campos de contacto del Tercero
(mismos que ya muestra `SolicitudDetallePage.jsx`) con "Sin información"
en cursiva para los que vengan `null`; "Objeto" como `<Textarea disabled>`
que refleja `form.descripcionActividad` (el campo real y editable sigue
siendo el de "Información del formulario" más arriba, este es solo el
preview); y los 3 campos editables de siempre, ahora con placeholder.

No se tocó `SolicitudDetallePage.jsx` (el detalle ya muestra
Alcance/Términos/Condiciones en "Datos de la solicitud", sin badge
"Opcional" -- ese badge solo tiene sentido en el formulario de captura) ni
`OtrosiForm.jsx` -- el usuario no lo pidió y no se verificó si ese
formulario tenía "Formato de Solicitud" en la app original; revisarlo
antes de portar esto ahí si hace falta.

Verificado con `esbuild --bundle` en `SolicitudForm.jsx` + el bundle
completo de `App.jsx`, sin errores. **No probado en navegador**.

## `fieldMd`/`fieldLg` eran clases muertas en TODO el proyecto (2026-09-09)

Pedido puntual del usuario ("compactar el formulario, dos inputs por línea
en pantalla ancha, uno en pantalla angosta") destapó un bug mucho más
grande de lo que parecía: `<Field className="fieldMd">`/`"fieldLg"` ya se
usaba así en **más de una docena de archivos de todo el proyecto**
(`ProyectosPage.jsx`, `FrentesPage.jsx`, `FrenteDetallePage.jsx`,
`UsuarioFormPage.jsx`, `RolDetallePage.jsx`, `WorkflowDetallePage.jsx`,
`NuevoTerceroPage.jsx`, `TerceroDetallePage.jsx`, `EspecialidadesPage.jsx`,
`SolicitudActions.jsx`, `CronogramaBuilder.jsx`, `CuadroComparativoBuilder.jsx`)
pero la clase **nunca existió en ningún lado** -- ni en un `.module.css` ni
en el CSS global. Cada fila de "dos campos lado a lado" del proyecto
ENTERO quedaba sin ancho controlado desde siempre, un no-op puro.

- **Causa de fondo, no solo "faltaba la clase"**: `className="fieldMd"` es
  un STRING LITERAL en los ~35 sitios donde se usa -- eso solo puede
  funcionar si la clase es GLOBAL. La tentación inicial (agregarla a
  `Solicitudes.module.css`, el archivo donde se detectó el pedido) habría
  sido OTRO bug del mismo tipo: Vite hashea cada clase de un `.module.css`
  a un nombre único por archivo (ej. `_fieldMd_a1b2c_1`), así que un string
  literal nunca la matchea -- se habría "arreglado" `SolicitudForm.jsx`
  nada más, dejando los otros 11 archivos exactamente igual de rotos.
- **Fix real**: `.fieldMd`/`.fieldLg` (`flex: 1 1 200px` / `flex: 1.5 1
  260px`, mismos valores que ya usa HRMS para este patrón) se agregaron
  como clases GLOBALES en `frontend/src/index.css` -- arregla los ~35
  usos existentes de una sola vez, sin tocar esos 12 archivos. Un
  `<Field>` con esta clase asume que su contenedor ya es
  `display:flex; flex-wrap:wrap` -- `flex-basis` (200/260px) es el ancho
  mínimo antes de bajar de línea, `flex-grow:1` reparte el espacio
  sobrante entre los campos de la fila.
- **`flex-wrap: wrap` faltante, encontrado de paso**: algunos de esos
  contenedores nunca tuvieron `flex-wrap: wrap` (sin efecto visible hasta
  ahora porque `.fieldMd` no existía) -- de haber quedado así, ahora que sí
  reparten ancho real habrían apretado los campos en pantalla angosta en
  vez de bajarlos a una línea cada uno. Corregido en
  `Configuracion.module.css#.row` (cubre `FrenteDetallePage.jsx`/
  `ProyectosPage.jsx`/`FrentesPage.jsx`/`UsuarioFormPage.jsx`/
  `WorkflowDetallePage.jsx`, los 5 que comparten esa clase) y en 5 filas
  sueltas con `style` inline (`NuevoTerceroPage.jsx` ×4,
  `EspecialidadesPage.jsx` ×1) -- `TerceroDetallePage.jsx`/
  `CronogramaBuilder.jsx`/`CuadroComparativoBuilder.jsx`/
  `SolicitudActions.jsx` ya lo tenían bien, no se tocaron.
- **`SolicitudForm.jsx`** además ganó 2 filas nuevas que antes eran un
  campo por línea sin necesidad (con `.fieldMd`/`.fieldLg` ya funcionando,
  tenía sentido agruparlas): "Plazo de ejecución" (`fieldMd`) + "Forma de
  pago" (`fieldLg`, es un texto más largo) en "Información del
  formulario"; "Nombre del contratante"/"NIT del contratante" en "Formato
  de Solicitud" ya estaban en fila desde la sección anterior, ahora
  finalmente con el ancho correcto. Se agregó `.fieldRow` a
  `Solicitudes.module.css` (`display:flex; gap; flex-wrap:wrap`, SÍ puede
  vivir en el module porque se referencia como `styles.fieldRow`, no como
  string) como wrapper reusable para estas filas nuevas.
- Deliberadamente NO se usó una media query -- `flex-wrap` con
  `flex-basis` resuelve el ancho contra el contenedor REAL (sigue viéndose
  bien con el sidebar abierto, zoom del navegador, etc.), no contra un
  ancho de pantalla fijo.

Verificado con `esbuild --bundle` en `index.css`/`Configuracion.module.css`/
`Solicitudes.module.css` + el bundle completo de `App.jsx`, sin errores.
**No probado en navegador** -- vale la pena una revisión visual real dado
lo extendido del alcance (toca prácticamente cada formulario del proyecto).

**Seguimiento el mismo día -- `<Textarea>` gana auto-crecimiento sin resize
manual, en TODA la app**: pedido puntual sobre "Objeto"/"Forma de pago" de
`SolicitudForm.jsx` (mismo alto que "Plazo de ejecución", Objeto a solo 2
líneas), más "que a todos los textareas no se le pueda modificar el
tamaño, solo que crezcan automáticamente". Mismo criterio que el fix de
`fieldMd`/`fieldLg` de arriba: en vez de tocar cada textarea suelto, se
arregló el componente COMPARTIDO -- `components/ui/Field.jsx#Textarea`
(usado por TODO formulario del producto) ahora envuelve el `<textarea>`
real en el mismo truco CSS-only "grid + `::after` replicado" que ya se
había construido para `CuadroComparativoBuilder.jsx#.growWrap` (pseudo-
elemento invisible que replica el texto vía `data-replicated-value`,
comparte `grid-area` con el textarea real -- el alto del grid termina
siendo el que el texto necesita, sin JS de medición ni refs). CSS nuevo en
`Field.module.css#.growWrap` (repite el mismo padding/borde/fuente que
`.control` a propósito -- si no calzan exacto, el texto envuelve distinto
en el `::after` que en el textarea real y el alto medido queda mal).

Esto **deja de ser una copia literal de la plantilla** (`Field.jsx` traía
el aviso "copiado tal cual... única forma de garantizar 100% de paridad")
-- se documentó explícitamente en el archivo para que una sincronización
futura desde `Plantilla-Arquitectura-AED` no pise este cambio sin querer.

`SolicitudForm.jsx`: "Objeto" pasó de `rows={4}` a `rows={2}`; "Forma de
pago" de `rows={3}` a `rows={1}` (mismo alto inicial que el `TextInput` de
"Plazo de ejecución" de al lado, ahora en la misma fila) -- ambos crecen
solos si el contenido no entra. No se tocó ningún otro textarea del
proyecto -- todos ganan el comportamiento gratis al pasar por el mismo
`Field.jsx#Textarea`, sin cambios de código en esos archivos.

Verificado con `esbuild --bundle` en `Field.module.css` + el bundle
completo de `App.jsx`, sin errores. **No probado en navegador**.

## `tipoContrato` de Solicitud: Diseño no aplica a Directa + valores por categoría (2026-09-09)

Tres pedidos seguidos del usuario sobre `Solicitud.tipo_contrato` (columna
STRING libre, sin enum a nivel de base) el mismo día:

1. "En los contratos directos no existen los contratos de tipo Diseño" --
   `SolicitudForm.jsx#tiposContratoDisponibles` deja de ofrecer `DISENO`
   como opción cuando `categoriaEfectiva === 'DIRECTA'`; `solicitud.estado.js`
   ganó el mismo chequeo en el backend para `ENVIAR` (ver más abajo, ya
   generalizado al punto 3).
2. "En Directos no se llama Otros Servicios, se llama Todo Costo" -- primer
   intento: **solo la etiqueta** cambiaba según categoría sobre un mismo
   valor guardado `'OBRA'`.
3. **Corrección del usuario al ver el resultado**: "no, la idea es que no
   siga siendo OBRA... eso de OBRA no es necesario" -- el valor GUARDADO
   (no solo la etiqueta) tenía que ser distinto por categoría. Se
   reemplazó `'OBRA'` por dos valores nuevos:
   - `TODO_COSTO` -- único valor válido para Directa.
   - `OTROS_SERVICIOS` -- reemplaza a `'OBRA'` para Indirecta.
   - `DISENO` sin cambios (sigue sin aplicar a Directa en absoluto).

- **`frontend/src/utils/solicitudes.js#tipoContratoLabel`** pasó de
  `(tipoContrato, categoria) => ...` a `(tipoContrato) => ...` -- ya no
  necesita la categoría, es un mapa directo (`TODO_COSTO`/`OTROS_SERVICIOS`/
  `DISENO`) porque el valor mismo ya la codifica. Usado en
  `SolicitudForm.jsx` (radio de "Tipo de contrato" + resumen "Tipo" de
  "Formato de Solicitud") y `SolicitudDetallePage.jsx` ("Tipo de contrato"
  -- de paso se corrigió que ahí mostraba el valor crudo sin traducir,
  hueco preexistente).
- **`backend/.../documento.js`** (el generador real del .docx) tenía el
  mismo texto hardcodeado -- si no se corregía, un contrato Directo real
  habría salido impreso diciendo "Otros Servicios" en vez de "Todo Costo".
  Mismo mapa `TIPO_CONTRATO_LABELS` repetido acá (el backend no puede
  importar código del frontend).
- **`solicitud.estado.js`**: el chequeo puntual "Diseño no aplica a
  Directa" se generalizó a `TIPOS_CONTRATO_VALIDOS_POR_CATEGORIA` (`{DIRECTA:
  ['TODO_COSTO'], INDIRECTA: ['OTROS_SERVICIOS', 'DISENO']}`) -- valida en
  `ENVIAR` que `tipo_contrato` sea uno de los válidos para la categoría
  real de la solicitud, cierra el hueco de un POST/PATCH a mano con una
  combinación inválida.
- **Migración de datos** `20260831000520-renombrar-tipo-contrato-obra.js`
  -- las 3 solicitudes reales con `tipo_contrato = 'OBRA'` (las 3
  `INDIRECTA`, confirmado por query antes de migrar -- cero `DIRECTA` con
  este valor todavía) pasaron a `'OTROS_SERVICIOS'`. La rama `DIRECTA ->
  'TODO_COSTO'` está en la migración por completitud/simetría aunque hoy
  no tenga ninguna fila real que tocar.
- **No se tocó** `Tercero.tipo_contrato` (`NuevoTerceroPage.jsx`/
  `TerceroDetallePage.jsx`, sigue con valores `OBRA`/`DISENO`/`SERVICIOS`)
  -- es la clasificación del CONTRATISTA en sí (qué tipo de contratos está
  aprobado para hacer), un concepto totalmente aparte del `tipoContrato`
  de una Solicitud puntual, sin relación con la categoría Directa/Indirecta
  de nada.

Verificado: query directa post-migración confirma las 3 filas reales en
`'OTROS_SERVICIOS'`; `node --check`/`esbuild --bundle` (bundle completo de
`App.jsx`) sin errores en todos los archivos tocados; servidor de dev
reinició solo tras la migración y siguió respondiendo. **No probado en
navegador**.

## Módulo "Memoria" -- tabla dinámica para Solicitudes Directas (2026-09-09)

Pedido nuevo del negocio: una tabla tipo Excel donde el usuario define su
PROPIA estructura -- agrega columnas eligiendo el tipo (Texto/Entero/Float/
Fecha/Rango de fechas/Calculada) y filas libremente, con la primera columna
siempre reservada para anexar una imagen (compartió una memoria técnica real
como ejemplo -- una tabla de "Visitas para Controles Topográficos"). 4
decisiones explícitas del usuario acotaron el alcance real:

- **Una sola tabla de Memoria por solicitud** (no una colección de varias
  tablas con título propio cada una, aunque el ejemplo real mostraba una
  tabla puntual de un documento con varias -- se simplificó a propósito).
- **Columnas calculadas SÍ hacen falta** (`Total Visitas = Cant × Cant` en
  el ejemplo) + una fila de TOTAL que suma una columna. Los operandos de una
  fórmula **solo pueden ser columnas Entero/Float** (nunca otra Calculada)
  -- restricción a propósito para no tener que detectar ciclos, decidida
  con el usuario al planear esto.
- **Solo Solicitudes Directas por ahora** (`categoriaEfectiva === 'DIRECTA'`
  en `SolicitudForm.jsx`), Contrato y Orden de Servicio. Opcional -- no
  bloquea `ENVIAR` (a diferencia de Cuadro Comparativo).

**Diseño de datos (3 tablas)**, mismo patrón que Cuadro Comparativo (padre
1:1 con la Solicitud + upsert transaccional borra-y-recrea completo,
`clientId` para referenciar entidades entre sí antes de tener ids reales):

- `memorias` (`memoria.model.js`) -- padre, `id`/`solicitud_id` (FK única)/
  `titulo` (opcional).
- `memoria_columnas` (`memoriaColumna.model.js`) -- `nombre`/`tipo`/`orden`
  + para `CALCULADA`: `formula_columna_a_id`/`formula_operador`/
  `formula_columna_b_id` (FK a otra fila de esta MISMA tabla) +
  `mostrar_total` (suma esa columna en la fila TOTAL del pie, solo
  aplicable a `ENTERO`/`FLOAT`/`CALCULADA`). La columna con `orden = 0` es
  SIEMPRE `IMAGEN` -- garantizado por el frontend (`MemoriaBuilder.jsx`),
  sin constraint especial en la base.
- `memoria_filas` (`memoriaFila.model.js`) -- `valores` JSONB
  `{ [columnaId]: valor }`, mismo idioma que `CuadroComparativoItem.precios`.
  Forma de `valor` según `tipo`: `TEXTO`→string, `ENTERO`/`FLOAT`→number,
  `FECHA`→`"YYYY-MM-DD"`, `RANGO_FECHAS`→`{inicio,fin}`, `IMAGEN`→URL string
  (mismo contrato que ya devuelve `POST /upload`). **`CALCULADA` nunca se
  guarda** -- se calcula en el frontend en cada render a partir de sus 2
  columnas operando en esa misma fila (mismo criterio que los totales de
  Cuadro Comparativo).

**`backend/src/modules/solicitud/memoria.js`** (`upsertMemoria`, mismo
patrón que `cuadroComparativo.js`) -- dentro de una transacción: borra la
Memoria existente (cascada borra columnas/filas), crea el padre, crea las
columnas UNA POR UNA armando un mapa `clientId → id real`, hace una **2ª
pasada** sobre las columnas `CALCULADA` para resolver
`formula_columna_a_id`/`formula_columna_b_id` reales (así una fórmula puede
referenciar una columna definida más adelante en el body sin problema de
orden), y por último crea las filas remapeando `valores` de
`{clientId: valor}` a `{idReal: valor}` -- **excluyendo explícitamente**
cualquier valor que el frontend mande para una columna `CALCULADA` (un
`Set` de ids calculados, no solo "si el id no existe" -- el id SÍ existe,
hay que decidir a propósito no guardarlo). `POST/PUT /solicitudes/:id/memoria`.
`solicitud.service.js` ganó `memoriaInclude()`/`_enrichMemoria()` (mismo
patrón que Cuadro Comparativo), agregado a `getById()`.

**Frontend -- `MemoriaBuilder.jsx`** (nuevo, componente controlado
`{value: {titulo, columnas, filas}, onChange}`):
- Gestión de columnas (nombre + `<Select>` de tipo; si es `CALCULADA`, 2
  `<Select>` de columna operando + operador; checkbox "Mostrar total" para
  tipos numéricos) + la tabla en sí, con cada celda renderizada según el
  `tipo` de su columna. Columna `TEXTO` reusa `CeldaTextoLargo` (exportada
  desde `CuadroComparativoBuilder.jsx` -- mismo truco "grow-wrap" de auto-
  crecimiento sin resize manual, ver la sección de esa fecha más arriba).
  Tabla envuelta en `overflow-x:auto` sin rediseño tipo pestañas -- a
  diferencia de Cuadro Comparativo, acá no hay una segunda dimensión
  natural para agrupar (es literalmente el pedido: "una hoja tipo Excel"
  con columnas ilimitadas).
- Exporta `calcularValorCalculada`/`calcularTotalColumna` (única fuente de
  verdad, reusada tal cual por `SolicitudDetallePage.jsx`) y
  `normalizarMemoria` (agrega `clientId = String(id)` a lo que llega del
  backend -- las keys de `fila.valores` YA vienen como string del id real
  gracias al JSONB, así que calzan solas con el `clientId` recién asignado,
  sin remapeo extra).
- **`ImagenAutenticada`** (exportado, usado por la celda `IMAGEN` y por el
  detalle de solo lectura) -- hallazgo real al implementar la miniatura:
  `GET /files/:filename` es autenticado, y un `<img src>` directo a otro
  origen (dev: frontend `:5193` vs backend `:3021`) **no manda la cookie**
  (`SameSite=Lax` no viaja en un subrecurso cross-site como un `<img>`, a
  diferencia de una navegación de nivel superior) -- mismo problema que ya
  resolvía `api/solicitudes.js#descargarArchivo` para las descargas. Se
  resuelve igual pero para mostrar en vez de guardar: `fetch(url,
  {credentials:'include'})` → `URL.createObjectURL(blob)` → `<img src>`,
  con `revokeObjectURL` al desmontar/cambiar.
- `SolicitudForm.jsx`: sección "Memoria" gateada por
  `categoriaEfectiva === 'DIRECTA'`, después de "Cuadro Comparativo".
  `guardarMemoriaSiAplica` (mismo patrón "si no hay filas, no llama a
  nada") en el flujo de `guardar()`. `SolicitudDetallePage.jsx`: sección de
  solo lectura (mismo gate de categoría + `solicitud.memoria?.filas?.length > 0`),
  reusa `normalizarMemoria`/`calcularValorCalculada`/`calcularTotalColumna`/
  `ImagenAutenticada` tal cual -- nunca puede mostrar un número distinto al
  de la vista de edición.

**Verificado** contra la base real de dev con fixtures `ZTEST_*` (creados y
borrados en la misma sesión, sin dejar dato sintético): `POST
/solicitudes/:id/memoria` con 4 columnas (Imagen/Entero/Float/Calculada
`Entero × Float` con `mostrarTotal`) + 2 filas -- confirmado que
`formula_columna_a_id`/`formula_columna_b_id` quedaron con los ids reales
correctos, que el valor mandado para la columna Calculada (enviado a
propósito para probar el filtro) NO se guardó en `valores`, y que el `GET`
posterior devuelve la forma enriquecida esperada por `normalizarMemoria`.
`node --check`/`esbuild --bundle` (bundle completo de `App.jsx`) sin
errores en todos los archivos nuevos/tocados. **No probado en navegador**
-- en particular, la miniatura autenticada (`ImagenAutenticada`) es la
pieza con más riesgo real de que algo no calce visualmente sin verla
correr, vale la pena una revisión cuando el usuario pueda.

## `MemoriaBuilder.jsx`: encabezados editables en la tabla + arrastrar para reordenar (2026-09-09)

Dos pedidos de seguimiento el mismo día sobre la UI recién construida.

**"Que no estén los botones crear columna y crear fila por aparte, que
estén en la misma tabla el botón +... y que se pueda modificar el texto de
los encabezados... y el tipo"** -- el primer corte tenía una sección
"Columnas" separada arriba de la tabla (nombre + `<Select>` de tipo por
fila, más un botón "Agregar columna" debajo de esa lista) y un botón
"Agregar fila" suelto debajo de la tabla. Rediseñado:

- **`EncabezadoColumna`** (nuevo, interno) -- renderiza TODO el editor de
  una columna (nombre, tipo, y si es `CALCULADA` sus 2 columnas operando +
  operador, más el checkbox "Mostrar total") directo dentro del propio
  `<th>` de esa columna. La columna `IMAGEN` (fija) no pasa por acá, sigue
  sin editor. `headerControlStyle()` resetea `text-transform`/
  `letter-spacing` en los controles internos para que no hereden el estilo
  mayúscula del `<th>` mientras se editan.
- **Botón "+" dentro del `<thead>`** -- última celda de la fila de
  encabezados, agrega columna. **"Agregar fila" pasó a ser la última fila
  del propio `<tbody>`** (una `<tr>` con un solo `<td colSpan>` que ocupa
  todo el ancho) en vez de un botón fuera de la tabla.
- Se quitó el import de `Select` (`components/ui/Field.jsx`) y de `Button`
  (`components/ui/Button.jsx`) -- ya no quedaba ningún uso tras convertir
  todo a `<select>`/`<button>` nativos estilados inline (mismo patrón que
  ya usaban "quitar fila"/"quitar columna").

**"También que se puedan arrastrar las columnas y filas"** -- Drag and
Drop nativo de HTML5 (`draggable`/`onDragStart`/`onDragOver`/`onDrop`), sin
agregar ninguna dependencia nueva (mismo criterio del proyecto: en toda su
historia solo se agregó una dependencia npm nueva al frontend,
`@xyflow/react`, y fue para una necesidad de canvas completamente distinta
-- ver la sección de Workflows más arriba).

- **`moverElemento(lista, clientIdOrigen, clientIdDestino)`** (nuevo,
  helper genérico) -- saca el elemento de origen y lo reinserta en la
  posición del de destino; reusado tal cual para columnas y filas.
- **`colDrag`/`rowDrag`** (estado nuevo en `MemoriaBuilder`) -- el
  `clientId` que se está arrastrando en cada momento. Un ícono
  `GripVertical` (`lucide-react`) es el ÚNICO elemento `draggable` de cada
  encabezado/fila -- a propósito, para no interferir con hacer clic/
  escribir en los `<input>`/`<select>` del propio encabezado o en las
  celdas de la fila (si el `<th>`/`<tr>` completo fuera `draggable`,
  cualquier intento de editar un campo empezaría un drag en vez de
  enfocar el control).
- El grip vive DENTRO de `EncabezadoColumna` (nueva prop
  `onIniciarArrastre`, antepuesto al input de nombre) para columnas, y
  junto al botón de basura en la celda de acciones de cada fila. El
  `<th>`/`<tr>` contenedor es el que recibe `onDragOver={e =>
  e.preventDefault()}` + `onDrop` (llama a `moverColumna`/`moverFila`, que
  no hacen nada si `colDrag`/`rowDrag` es `null` o coincide con el destino,
  y limpian el estado al terminar).
- **La columna Imagen queda pinneada a propósito** -- no tiene grip (su
  `<th>` se sigue renderizando sin pasar por `EncabezadoColumna`) y su
  `<th>` no tiene `onDragOver`/`onDrop`, así que nunca puede ser origen ni
  destino de un `moverColumna` -- se queda siempre en la posición 0 sin
  necesitar ningún chequeo especial en `moverElemento`.
- Verificado con `esbuild --bundle` (`MemoriaBuilder.jsx` solo, y el bundle
  completo de `App.jsx`) sin errores; servidores de dev (3021/5193)
  respondiendo tras el cambio. **No probado en navegador** -- mismo motivo
  que el resto de este módulo (`No uses playwright`, instrucción vigente
  de esta sesión); en particular, confirmar a mano que el grip realmente
  agarra el drag y no bloquea sin querer el scroll horizontal de la tabla
  en pantallas angostas es lo primero que vale la pena revisar.

**Encabezado de columna: el tipo/fórmula pasó a un panel flotante tras un
engranaje (2026-09-09, mismo día)** -- el usuario mandó una captura real:
una columna Calculada mostraba nombre + tipo + los 3 selects de fórmula +
el checkbox "Mostrar total" todos apilados dentro del mismo `<th>`, y la
fila de encabezados quedaba enorme y amontonada (visible incluso
superpuesta con el panel de "Título" de arriba en la captura). Se le
presentaron la opción y confirmó implementarla: `EncabezadoColumna` ahora
solo muestra, siempre visible, el nombre editable + una etiqueta chica con
el tipo actual (`labelTipoColumna()`) + el grip de arrastre + un ícono
`Settings` (nuevo, `lucide-react`) + el botón de quitar -- una sola línea
sin importar el tipo de columna. El selector de tipo, la config de fórmula
(si es Calculada) y "Mostrar total" se movieron a un panel flotante que
abre/cierra el engranaje, con el MISMO patrón que ya usa
`components/ui/Combobox.jsx` (`position:relative` en el contenedor +
`position:absolute` en el panel + un listener de `mousedown` en
`document` que lo cierra al hacer clic afuera, vía un `containerRef`).
Verificado con `esbuild --bundle` (`MemoriaBuilder.jsx` + bundle completo
de `App.jsx`) sin errores; servidores de dev respondiendo. **No probado en
navegador** -- mismo motivo de siempre; el posicionamiento del panel
flotante en la ÚLTIMA columna de una tabla ancha con scroll horizontal es
lo más probable de necesitar un ajuste visual real (podría salirse del
`overflow-x:auto` de `.card` hacia la derecha) una vez se pueda ver correr.

## Campos de dinero: nunca `<input type="number">` (2026-09-09)

El usuario reportó que al pegar un número con puntos (formato colombiano de
miles, ej. "1.500.000") en "Valor unitario" del Cuadro Comparativo, el campo
lo tomaba como decimal en vez de como el monto completo -- causa real: es un
`<input type="number">`, y ese tipo de input le da a `.` el significado de
separador DECIMAL del navegador, así que "1.500.000" (dos puntos) es un
valor inválido para el campo -- se trunca o queda vacío. `SolicitudForm.jsx`
ya había resuelto exactamente este problema para "Valor total (COP)" (texto
+ `inputMode="numeric"` + `.replace(/\D/g,'')` en el `onChange`) pero ese
patrón no se había generalizado a los otros 2 campos de dinero reales del
proyecto que seguían siendo `type="number"`.

- **`utils/solicitudes.js`** ganó 2 helpers nuevos junto a `formatCurrency`:
  `soloDigitos(valor)` (quita todo lo que no sea dígito -- aplicado al
  `onChange`, así da igual si el usuario pegó "1.500.000" o "1500000", las
  dos terminan guardadas como el mismo string de dígitos crudos) y
  `formatearMiles(valor)` (formatea esos dígitos con separador de miles
  vía `Intl.NumberFormat('es-CO')` -- aplicado al `value` que se MUESTRA en
  el input, nunca a lo que se guarda). Es el patrón inverso de
  `formatCurrency`: éste formatea para mostrar un total ya calculado (con
  símbolo `$`), los nuevos formatean/limpian un campo que el usuario está
  editando activamente.
- **`CuadroComparativoBuilder.jsx#"Valor unitario"`** -- el único campo de
  dinero real dentro de una tabla -- pasó de `type="number"` a
  `type="text" inputMode="numeric"`, `value={formatearMiles(...)}`,
  `onChange` guarda `soloDigitos(e.target.value)`. `updatePrecio` sigue
  guardando el mismo string de dígitos que antes (`item.precios` ya se leía
  con `Number(...)` en `calcularValorTotalItem`, sin cambios ahí).
- **`SolicitudesPage.jsx#"Valor mínimo"/"Valor máximo"`** (filtro avanzado,
  compara contra `solicitud.valorFinal` en memoria) -- mismo cambio. El
  filtro ya hacía `Number(filtroValorMin)`/`Number(filtroValorMax)`, sigue
  funcionando igual con el string de dígitos crudos.
- **`SolicitudForm.jsx#"Valor total (COP)"`** -- ya usaba `type="text"` +
  `.replace(/\D/g,'')` a mano (por eso NUNCA tuvo el bug del usuario), pero
  mostraba los dígitos crudos sin separador mientras se escribía (solo el
  preview de abajo con `formatCurrency` estaba formateado). Se migró a los
  2 helpers nuevos por consistencia -- ahora el campo en sí también se ve
  con puntos de miles mientras se escribe, no solo en el preview.
- **Deliberadamente NO tocados**: "Cantidad" (Cuadro Comparativo, admite
  decimales reales -- ej. `12.5` m³, no es dinero), los % de AIU/IVA (ídem,
  decimales legítimos), las columnas `ENTERO`/`FLOAT` de Memoria (de
  propósito general, no necesariamente dinero), y "Etapa" de Frente (un
  entero de configuración, no un monto) -- todos siguen siendo
  `type="number"` a propósito, ahí SÍ es correcto que `.` signifique
  decimal.

Verificado con `esbuild --bundle` en los 3 archivos tocados
(`CuadroComparativoBuilder.jsx`, `SolicitudesPage.jsx`, `SolicitudForm.jsx`)
+ el bundle completo de `App.jsx`, sin errores; servidores de dev
respondiendo (cambio 100% frontend, sin tocar backend). **No probado en
navegador**.

## Acción "Anular" (2026-09-09)

Pedido explícito del usuario: "no quiero eliminarlas directamente... la
idea es que tenga la posibilidad de anularse... que la persona de Controles
que registra el N° Adpro tenga ese botón, que anulará esa solicitud por
completo". Confirmado con el usuario antes de implementar (2 decisiones que
cambian el diseño): (1) se puede anular desde **cualquier estado ya
enviado, EXCEPTO Completada** -- deshacer un contrato ya cerrado quedó
fuera de alcance a propósito, es un caso más delicado; (2) el motivo es
**obligatorio**, mismo criterio que Devolver/Revisar.

- **`solicitud.autorizacion.js`** -- nueva acción `ANULAR` en
  `ESTADOS_ORIGEN`/`ESTADO_DESTINO` (destino: nuevo estado terminal
  `ANULADA`, columna `estado` es `STRING(40)` libre, sin migración
  necesaria). El origen (`ESTADOS_NO_TERMINALES`) se calcula tomando TODOS
  los estados que ya aparecían en `ESTADOS_ORIGEN` de las demás acciones
  menos `BORRADOR` -- así una acción/estado nuevo que se agregue más
  adelante entra automáticamente al alcance de ANULAR sin tener que
  mantener una segunda lista a mano. `ACCION_SLOT_FIJO.ANULAR =
  'controles_adpro'` -- el mismo slot de `AprobadorFrente` que ya usan
  `REGISTRAR_ADPRO`/`PASAR_CONTROLES` (personas específicas O roles
  específicos, por frente+categoría) -- es literalmente "la persona de
  Controles que registra el N° Adpro" del pedido, pero SIN la restricción
  extra de estado que sí tiene `REGISTRAR_ADPRO` (ese exige además estar en
  `EN_CONTROLES`; `ANULAR` no, a propósito). `getAccionesDisponibles()` ya
  es genérico (itera `ESTADOS_ORIGEN`), así que `ANULAR` aparece solo en
  `accionesDisponibles` sin tocar esa función.
- **`solicitud.estado.js`** -- motivo obligatorio (mismo bloque que
  Devolver/Revisar), se guarda en `nota_contratacion` (mismo campo
  compartido que ya usan esas dos acciones -- último valor gana, se
  muestra siempre en el detalle sin importar el estado actual, ver el bug
  ya corregido de esa condición). Notificación al solicitante
  (`notificacion.service.js#notificarAnulada`, mismo patrón que
  `notificarDevuelta`).
- **`solicitud.service.js#crearOtrosi`** -- dos ajustes para que un otrosí
  ANULADA no quede "atascado": el candado de "ya existe un otrosí activo"
  pasó de `estado !== 'COMPLETADA'` a `!['COMPLETADA','ANULADA'].includes(...)`
  (un otrosí anulado es un caso muerto, igual que uno completado, no debe
  bloquear crear uno nuevo), y `pickMostRecentOtrosi` ahora recibe
  explícitamente solo los otrosís `COMPLETADA` como candidatos a línea base
  (antes de que existiera `ANULADA`, todo lo que llegaba hasta ese punto ya
  era `COMPLETADA` por construcción -- el candado de arriba lo garantizaba
  -- así que no hacía falta filtrar; ahora sí, un ANULADA podría colarse
  como "más reciente" por número de otrosí sin este filtro).
  `OtrosiForm.jsx` (frontend) replica el mismo criterio del candado
  (`!['COMPLETADA','ANULADA'].includes`) para no bloquear a mano un padre
  que el backend sí aceptaría.
- **Frontend** -- `SolicitudActions.jsx` gana el botón "Anular solicitud"
  (`variant="danger"`), gateado con `puede('ANULAR')` a secas (sin repetir
  la lista de estados de origen -- `accionesDisponibles` ya viene filtrada
  desde el backend) + un modal con `<Textarea required>` para el motivo.
  `utils/solicitudes.js` ganó `ANULADA` en `ESTADO_LABELS`/
  `ESTADO_BADGE_VARIANT` (variant `danger`, mismo color que `DEVUELTA` --
  simplificación ya documentada, solo 5 variantes de `<Badge>` existen) y
  `ANULAR` en `ACCION_NOMBRES_CORTOS`/`ACCION_COLOR_VARIANT`/
  `ACCION_ESTADO_DESTINO`/`ACCION_LABELS` (los 4 mapas de acciones que ya
  existían, todos data-driven en el resto de la UI -- el filtro de estado
  de `SolicitudesPage.jsx` y el selector de `estado_destino` de
  `WorkflowDetallePage.jsx` recogen `ANULADA` solos, sin tocar esos
  archivos, porque ya iteran `Object.entries(ESTADO_LABELS)`).
- **`WorkflowDiagramaPage.jsx`** -- se agregó el nodo `ANULADA` con **una
  sola flecha representativa** desde `EN_CONTROLES` (el estado ligado al
  ejemplo concreto del pedido), en vez de las ~8 flechas reales que el
  motor de verdad acepta (`ESTADOS_NO_TERMINALES`) -- dibujar todas
  habría cruzado por encima del tronco principal y de la rama de
  excepción sin poder verificar a ojo que no quedaran amontonadas (sin
  navegador disponible esta sesión). Mismo espíritu que el conector
  punteado `BORRADOR→PENDIENTE_DIRECTOR_TECNICO` ya existente (representa
  un mecanismo más amplio sin dibujarlo completo) -- documentado así en el
  propio comentario del archivo para que quede claro que no es un olvido.
  `WorkflowsPage.jsx` actualizó su texto de "11 acciones" a "12 acciones".
- **Bug real encontrado de paso, sin relación con ANULAR** -- verificando
  el flujo completo (crear → enviar → anular → limpiar los datos de
  prueba) apareció un `SequelizeForeignKeyConstraintError` real al borrar
  una solicitud de prueba: `solicitud.service.js#remove()` ya destruía
  `HistorialSolicitud` a mano antes de borrar la `Solicitud` (porque esa FK
  tampoco tiene `onDelete: CASCADE` a nivel de base de datos), pero
  **nunca hacía lo mismo con `CronogramaContrato`/`CuadroComparativo`/
  `Memoria`** -- sus FK hacia `solicitudes` tienen exactamente el mismo
  hueco (sus propios hijos sí cascadean bien -- fases/actividades,
  proveedores/items, columnas/filas -- el hueco es solo ese primer nivel).
  Efecto real: el botón "Eliminar" (ADMIN-only) tiraba un 500 crudo de
  Postgres para CUALQUIER `CONTRATO`/`ORDEN_SERVICIO` que ya tuviera
  alguno de los tres guardado -- que hoy es prácticamente cualquiera que
  haya llegado a `ENVIADA`, desde que el cuadro comparativo se volvió
  obligatorio para enviar (ver la sección de esa fecha más arriba). Se
  corrigió agregando los mismos 3 `destroy()` (con el mismo `allIds` que ya
  cubre los otrosís) antes de `solicitud.destroy()`, dentro de la misma
  transacción.
- **Verificado contra la base real de dev**, de punta a punta, con
  fixtures `ZTEST_*` (creados y borrados en la misma sesión): un usuario
  `CONTROLES` de prueba (NO ADMIN) con `coordinador_controles_id` apuntando
  a él (atajo de "snapshot" que ya usa `solicitud.autorizacion.js`, sin
  tocar `AprobadorFrente` real) -- confirmado que `GET` le devuelve
  `accionesDisponibles: ['ANULAR']` (y NO `APROBAR_DIRECTOR`/`DEVOLVER`,
  que exigen otro slot) sobre una solicitud en `ENVIADA`; `ANULAR` sin nota
  → 400; `ANULAR` con nota → éxito, `estado: 'ANULADA'`,
  `notaContratacion` con el motivo, `accionesDisponibles: []` (confirma que
  es terminal); el historial quedó con la entrada `ANULAR` y el usuario
  correcto; la notificación `"Solicitud anulada"` se creó para el
  solicitante. También se confirmó el fix del bug de `remove()`: la misma
  solicitud de prueba (con su Cuadro Comparativo ya guardado) se borró sin
  error tras el fix (`DELETE` → 204), donde antes tiraba 500.
  `node --check`/`esbuild --bundle` (bundle completo de `App.jsx`) sin
  errores en todos los archivos nuevos/tocados. **No probado en
  navegador** -- en particular, el nodo/flecha nuevos de
  `WorkflowDiagramaPage.jsx` son lo que más vale la pena confirmar a ojo
  (posición, que no se crucen con las líneas de `DEVUELTA`/`EN_REVISION`
  cercanas).

## Acción "Comentar" — Controles (Proyección) (2026-09-21)

Pedido explícito: en el estado `EN_PROYECCION_CONTROLES` ("En Proyección de
Controles", Directa) Controles debe poder dejar un comentario/observación
sobre la proyección (p. ej. el motivo de un retraso) **sin** aprobarla ni
devolverla. No cambia el estado de la solicitud: solo agrega una fila al
historial con la `nota`. Es la acción `COMENTAR`, backend en paralelo
(Jim) expone su `accionesDisponibles` solo en `EN_PROYECCION_CONTROLES`.

- **Frontend** -- `SolicitudActions.jsx` gana el botón "Agregar comentario"
  (`variant="secondary"`, no es aprobar ni devolver), gateado con
  `estado === 'EN_PROYECCION_CONTROLES' && puede('COMENTAR')` (mismo
  patrón `can*` que `canAprobarProyeccion`/`canDevolverProyeccion` --
  `accionesDisponibles` ya viene filtrada desde el backend, no se recalcula
  ningún permiso acá) + incluido en `hasAnyAction`. No reemplaza los botones
  de Aprobar/Devolver proyección, se muestra JUNTO a ellos. Modal con un
  `<Field label="Comentario" required>` (mismo `Field`/`Textarea` que ya
  usan devolver/anular); en `confirmarModal`: si la `nota` está vacía →
  error "El comentario es obligatorio", si no `ejecutar('COMENTAR', { nota })`.
  `utils/solicitudes.js` ganó `COMENTAR` en `ACCION_ESTADO_DESTINO`
  (destino: `EN_PROYECCION_CONTROLES` -- la acción no cambia el estado, el
  historial muestra el mismo estado como resultante) /
  `ACCION_NOMBRES_CORTOS` ('Agregar comentario') / `ACCION_COLOR_VARIANT`
  ('neutral') / `ACCION_LABELS` ('Comentario de Controles — Proyección',
  texto en pasado, es lo que se muestra ya ejecutado en el Historial de
  Seguimiento).
- **[Backend]** `solicitud.autorizacion.js` -- acción `COMENTAR` en los 3
  mapas, siguiendo el patrón de `ANULAR`/`APROBAR_PROYECCION`:
  `ESTADOS_ORIGEN_SIN_ANULAR.COMENTAR = ['EN_PROYECCION_CONTROLES']`
  (origen acotado a ese estado a propósito, no generalizable);
  `ESTADO_DESTINO.COMENTAR = 'EN_PROYECCION_CONTROLES'` (el MISMO estado:
  el comentario no mueve la solicitud); `ACCION_SLOT_FIJO.COMENTAR =
  'controles_proyeccion'` -- el mismo slot que ya usa `APROBAR_PROYECCION`
  (quien puede aprobar la proyección es quien puede comentar). No se tocó
  `getAccionesDisponibles` ni `ESTADOS_NO_TERMINALES` (ya son genéricos),
  ni `SNAPSHOT_POR_SLOT` (el snapshot `responsable_controles_proyeccion_id`
  ya existía); en Directa `resolverSlot` cae al fallback `ACCION_SLOT_FIJO`
  porque `COMENTAR` no está en `ACCION_SLOT_FIJO_DIRECTA`.
- **[Backend]** `solicitud.estado.js` -- `nota` obligatoria para `COMENTAR`
  (mismo bloque de validación que DEVOLVER/REVISAR/ANULAR, mensaje "Se
  requiere un comentario"). A propósito NO se escribe
  `updateData.nota_contratacion` (ese campo se renderiza como banner de
  error en el detalle -- DEVOLVER/REVISAR/ANULAR lo usan porque señalan un
  problema; un comentario de seguimiento es contexto). El
  `HistorialSolicitud.create(...)` ya corre sin condicionar por acción, así
  que la entrada `COMENTAR` con su `nota` queda en el historial
  automáticamente (`estado_resultante` = `EN_PROYECCION_CONTROLES`).
  Notificación al solicitante (`notificacion.service.js#notificarComentario`,
  mismo patrón que `notificarDevuelta`), best-effort fuera de la
  transacción.
- **Deliberadamente NO tocados**: `HistorialSeguimiento.jsx`/
  `EstadoTimeline.jsx` -- ya son genéricos (leen `ACCION_LABELS`/
  `entry.nota` sin lista fija de acciones; el stepper ignora una acción que
  no es `completionAction` de ningún paso, que es justo lo que queremos: el
  comentario no debe marcar el paso "Controles — Proyección" como
  completado).

## Doble paso del Residente Administrativo en Directa (2026-09-21)

Pedido explícito del usuario: agregar un nuevo punto de aprobación en el
flujo de categoría DIRECTA, a cargo del Residente Administrativo -- el MISMO
rol/slot que ya participaba más adelante en ese mismo flujo ('Residente
Administrativo — Adpro', acción REGISTRAR_ADPRO): 2 participaciones del mismo
responsable. El paso nuevo va ENTRE el Director de Obra (APROBAR_DIRECTOR) y
Controles — Proyección (EN_PROYECCION_CONTROLES). Estado nuevo
`PENDIENTE_RESIDENTE_ADMINISTRATIVO`, acción nueva
`APROBAR_RESIDENTE_ADMINISTRATIVO`; en ese punto el Residente Administrativo
puede (a) aprobar normal, para que la solicitud siga a Controles-Proyección,
y (b) editar la solicitud completa si hace falta corregir algo. Código
completo revisado por Ryan (sin hallazgos bloqueantes); esta feature no tenía
ninguna entrada en CLAUDE.md y ese era el gap señalado en la review.

- **Migración `20260921200000-actualizar-desvio-directa-residente-admin.js`**
  -- el desvío ya sembrado de `APROBAR_DIRECTOR`/`condicion_categoria:
  'DIRECTA'` (que antes mandaba directo a `EN_PROYECCION_CONTROLES`, sembrado
  en 20260918130300) ahora manda a `PENDIENTE_RESIDENTE_ADMINISTRATIVO`. Es
  un `bulkUpdate` sobre la fila ya existente -- ni insert nuevo ni mecanismo
  distinto: la maquinaria de desvíos condicionales de siempre resuelve el
  nuevo destino (ver solicitud.estado.js#desvios) sin tocar ese archivo.
  `down` revierte a `EN_PROYECCION_CONTROLES`.
- **Migración `20260921200100-add-fecha-aprobacion-residente-admin.js` +
  `solicitud.model.js`** -- columna nueva
  `fecha_aprobacion_residente_administrativo` (`DATE`, nullable), mismo
  patrón que `fecha_aprobacion_controles_proyeccion` (agregada en
  20260918130100): se estampa sola por el backend al ejecutarse la acción,
  no es un campo manual.
- **`solicitud.autorizacion.js`** -- la acción nueva en los 3 mapas de
  siempre: `ESTADOS_ORIGEN_SIN_ANULAR.APROBAR_RESIDENTE_ADMINISTRATIVO =
  ['PENDIENTE_RESIDENTE_ADMINISTRATIVO']`, `ESTADO_DESTINO.
  APROBAR_RESIDENTE_ADMINISTRATIVO = 'EN_PROYECCION_CONTROLES'` (la
  solicitud continúa el flujo Directa hacia proyección) y `ACCION_SLOT_FIJO.
  APROBAR_RESIDENTE_ADMINISTRATIVO = 'residente_administrativo'` -- el mismo
  slot que ya usan REGISTRAR_ADPRO/ANULAR en Directa. Deliberadamente NO se
  agregó a `ACCION_SLOT_FIJO_DIRECTA` a propósito: el Directa cae al
  fallback `ACCION_SLOT_FIJO` sin lógica especial (mismo criterio que
  APROBAR_PROYECCION), y `SNAPSHOT_POR_SLOT` ya tenía
  `residente_administrativo -> responsable_residente_administrativo_id`, así
  que un usuario asignado pasa directo sin volver a consultar AprobadorFrente.
  Nueva función `puedeEditarSolicitud(solicitud, usuario)` que factoriza la
  lógica de permiso de edición que antes vivía inline en
  `solicitud.service.js#update()` -- esto NO cambió ningún comportamiento
  existente (BORRADOR/DEVUELTA/EN_REVISION + admin + gestión se conservan,
  incluidos los dos errores históricos de update()), solo la hizo reusable.
  Que el Residente Administrativo pueda editar en el estado nuevo es una
  consecuencia AUTOMÁTICA de un mecanismo previo: `puedeGestionarSolicitud`
  ya recorría TODOS_LOS_SLOTS incluyendo `residente_administrativo`, así que
  el slot calza sin tener que agregar ese estado a ninguna lista.
- **`solicitud.service.js`** -- `update()` usa `puedeEditarSolicitud` (única
  fuente de verdad; el 409 y el 403 se conservan literal) y `getById()`
  expone el flag `puedeEditar` al frontend -- misma filosofía que
  `accionesDisponibles`: el backend calcula, el frontend solo lee.
  `responsable_residente_administrativo_id` se resuelve en
  `resolverResponsablesFrente` (config del slot Residente Administrativo),
  igual que los demás snapshots.
- **`solicitud.estado.js`** -- estampa
  `fecha_aprobacion_residente_administrativo` (mismo patrón que las demás
  fechas de aprobación) y corrige la notificación de `APROBAR_DIRECTOR`: en
  Directa pasa de avisar al responsable de Contratos-Trámite (con el texto
  genérico "lista para tramitar en contratación", que no aplica al paso
  siguiente) a avisar al Residente Administrativo vía la función nueva
  `notificarPendienteResidenteAdministrativo`. INDIRECTA no cambia (sigue
  avisando a Contratos-Trámite).
- **`notificacion.service.js`** -- dos funciones nuevas:
  `notificarPendienteResidenteAdministrativo` (le avisa al solicitante que su
  solicitud fue aprobada por el Director de Obra y al Residente
  Administrativo asignado que tiene un paso pendiente de su aprobación) y
  `notificarAprobadaResidenteAdministrativo` (le avisa a Controles-Proyección
  cuando el Residente Administrativo aprueba). Best-effort fuera de la
  transacción, igual que todas las demás.
- **`dashboard.service.js`** -- `ACCION_PRINCIPAL_POR_ESTADO` gana
  `PENDIENTE_RESIDENTE_ADMINISTRATIVO: 'APROBAR_RESIDENTE_ADMINISTRATIVO'`:
  el contador de "pendientes por mi aprobación" arma sus estados con
  `Object.keys(ACCION_PRINCIPAL_POR_ESTADO)` y `CAMPOS_PENDIENTES` ya incluía
  `responsable_residente_administrativo_id`, así el paso queda cubierto para
  el Residente Administrativo sin más cambios. Deliberadamente NO entra a
  `ESTADOS_ACTIVOS` -- es un paso intermedio del flujo Directa, igual que
  PENDIENTE_DIRECTOR_TECNICO.
- **`workflow.schema.js`** -- `ACCIONES`/`ESTADOS` ampliados con la acción y
  el estado nuevos (para que un desvío sobre cualquiera de los dos no falle
  la validación Zod). De paso se agregó `COMENTAR` a `ACCIONES`, que faltaba
  de la feature anterior -- sin relación directa con este cambio, pero en el
  mismo archivo y con la misma lógica (solo valida que las referencias
  existan).
- **Frontend** -- `utils/solicitudes.js` ganó `PENDIENTE_RESIDENTE_ADMINISTRATIVO`
  en `ESTADO_LABELS` ('Pendiente Residente Administrativo') /
  `ESTADO_BADGE_VARIANT` (`info`) y `APROBAR_RESIDENTE_ADMINISTRATIVO` en los
  4 mapas de acciones data-driven de siempre (`ACCION_ESTADO_DESTINO` ->
  `EN_PROYECCION_CONTROLES` / `ACCION_NOMBRES_CORTOS` 'Aprobar (Residente
  Administrativo)' / `ACCION_COLOR_VARIANT` 'success' / `ACCION_LABELS`
  'Aprobada por Residente Administrativo'). `EstadoTimeline.jsx` insertó el
  paso "Residente Administrativo — Revisión" en `WORKFLOW_STEPS_DIRECTA`
  (entre "Director de Obra" y "Controles — Proyección"), con el MISMO ícono
  (`UserCheck`) que el paso "Residente Administrativo — Adpro" más abajo:
  misma persona, 2 participaciones del mismo rol. `SolicitudActions.jsx` gana
  el botón "Aprobar" (`canAprobarResidenteAdministrativo`, gateado con
  `estado === 'PENDIENTE_RESIDENTE_ADMINISTRATIVO' && puede('APROBAR_RESIDENTE_
  ADMINISTRATIVO')`, incluido en `hasAnyAction`, con su modal de confirmación)
  y `canEdit` ahora lee `solicitud.puedeEditar` del backend en vez de
  recalcular dueño/admin en el frontend (sin duplicar esa regla).
  `SolicitudDetallePage.jsx` muestra "Fecha aprobación Residente
  Administrativo" (mismo patrón que las demás fechas de aprobación).
  `WorkflowDiagramaPage.jsx`/`WorkflowsPage.jsx` -- el canvas admin de
  Workflows tenía nodos/aristas HARDCODEADOS (no genéricos): se agregó el
  nodo `PENDIENTE_RESIDENTE_ADMINISTRATIVO` y su arista de aprobación
  (`ENVIADA -> PENDIENTE_RESIDENTE_ADMINISTRATIVO` con píldora
  APROBAR_DIRECTOR, y `PENDIENTE_RESIDENTE_ADMINISTRATIVO ->
  EN_PROYECCION_CONTROLES` --o EN_TRAMITE_CONTRATOS si la proyección está
  desactivada-- con píldora APROBAR_RESIDENTE_ADMINISTRATIVO), ambos
  calculados EN VIVO contra el desvío real (`residenteActivo`, mismo criterio
  que `proyeccionActiva`: si el negocio desactiva el desvío, el nodo deja de
  dibujarse solo). `WorkflowsPage.jsx` actualizó el texto del encabezado para
  mencionar la acción nueva como solo-Directa.
- **Deliberadamente NO tocado**: NO hay acción `DEVOLVER` desde
  `PENDIENTE_RESIDENTE_ADMINISTRATIVO` -- ni en el motor
  (`ESTADOS_ORIGEN_SIN_ANULAR.DEVOLVER` no lo incluye como origen) ni en el
  canvas (ninguna arista `e-devolver-*` sale de ese nodo). Decisión
  explícita, no un olvido: el pedido original era solo "aprobar + editar", y
  la edición (vía `puedeEditar`) reemplaza a la necesidad de devolver en ese
  punto.

## Bug real: crash al sincronizar SharePoint en Terceros (2026-09-21)

El usuario reportó "Cannot read properties of undefined (reading ok)" al
sincronizar SharePoint en el módulo Terceros. Causa: `tercero.sync.js` (puerto
literal de una ruta Next.js) respondía `res.json({ok,...})` /
`res.status(500).json({ok:false,...})` directo, sin el wrapper `{data}` de
`ok()` que el resto del backend usa -- el frontend (`api/client.js`) lee
`body?.data` del body (`return { data: body?.data, meta: body?.meta }`), así
que `res.data` llegaba `undefined` y `TercerosPage.jsx#handleSync` tronaba
leyendo `res.data.ok`. Pasaba en el caso de ÉXITO (los terceros sí se
guardaban; reventaba al mostrar el resultado).

- **`tercero.sync.js#sincronizar`** -- ahora responde con el contrato
  estándar: `ok(res, { message, ...stats })` en éxito y `throw new
  ApiError(500, String(error))` en el catch (conserva el detalle específico
  del error de Microsoft Graph/Azure -- `Token error`/`Site lookup error`/
  `Drive error`/`Download error` -- que llega íntegro al frontend). El resto
  del archivo (token -> site -> drive -> content, parse del Excel, upsert a
  mano sin pisar `nit`) no cambió.
- **`TercerosPage.jsx#handleSync`** -- ya no lee `res.data.ok`; mostrar el
  `res.data.message` sin excepción ES éxito, y el error se muestra desde
  `err.message` del catch.
- Sin commit -- todo en el working tree.

## 5 tipos de contrato nuevos para Directa (2026-09-21)

Pedido explícito del usuario: hasta ahora la categoría Directa (Contrato/
Orden de Servicio) solo tenía un `tipoContrato` posible, "Todo Costo"
(`TODO_COSTO`). Se agregan 5 más: Suministro de Materiales, Mano de obra,
Servicios, Transporte, Alquiler. **Indirecta no cambia** (sigue con
`OTROS_SERVICIOS`/`DISENO`, sin tocar).

Códigos elegidos: `SUMINISTRO_MATERIALES`, `MANO_OBRA`, `SERVICIOS`,
`TRANSPORTE`, `ALQUILER` (+ `TODO_COSTO` ya existente).

- **Bug real encontrado antes de tocar código**: `solicitud.model.js` tenía
  `tipo_contrato: DataTypes.STRING(20)` (columna `varchar(20)`) --
  `SUMINISTRO_MATERIALES` mide 21 caracteres, se pasaba del límite (un
  insert/update con ese valor habría tirado `value too long for type
  character varying(20)` en Postgres). Se detectó y corrigió ANTES de que
  el resto del código empezara a usar ese valor.
- **Migración** `20260921190000-ampliar-tipo-contrato.js` --
  `queryInterface.changeColumn('solicitudes', 'tipo_contrato', { type:
  Sequelize.STRING(40) })` (mismo estilo que `20260918150000-add-codigo-a-roles.js`),
  `down` revierte a `STRING(20)`. `solicitud.model.js` actualizado a
  `DataTypes.STRING(40)` para que coincida. Corrida y verificada contra la
  BD real (`information_schema`: `solicitudes.tipo_contrato` ahora
  `character varying(40)`).
- **`solicitud.estado.js`** -- `TIPOS_CONTRATO_VALIDOS_POR_CATEGORIA.DIRECTA`
  pasa de `['TODO_COSTO']` a `['TODO_COSTO', 'SUMINISTRO_MATERIALES',
  'MANO_OBRA', 'SERVICIOS', 'TRANSPORTE', 'ALQUILER']` -- es el único
  whitelist de validación de este campo en el backend (el schema Zod es
  `z.string()` genérico). `INDIRECTA` sin tocar.
- **`documento.js`** -- su copia duplicada de `TIPO_CONTRATO_LABELS` (backend
  no importa código del frontend, ver comentario del propio archivo) ganó
  los 5 labels en español, para que el Word generado muestre el nombre
  correcto en vez de caer al fallback `'—'`.
- **Frontend** -- `utils/solicitudes.js#TIPO_CONTRATO_LABELS` ganó los mismos
  5 labels. `SolicitudForm.jsx#tiposContratoDisponibles` para `DIRECTA` pasa
  a los 6 códigos (antes solo `TODO_COSTO`); el radio de "Tipo de contrato"
  ya iteraba ese array genéricamente, sin más cambios de lógica -- se agregó
  `flexWrap: 'wrap'` a su contenedor porque 6 opciones podían desbordar el
  ancho sin envolver. La validación de PreBEP obligatorio sigue acotada a
  `tipoContrato === 'DISENO'` (exclusivo de Indirecta), no afecta a los
  tipos nuevos.
- Sin commit -- todo el trabajo (migración incluida, ya corrida contra la
  BD local) quedó en el working tree, a la espera de autorización explícita
  del usuario para comitear.

## DEVOLVER en Directa vuelve al paso 3, no al paso 1 (2026-09-22)

Pedido explícito del usuario: en el flujo DIRECTA (paso1=Solicitud Enviada,
paso2=Director de Obra / `ENVIADA`, paso3=Residente Administrativo — Revisión
/ `PENDIENTE_RESIDENTE_ADMINISTRATIVO`, paso4=Controles — Proyección /
`EN_PROYECCION_CONTROLES`, paso5=Trámite Contratos / `EN_TRAMITE_CONTRATOS`),
DEVOLVER desde el paso 4 o 5 ya no debe reiniciar todo el flujo mandando la
solicitud a `DEVUELTA`: vuelve al paso 3, donde el Residente Administrativo
revisa/corrige y reencamina (patrón "devolver una etapa atrás" que el flujo
Indirecta ya usaba con `PENDIENTE_DIRECTOR_TECNICO`). DEVOLVER desde el paso
2 o desde el propio paso 3 sigue yendo a `DEVUELTA` (paso 1) como siempre.
INDIRECTA no cambia: nunca tiene el paso 3, y su único origen de DEVOLVER
compartido con Directa (`EN_TRAMITE_CONTRATOS`) sigue yendo siempre a
`DEVUELTA`. De paso se cerró un gap real: antes el Residente Administrativo
ni siquiera PODÍA devolver desde su propio paso; ahora sí.

- **`solicitud.autorizacion.js`** -- `DEVOLVER` gana un origen nuevo en
  `ESTADOS_ORIGEN_SIN_ANULAR`: `PENDIENTE_RESIDENTE_ADMINISTRATIVO` (era el
  único origen de esa lista que no estaba contemplado; el Residente
  Administrativo no podía devolver desde su propio paso). `SLOT_POR_ESTADO_
  ORIGEN` gana `PENDIENTE_RESIDENTE_ADMINISTRATIVO: 'residente_administrativo'`
  (devolver desde el paso 3 lo decide el propio Residente Administrativo).
  Nuevo mapa `ESTADO_DESTINO_DEVOLVER_DIRECTA` (`EN_PROYECCION_CONTROLES` y
  `EN_TRAMITE_CONTRATOS` -> `'PENDIENTE_RESIDENTE_ADMINISTRATIVO'`) y nueva
  función `resolverDestinoDevolver(estadoActual, categoria)` -- exportada, la
  usa `solicitud.estado.js`. Solo aplica si `categoria === 'DIRECTA'`; en
  cualquier otro caso devuelve `'DEVUELTA'` (el `ESTADO_DESTINO.DEVOLVER` del
  mapa general queda intacto como fallback/default).
- **`solicitud.estado.js`** -- en el bloque de construcción del update:
  `if (accion === 'DEVOLVER') estadoDestino = resolverDestinoDevolver(
  solicitud.estado, solicitud.categoria)` ANTES del loop de desvíos
  condicionales (con lo cual el destino del paso 4/5 en Directa queda fijado
  a `PENDIENTE_RESIDENTE_ADMINISTRATIVO`). Nueva rama de notificación en el
  bloque `DEVOLVER`: si `estadoDestino === 'PENDIENTE_RESIDENTE_
  ADMINISTRATIVO'` notifica al Residente Administrativo (snapshot
  `responsable_residente_administrativo_id`) vía
  `notificarDevueltaAResidenteAdministrativo`; si el destino real es
  `DEVUELTA` (paso 2/3 y toda INDIRECTA) sigue notificando al solicitante con
  `notificarDevuelta` como siempre.
- **`notificacion.service.js`** -- función nueva
  `notificarDevueltaAResidenteAdministrativo`: texto propio ("Solicitud
  devuelta a tu revisión / debes revisarla y reencaminarla como Residente
  Administrativo"), NO reusa `notificarDevuelta`, que está escrita para el
  solicitante que recibe para correcciones. Best-effort fuera de la
  transacción, igual que todas las demás.
- **`SolicitudActions.jsx`** -- botón "Devolver" NUEVO en el paso 3:
  `canDevolverResidenteAdministrativo = estado === 'PENDIENTE_RESIDENTE_
  ADMINISTRATIVO' && puede('DEVOLVER')` (no existía, ver el "Deliberadamente
  NO tocado" de la sección del Doble paso abajo), incluido en `hasAnyAction`
  con su modal de confirmación.
- **`EstadoTimeline.jsx`** -- segundo corte de ciclo SÓLO para Directa: al
  devolver desde el paso 4/5 el destino es `PENDIENTE_RESIDENTE_ADMINISTRATIVO`
  (no `DEVUELTA`), así que las acciones de completado de los pasos desde
  "Residente Administrativo — Revisión" siguen en el historial del MISMO
  ciclo y el corte del `ENVIAR/REENVIAR` no las recorta. Se agrega un corte
  adicional (`lastDevolverResidenteIdx` sobre el último `DEVOLVER` con
  `estadoResultante === 'PENDIENTE_RESIDENTE_ADMINISTRATIVO'`,
  `RESIDENTE_ADMIN_REVISION_IDX = 2`) para que esos pasos no queden marcados
  como completados de la vuelta anterior.
- **`WorkflowDiagramaPage.jsx`** -- arista NUEVA `e-devolver-residente`
  (`PENDIENTE_RESIDENTE_ADMINISTRATIVO -> DEVUELTA`, dashed/danger) en el
  nodo del paso 3; las aristas `e-devolver-proyeccion` y
  `e-devolver-tramite` pasan a ser condicionales: cuando `residenteActivo`
  (el mismo flag en vivo que define si el nodo del paso 3 existe), su target
  es `PENDIENTE_RESIDENTE_ADMINISTRATIVO`; si el flag no aplica, siguen a
  `DEVUELTA`.
- **`HistorialSeguimiento.jsx`** -- el label de fila deja de ser el fijo
  `ACCION_LABELS.DEVOLVER` ('Devuelta al solicitante'): `accionLabel(entry)`
  devuelve 'Devuelta al Residente Administrativo' cuando la entrada es un
  `DEVOLVER` con `estadoResultante === 'PENDIENTE_RESIDENTE_ADMINISTRATIVO'`
  (mismo criterio que el `estadoDestino` de la fila: leer el valor real
  persistido en vez del mapa estático).
- **Supera la nota de "Doble paso del Residente Administrativo" (2026-09-21)**:
  esa sección declaraba "Deliberadamente NO tocado: no hay DEVOLVER desde
  PENDIENTE_RESIDENTE_ADMINISTRATIVO" como decisión explícita. Esta feature
  agrega exactamente eso (botón Devolver en el paso 3) y además redirige los
  DEVOLVER posteriores a ese mismo estado -- pedido explícito del usuario.
- **Limitación conocida del mecanismo de desvíos (a futuro, no un bug activo)**: el
  motor de desvíos condicionales (tabla `workflow_desvios`, modelo
  `WorkflowDesvio`) NO tiene columna de estado ORIGEN -- filtra/valida solo
  por `accion` + `activo` (+ `condicion_rol`/`condicion_categoria`, ambos
  opcionales y aplicables igual en todos los orígenes). Si en el futuro
  alguien configura un desvío para `DEVOLVER` desde `/configuracion/workflows`,
  ese desvío ganaría para TODOS los orígenes de esa categoría/rol y
  colapsaría la distinción nueva (paso2/3 -> DEVUELTA vs paso4/5 -> paso 3)
  a un mismo destino fijo. Hoy no hay ningún desvío sembrado para
  `DEVOLVER` (el único sembrado es `ENVIAR`/`condicion_categoria: INDIRECTA`
  -> `PENDIENTE_DIRECTOR_TECNICO`), así que no interfiere.
- Sin commit -- todo en el working tree, a la espera de autorización del
  usuario para comitear.

## Orden de Servicio = mismo formato que Contrato, solo en Directa (2026-09-09)

Pedido explícito del usuario: "en directos orden de servicio debe tener el
mismo formato que contrato, de momento debe ser exactamente igual". Antes
de implementar se confirmó con él exactamente hasta dónde llega "igual" --
`SolicitudForm.jsx` diferenciaba Contrato/Orden de Servicio en 3 puntos:
la sección "Tipo de contrato" (oculta en Orden de Servicio, con el valor
forzado por dentro sin selector), el título de la página, y el plazo
mínimo del cronograma (2 días hábiles vs 13). El usuario eligió
explícitamente: **todo igual EXCEPTO el plazo mínimo del cronograma**, que
sigue siendo una regla de negocio distinta (2 días para Orden de Servicio),
no un tema de formato. Acotado a **DIRECTA únicamente** ("en directos") --
Orden de Servicio en INDIRECTA no cambia en nada.

- **`SolicitudForm.jsx`** ganó `tratarComoContrato = tipoSolicitud ===
  'CONTRATO' || categoriaEfectiva === 'DIRECTA'` -- una sola bandera que
  reemplaza los `tipoSolicitud === 'CONTRATO'` sueltos que había en 4
  lugares: (1) el valor inicial de `form.tipoContrato` (antes se forzaba a
  `'TODO_COSTO'` sin selector para Orden de Servicio directa; ahora arranca
  vacío igual que Contrato, exigiendo el clic explícito en el radio -- con
  una sola opción disponible para Directa, `tiposContratoDisponibles` no
  cambió), (2) la validación `tipoContrato` obligatorio antes de enviar,
  (3) el título de la página ("Solicitud de Contrato" en vez de "Orden de
  Servicio" cuando aplica), y (4) la sección "Tipo de contrato" en sí
  (antes oculta por completo para Orden de Servicio) + su reflejo en el
  preview de "Formato de Solicitud" (antes mostraba "—" a propósito para
  Orden de Servicio, fiel a la imagen original -- ver la sección "Formato
  de Solicitud restaurado" más arriba; ese "—" ahora solo aplica a Orden de
  Servicio en INDIRECTA).
- **Deliberadamente NO tocado**: el prefijo `[ORDEN DE SERVICIO]`/`[CONTRATO]`
  del asunto auto-generado (`tipoSolicitud === 'ORDEN_SERVICIO' ? ...`) --
  a diferencia de las 4 cosas de arriba (secciones/validaciones/título del
  FORMULARIO), esto es contenido que describe el registro real (que sigue
  siendo `tipo: 'ORDEN_SERVICIO'` en la base, con su propio consecutivo
  `SOL-D-ODS-...` -- nada de esto cambia, solo el FORMULARIO se ve igual).
  Cambiarlo habría hecho que una Orden de Servicio real se autodescriba
  como "[CONTRATO]" en su propio asunto, un dato incorrecto, no un tema de
  formato visual. El plazo mínimo del cronograma (`minDays`) tampoco se
  tocó, por la exclusión explícita del usuario.
- **`solicitud.estado.js#ENVIAR`** -- el backend nunca exigía
  `tipoContrato` para `ORDEN_SERVICIO` (antes siempre llegaba con un valor
  ya forzado por el frontend, nunca hacía falta exigirlo del lado del
  servidor). Ahora que el frontend deja que Orden de Servicio en Directa
  arranque vacío y exige clic explícito, el backend tiene que cerrar el
  mismo hueco que ya cerraba para Contrato: `exigeTipoContrato = tipo ===
  'CONTRATO' || (tipo === 'ORDEN_SERVICIO' && categoria === 'DIRECTA')` --
  acotado a estos 2 tipos a propósito (nunca a `categoria === 'DIRECTA'`
  a secas, que habría alcanzado también a los Otrosí, que nunca tuvieron
  este campo). Orden de Servicio en INDIRECTA sigue sin exigirlo.
- **Verificado** contra la base real de dev con fixtures `ZTEST_*`
  (creados y borrados en la misma sesión): una Orden de Servicio DIRECTA
  sin `tipoContrato` → `ENVIAR` da 400 ("El campo tipoContrato es
  obligatorio..."); con `tipoContrato: 'TODO_COSTO'` → `ENVIAR` funciona;
  una Orden de Servicio INDIRECTA sin `tipoContrato` → `ENVIAR` sigue
  funcionando igual que siempre (sin exigirlo), confirmando que el cambio
  no afectó esa categoría. `node --check`/`esbuild --bundle` (bundle
  completo de `App.jsx`) sin errores. **No probado en navegador** -- vale
  la pena confirmar a ojo que el radio de "Tipo de contrato" en Orden de
  Servicio Directa se ve bien con una sola opción disponible.

## Cuadro Comparativo en Directa: un solo proveedor, el mismo Tercero contratista (2026-09-09)

Pedido explícito del usuario: "en el cuadro comparativo [de Directos] no se
puede agregar más de un proveedor, debe ser uno y debe ser el tercero que
se seleccione, la idea es que se coloque automáticamente". Tiene sentido de
negocio -- en contratación DIRECTA no hay competencia de cotizaciones que
comparar, ya se sabe con quién se contrata (el Tercero elegido en
"Contratista"); el Cuadro Comparativo en ese caso deja de ser una
comparación y pasa a ser solo el desglose de precios de ESE contratista.
Acotado a DIRECTA -- en INDIRECTA el Cuadro Comparativo sigue exactamente
igual (múltiples proveedores/cotizaciones, nombre editable a mano).

- **`CuadroComparativoBuilder.jsx`** ganó 2 props opcionales:
  `proveedorUnico` (bool) y `nombreProveedorUnico` (string) --
  `SolicitudForm.jsx` los pasa como `categoriaEfectiva === 'DIRECTA'` y
  `terceroSeleccionado?.razonSocial`. Un nuevo `useEffect` (solo activo
  cuando `proveedorUnico`) garantiza que `value.proveedores` tenga SIEMPRE
  exactamente 1 elemento con `nombre` sincronizado al Tercero elegido y
  `seleccionado: true` -- si ya había 0, 1 o varios (dato viejo, o un
  cambio de categoría), los colapsa a uno solo preservando `clientId`/AIU
  del que ya estuviera marcado `seleccionado` (o el primero) para no romper
  los precios ya cargados en `items.precios`. El usuario nunca edita el
  nombre a mano en este modo -- si cambia el contratista en el campo
  "Contratista" de arriba, el proveedor del cuadro se renombra solo.
- **Primer corte, corregido por el usuario**: la primera versión ocultaba
  toda la UI de comparación (tarjetas, pestañas, campo "Nombre del
  proveedor") en modo `proveedorUnico`, dejando solo la tabla de precios a
  secas. El usuario corrigió: **"la idea es que aparezca tal cual el
  nombre del proveedor así como si fuese comparación, lo único es que solo
  acepte uno solo, que no permita agregar más"** -- quiere la MISMA UI de
  siempre (tarjeta de comparación, pestañas, campo "Nombre del proveedor"
  visible), solo que bloqueada a un único proveedor. Corregido: en modo
  `proveedorUnico` se ven igual la tarjeta de "Comparación" (una sola, ya
  que solo hay un proveedor) y la pestaña -- lo único que desaparece es el
  botón **"Agregar proveedor"** (no se puede sumar un segundo) y el botón
  **"Quitar proveedor"** (siempre debe quedar exactamente uno). El campo
  "Nombre del proveedor" se sigue mostrando (mismo `<TextInput>` de
  siempre) pero queda `disabled` -- su valor lo sincroniza el `useEffect`
  con el Tercero elegido como contratista, nunca se escribe a mano. El
  radio "Proveedor seleccionado" se deja funcional tal cual, sin cambios
  (con uno solo, siempre queda marcado). `SolicitudDetallePage.jsx` (modo
  lectura) nunca tuvo botones de agregar/quitar/editar nombre en primer
  lugar (es de solo lectura) -- se revirtió el intento de ocultarle
  tarjetas/pestañas para Directa, esa vista ya mostraba lo correcto desde
  antes de este cambio.
- **Deliberadamente NO reforzado en el backend** (`cuadroComparativo.js`):
  es una regla de UI/UX, no de integridad de datos -- el contratista LEGAL
  real de una solicitud Directa ya está determinado por
  `solicitud.tercero_id` (una FK real), completamente independiente de qué
  texto tenga `nombre` en `cuadro_comparativo_proveedores` (que es solo
  desglose de precio informativo). Alguien saltándose el frontend con un
  POST a mano podría en teoría guardar más de un proveedor para una
  solicitud Directa, pero eso no cambiaría ni corrompería el contratista
  real del contrato -- se decidió no agregar esa validación server-side por
  ahora (distinto del caso de `tipoContrato`, donde un valor inválido SÍ
  terminaba impreso incorrectamente en el .docx generado).
- Verificado con `esbuild --bundle` en los 3 archivos tocados
  (`CuadroComparativoBuilder.jsx`, `SolicitudForm.jsx`,
  `SolicitudDetallePage.jsx`) + el bundle completo de `App.jsx`, sin
  errores; servidores de dev respondiendo (cambio 100% frontend, sin tocar
  backend). **No probado en navegador** -- en particular, vale la pena
  confirmar a ojo: que el `useEffect` de sincronización no genere un
  parpadeo visible al cambiar de contratista; que el campo "Nombre del
  proveedor" `disabled` se vea claramente distinto (no editable) sin
  parecer roto; y que el mensaje "Selecciona un contratista arriba para
  empezar a cotizar" se vea bien antes de elegir uno.

## "Pendiente por consumir" vs "Cantidades reales" -- 2 tablas, 2 cantidades independientes (2026-09-09)

Pedido explícito del usuario, evolucionado en varios mensajes seguidos el
mismo día -- mandó una foto de la hoja Excel real del cuadro comparativo
para señalar exactamente qué faltaba:

1. "Duplica la tabla esa llamada Items a comparar, la tabla de abajo... no
   tendrá el botón de agregar ítems, va a cargar los mismos que estén en
   la tabla de arriba" -- primer corte: una segunda copia de la tabla de
   ítems, mismo array `items`, sin botón de agregar, con solo Cantidad
   editable ("ya verás qué haremos" -- adelantó que venía más).
2. Mandó la foto real: la hoja tiene DOS bloques de cantidad separados --
   **"PENDIENTE POR CONSUMIR"** (lo que queda en inventario/presupuesto
   sin gastar) y **"CANTIDADES REALES"** (lo que de verdad se va a
   comprar/contratar) -- y pidió renombrar el encabezado de la tabla de
   ARRIBA de "Cantidades reales" a **"Pendiente por consumir"** ("es lo
   único que nos faltó de esa tabla... el pendiente por consumir es como
   lo que tenemos en inventario aún").
3. Corrección inmediata: **"la cantidad deben ser independiente"** -- las
   dos Cantidad NO pueden compartir el mismo campo (como había quedado en
   el punto 1); necesitan ser 2 datos separados que no se pisen entre sí.
4. **"El valor total que se calcula del proveedor debe ser con la cantidad
   de cantidades reales, que es la cantidad que se va a comprar o
   contratar"** -- el Valor Total (y por lo tanto el Costo Total del
   proveedor) se calcula con "Cantidades reales", NUNCA con "Pendiente por
   consumir" (que es solo informativo, de inventario).
5. Ajustes finales de layout: el botón "Agregar ítem" se movió debajo de
   la SEGUNDA tabla (antes estaba debajo de la primera) y el título "Ítems
   a comparar" quedó solo en la primera tabla (no repetido en la segunda).

**Resultado final**:

- **`cuadro_comparativo_items` ganó una columna real nueva,
  `cantidad_real`** (migración `20260831000524-add-cantidad-real-cuadro-item.js`,
  `DECIMAL(12,2)` default 0) -- `cantidad` sigue siendo "Pendiente por
  consumir", `cantidad_real` es "Cantidades reales". Son 2 columnas
  reales de la base, no un cálculo ni un alias -- se editan totalmente
  independiente una de la otra.
- **Migración de datos de respaldo**
  (`20260831000525-backfill-cantidad-real.js`) -- necesaria porque
  `calcularValorTotalItem()` pasó a usar `cantidadReal` en vez de
  `cantidad` para el cálculo de Valor Total: sin este backfill, cualquier
  Cuadro Comparativo YA guardado antes de esta migración habría quedado
  con `cantidad_real = 0` en todos sus ítems (el default de la columna
  nueva), mostrando su Costo Total en $0 de la nada -- un regreso
  silencioso real, no hipotético (afectaba literalmente a la solicitud de
  prueba visual `SOL-D-CONT-BK-KABO1-002`, id 38, que el usuario tenía
  abierta para revisar). El backfill copia `cantidad_real = cantidad`
  para cualquier fila que quedara en 0 -- el número que esa solicitud ya
  mostraba antes del cambio.
- **`CuadroComparativoBuilder.jsx`** -- la tabla de ARRIBA (con "Agregar
  ítem", ahora movido al final de la de ABAJO) dice **"Pendiente por
  consumir"** y edita `cantidad`; la tabla de ABAJO (sin título propio,
  sin botón de agregar) dice **"Cantidades reales"** y edita
  `cantidadReal` -- ambas EDITABLES, cada una en su propio campo, sin
  compartir estado. El resto de las celdas de la tabla de abajo (Código,
  Actividad, Alcance, Unidad, Observaciones) siguen siendo de solo
  lectura, reflejando lo que se cargó arriba. El botón de quitar fila se
  mantuvo en las dos tablas (borra de ambas por ser el mismo array
  `items`, solo cambian las Cantidad). `emptyItem()` ganó
  `cantidadReal: ''` junto a `cantidad`.
- **`calcularValorTotalItem(item, clientId)`** -- única fuente de verdad
  del Valor Total (usada en el editor Y en `SolicitudDetallePage.jsx`) --
  pasó de `Number(item.cantidad)` a `Number(item.cantidadReal)`. La
  columna "Cantidad" de la tabla de precios por proveedor (pestañas) 
  también pasó a mostrar `cantidadReal` en vez de `cantidad`, para que el
  número visible ahí coincida con el que realmente alimenta el cálculo de
  al lado.
- **`SolicitudDetallePage.jsx`** (modo lectura) ganó la misma segunda
  tabla de solo lectura ("Cantidades reales", mostrando `cantidadReal`)
  justo debajo de la tabla de ítems original (ahora "Pendiente por
  consumir", mostrando `cantidad`) -- antes solo existía una tabla
  combinada; con las 2 cantidades ahora siendo datos reales distintos,
  mostrar solo una hubiera escondido la otra mitad de la información real.
  Su tabla de precios por proveedor también pasó a mostrar `cantidadReal`.
- **`_enrichCuadroComparativo`** (`solicitud.service.js`) expone
  `cantidadReal` (camelCase) junto a `cantidad`; `cuadroComparativo.js`
  guarda `cantidad_real: Number(it.cantidadReal) || 0` en el upsert.
- Deliberadamente **sin abstraer las dos tablas en un componente
  compartido** -- ya tienen semántica y campos distintos ahora, así que
  quedan como 2 bloques JSX separados a propósito, no 1 candidato a
  parametrizar.
- **Verificado contra la base real de dev** con fixtures `ZTEST_*`
  (creados y borrados en la misma sesión): guardar un ítem con
  `cantidad: 100`/`cantidadReal: 18`/precio unitario `431221` -- el `GET`
  confirma las 2 columnas persistidas independientes
  (`cantidad: "100.00"`, `cantidadReal: "18.00"`), y `18 × 431.221 =
  7.761.978` coincide EXACTO con el ejemplo real de la hoja Excel que
  mandó el usuario. Migraciones 524/525 corridas; confirmado por query
  directa que los 3 ítems reales de la solicitud de prueba visual (id 38)
  quedaron con `cantidad_real` igual a su `cantidad` de antes (sin cambiar
  su Costo Total visible). `node --check`/`esbuild --bundle` (bundle
  completo de `App.jsx`) sin errores en todos los archivos tocados.
  **No probado en navegador**.

## "VR. Unit"/"V. Total" de Pendiente por consumir + "V. Total según PPTO" (2026-09-09)

Seguimiento del mismo día: el usuario preguntó cómo achicar la altura de
las 2 tablas apiladas (sugerencias: fusionarlas en una sola columna extra,
o hacer la segunda colapsable) pero antes de decidir avisó **"la cuestión
es que debo agregar tres columnas más, así que se verá muy compacto"** --
descartando la fusión en una sola tabla (con 3 columnas más el ancho por
columna hubiera quedado demasiado apretado) y confirmando explícitamente
**mantener las 2 tablas separadas, tal como estaban**, solo agregándoles
las columnas nuevas fieles a la hoja Excel real: **2 en "Pendiente por
consumir"** (VR. Unit + V. Total) y **1 en "Cantidades reales"** (V. Total
según PPTO).

- **Fórmulas** (confirmadas contra los números reales de la captura de
  Excel que compartió el usuario, no solo asumidas): "V. Total" (Pendiente)
  = `cantidad × valorUnitarioPendiente`; "V. Total según PPTO" (Cantidades
  reales) = `cantidadReal × valorUnitarioPendiente` -- **reutiliza el MISMO
  precio unitario presupuestado de Pendiente por consumir**, Cantidades
  reales NO tiene su propio precio unitario propio (fiel a la hoja real:
  esa sección solo trae CANT.TOTAL + VALOR TOTAL SEGÚN PPTO, sin columna de
  VR.UNIT propia). Es un cálculo totalmente aparte del "Valor Total" por
  proveedor (`calcularValorTotalItem`, que usa el precio de CADA
  proveedor) -- en la verificación de esta sesión ambos números coincidieron
  por casualidad porque el fixture de prueba usó el mismo valor numérico
  para las dos cosas, no porque compartan lógica.
- **`cuadro_comparativo_items` ganó `valor_unitario_pendiente`** (migración
  `20260831000526-add-valor-unitario-pendiente.js`, `DECIMAL(18,2)` --
  misma precisión que `Solicitud.valor_final`, la convención de este
  proyecto para columnas de dinero reales) -- es el ÚNICO precio nuevo que
  se guarda; "V. Total" y "V. Total según PPTO" NUNCA se guardan, se
  calculan (`calcularValorTotalPendiente`/`calcularValorTotalSegunPpto`,
  nuevas, exportadas junto a `calcularValorTotalItem` para que
  `SolicitudDetallePage.jsx` nunca pueda mostrar un número distinto).
- **`CuadroComparativoBuilder.jsx`** -- la tabla "Pendiente por consumir"
  (arriba) ganó 2 columnas: "VR. Unit" (editable, mismo patrón de dinero
  como texto que "Valor unitario" del proveedor --
  `soloDigitos`/`formatearMiles`, nunca `type="number"`) y "V. Total"
  (calculado, solo lectura). La tabla "Cantidades reales" (abajo) ganó 1
  columna: "V. Total según PPTO" (calculado, solo lectura). Los anchos de
  columna de las 2 tablas se recalcularon para acomodar las columnas
  nuevas sin comprometer Actividad/Alcance/Observaciones (las que más
  texto libre reciben).
- **`SolicitudDetallePage.jsx`** (modo lectura) ganó las mismas 3 columnas
  en sus 2 tablas de solo lectura, importando las nuevas funciones de
  cálculo tal cual.
- **Verificado contra la base real de dev** con fixtures `ZTEST_*`
  (creados y borrados en la misma sesión): `POST
  /solicitudes/:id/cuadro-comparativo` con `cantidad: 100`,
  `cantidadReal: 18`, `valorUnitarioPendiente: 431221` -- el `GET`
  confirma los 3 campos persistidos independientes y los cálculos
  correctos (`V. Total` = 43.122.100, `V. Total según PPTO` = 7.761.978).
- **Incidente real durante la verificación, sin relación con el cambio en
  sí**: el proceso de `nodemon` del backend dejó de reaccionar a cambios
  de archivo en algún punto de esta sesión (posiblemente tras uno de los
  reinicios anteriores) -- las ediciones de código seguían aplicándose en
  disco pero el servidor real seguía sirviendo una versión vieja,
  causando que la primera prueba de `valorUnitarioPendiente` devolviera
  `0` en vez del valor enviado (el código nuevo nunca llegó a correr).
  Diagnosticado confirmando que el PID del proceso escuchando en el
  puerto 3021 no cambiaba pese a tocar archivos vigilados; se reinició el
  backend a mano (`npm run dev` desde `backend/`) y se confirmó que
  `nodemon` volvía a reaccionar a cambios (nuevo PID en cada reinicio)
  antes de repetir la prueba, que sí pasó. Nada de código quedó afectado
  por esto -- fue puramente un problema del entorno de desarrollo de esta
  sesión.
  `node --check`/`esbuild --bundle` (bundle completo de `App.jsx`) sin
  errores en todos los archivos tocados. **No probado en navegador**.

## Sincronizado con la escala de neutrales con tinte de marca de la plantilla (2026-09-10)

El usuario preguntó "¿notas los cambios que hice en las reglas?" -- se
refería a cambios de diseño que hizo el mismo día en el repo compartido
`Plantilla-Arquitectura-AED` (fuera de esta sesión/proyecto). El checkout
del submódulo `plantilla-arquitectura` acá estaba apuntado a un commit
viejo, así que no se habían notado hasta hacer `git fetch` a pedido del
usuario.

- **Qué cambió en la plantilla**: la escala de "neutrales con tinte de
  marca" (Bg/Surface/Sunken/Hover/Hover Strong/Border/Border Strong, todos
  `color-mix()` del primario en vez de hex fijo) pasó por **4 rondas de
  calibración el mismo día** -- terminó en Bg 8%/Surface 5%/Sunken 12%/
  Hover 20%/Hover Strong 26%/Border 18%/Border Strong 30% (documentado con
  el razonamiento completo en `DESIGN.md` de la plantilla).
- **Gap real encontrado**: `frontend/src/tokens.css` de Solicitudes NUNCA
  había adoptado ESTA escala en absoluto -- seguía con hex planos sin
  ningún tinte (`--color-bg: #f7f8fa`, `--color-surface: #ffffff`, etc.),
  ni siquiera la primera versión con tinte tibio. Se confirmó con el
  usuario (`AskUserQuestion`) y se actualizó el bloque completo de colores
  neutrales a `color-mix()`, agregando de paso `--color-surface-hover`/
  `--color-surface-hover-strong` (no existían en absoluto acá, sin uso
  todavía en ningún `.module.css` -- puramente aditivo, sin riesgo de
  romper nada existente).
- **`DESIGN.md`/`.impeccable/design.json` de la raíz del proyecto** (las
  copias literales de la plantilla, ver la sección de Sistema de Diseño
  más arriba) también estaban desactualizadas -- se reemplazaron
  completas por la versión actual de la plantilla (`cp`, no un patch
  parcial, para no arrastrar una mezcla de versiones).
- **Incidente real encontrado al sincronizar el submódulo**: `git pull`
  reveló que el checkout del submódulo en Solicitudes tenía **4 commits
  LOCALES con los mismos mensajes exactos** que los 4 commits nuevos del
  remoto compartido -- evidencia de que alguna sesión anterior había hecho
  estos mismos cambios de diseño directo en el checkout de Solicitudes sin
  sincronizar con el repo compartido, mientras (probablemente) otra sesión
  en otro proyecto de la familia aed hacía el mismo trabajo y sí lo
  empujaba al remoto. Se resolvió con un merge (`git pull`), confirmado
  SIN conflictos y con contenido final IDÉNTICO a `origin/master` (`git
  diff origin/master HEAD` vacío en `tokens.css`/`DESIGN.md`) -- las dos
  historias divergentes convergían al mismo texto, así que el merge no
  duplicó ni corrompió nada, solo dejó un commit de merge de más en el
  historial local de la plantilla.
- **Pendiente, no hecho todavía a propósito**: el merge de la plantilla
  (`9985fbd`) y el puntero nuevo del submódulo en Solicitudes son cambios
  LOCALES sin commitear/pushear -- ninguno de los dos se subió al repo
  compartido ni se commiteó en Solicitudes, mismo criterio de siempre
  ("nunca commitear sin que el usuario lo pida explícitamente") y porque
  pushear a un repo compartido por varios proyectos de la familia aed es
  una acción que afecta estado compartido, no solo este proyecto.
- **Nueva regla de la plantilla, NO auditada todavía en Solicitudes**: "The
  Row Icon Actions Rule" (acciones de Editar/Activar-Inactivar por fila de
  tabla deben ser íconos vía `RowIconButtons.jsx`, nunca botones de texto)
  apareció en `design.json`/`DESIGN.md` como parte de esta sincronización
  -- a diferencia de "One-to-Many Selection"/"Pagination"/"Fluid Width"
  (ya auditadas y corregidas en Solicitudes en la pasada de cumplimiento
  del 2026-09-01, ver la sección de Sistema de Diseño más arriba), esta
  regla es nueva para este proyecto y no se auditó en esta pasada --
  alcance explícitamente NO pedido, solo se sincronizaron los archivos de
  reglas en sí.
- Sin verificación de bundle/servidor más allá de lo ya hecho -- este
  cambio es 100% tokens CSS + archivos de documentación de diseño, sin
  tocar ningún `.jsx`. Servidores de dev confirmados respondiendo después
  del cambio. **No probado en navegador**.

## "Progreso del flujo" ya no muestra Director Técnico en Directa (2026-09-10)

Pedido explícito del usuario: "quita en el progreso de flujo el de
Director Técnico, que no se vea en directos". `EstadoTimeline.jsx`
(`WORKFLOW_STEPS`) ya marcaba ese paso como `optional: true` -- se seguía
dibujando siempre, solo que "saltado" (ícono de guion, atenuado) cuando no
aplicaba. Eso era correcto para el caso real que motivó `optional` en su
momento (una solicitud INDIRECTA de un solicitante no-TECNICA, donde el
paso SÍ existe en el motor pero no se ejecuta esta vez) -- pero en DIRECTA
el paso no es "opcional que a veces se salta", directamente NO EXISTE en
ese flujo (mismo hecho de negocio ya usado para ocultar el nodo completo
en `WorkflowDiagramaPage.jsx`, ver la sección "Workflows separados por
categoría" más arriba). Mismo criterio aplicado acá: se quita del todo
para DIRECTA, no se atenúa.

- `EstadoTimeline.jsx` ganó la prop `categoria` -- si es `'DIRECTA'`,
  `WORKFLOW_STEPS` se filtra quitando el paso "Director Técnico" antes de
  renderizar; para INDIRECTA no cambia nada (sigue mostrándose "saltado"
  cuando no aplicó ese ciclo).
- `SolicitudDetallePage.jsx` (único call site real de `EstadoTimeline` --
  las otras 2 menciones en el código son solo comentarios) pasa
  `categoria={solicitud.categoria}`.
- Verificado con `esbuild --bundle` en los 2 archivos + el bundle completo
  de `App.jsx`, sin errores; servidores de dev respondiendo. **No probado
  en navegador**.

## "Generar Documento" en Directa produce la Orden de Compra/Servicios en PDF (2026-09-10)

El usuario compartió la plantilla real (una imagen de la hoja Excel de la
empresa, "ORDEN DE COMPRA/SERVICIOS") y pidió que el botón "Generar
Documento" la genere como PDF, **solo para Directa** ("de momento solo
aplícalo en directos") -- Indirecta sigue generando el .docx de siempre
(`documento.js`), sin ningún cambio. Antes de implementar se resolvieron 3
dudas puntuales de mapeo de datos con el usuario (`AskUserQuestion`): el
"OC #" (en blanco en la plantilla) es el consecutivo de la solicitud; el
"Código de obra" (un número que no existe en ningún campo real hoy) se
omite por ahora, solo se muestra el nombre del frente; y "Contacto o
Departamento" del Vendedor es el campo "Contacto" del Tercero
(`nombre_contacto`), no el representante legal.

- **Nueva dependencia**: `pdfkit` (^0.20.2) -- generación de PDF puro en
  Node, sin binarios nativos ni Chromium/LibreOffice de por medio (a
  diferencia de convertir un .docx a PDF, que sí los necesitaría). Primera
  dependencia nueva del BACKEND agregada en esta sesión -- `docx`/
  `exceljs` ya venían del scaffold original de la Fase 5, no se agregaron
  durante el trabajo de esta conversación.
- **`backend/src/modules/solicitud/ordenServicio.js`** (nuevo) --
  `generarOrdenServicio`: carga la solicitud con `solicitante`/`tercero`/
  `cronograma`/`cuadroComparativo` (proveedores+items, mismos aliases que
  `solicitud.service.js#cuadroComparativoInclude`), valida
  `categoria === 'DIRECTA'` (400 si no), mismo criterio de acceso que
  `documento.js` (SOLICITANTE/DIRECTOR_PROYECTO restringidos a dueño-o-
  frente), y arma el PDF a mano con `pdfkit` (no tiene tablas nativas --
  todo son rectángulos + texto posicionados con helpers `fillRect`/
  `strokeRect`/`cellText`).
  - **Los datos de ítems/proveedor/totales son LITERALMENTE los del
    Cuadro Comparativo** -- Directa ya fuerza un único proveedor (el mismo
    Tercero contratista, `proveedorUnico` en `CuadroComparativoBuilder.jsx`),
    así que esa única fila de `proveedores` trae el precio unitario y el
    AIU/IVA/% que van en el documento. Cantidad = `cantidad_real`
    ("Cantidades reales", la que se compra/contrata -- mismo criterio ya
    fijado para el Valor Total del Cuadro Comparativo). Las fórmulas
    (`calcularValorTotalItem`/`calcularTotalesProveedor`) están REPETIDAS a
    mano en este archivo (mismos resultados que
    `CuadroComparativoBuilder.jsx`, pero el backend no puede importar un
    `.jsx` del frontend) -- si esas fórmulas cambian, hay que actualizar
    los 2 lugares.
  - **Datos fijos de la empresa compradora** (Nombre/Nit/Dirección/Ciudad/
    Teléfono/Sitio Web + la dirección de radicación de facturas, distinta
    de la de la sede) -- constantes nuevas en este archivo, fieles a la
    plantilla real. El NIT lleva el dígito de verificación ("901307871-6")
    -- una constante DISTINTA de `CONTRATANTE_NIT` (sin guion) que ya usa
    el resto de la app, cada una fiel al formato que pide su propio
    documento.
  - **Vendedor** = el Tercero: `razon_social`/`nit`/`nombre_contacto`
    (confirmado con el usuario)/`direccion_representante`/`telefono_contacto`
    (o `telefono_representante` si no hay) -- Tercero no tiene un campo de
    ciudad, esa fila queda en "—" siempre (dato que no existe, no un bug).
  - **Plazo de entrega** = `cronograma.fecha_inicio`/`fecha_fin`
    formateadas en español ("DESDE EL 1 DE OCTUBRE DE 2026 HASTA EL...") --
    parseadas del string `'YYYY-MM-DD'` A MANO, nunca envueltas en
    `new Date()` (mismo gotcha de siempre: correría el día por zona
    horaria, ya documentado para `cronograma.js`/`importarDatosLegado.js`).
  - **Términos y condiciones**: 5 líneas fijas (boilerplate legal, fiel a
    la plantilla) + 4 dinámicas (Frente de trabajo, Quien solicita, Cargo,
    Correo electrónico -- del solicitante real).
  - **Salto de página**: si la tabla de ítems no cabe, agrega una página
    nueva y vuelve a dibujar el encabezado de la tabla ahí -- igual antes
    del bloque de Términos/firmas si tampoco caben.
  - **Bug real encontrado y corregido durante la verificación**: `cellText`
    solo trataba `null`/`undefined` como "sin dato" (mostraba "—") -- un
    string VACÍO (`''`, como el NIT real de un Tercero de prueba en la
    base de dev) pasaba de largo y quedaba en blanco en vez de mostrar el
    guion. Corregido tratando `''` igual que `null`/`undefined`.
- **`backend/src/assets/aed-logo.png`** (nuevo) -- copia del logo que ya
  vivía en `frontend/public/aed-logo.png`, para que el backend pueda
  embeberlo en el PDF sin depender de la carpeta del frontend en tiempo de
  ejecución (backend/frontend son paquetes separados aunque compartan
  contenedor en producción).
- **`solicitud.routes.js`** -- nueva ruta `POST /solicitudes/:id/orden-servicio`.
- **Frontend**: `api/solicitudes.js#descargarOrdenServicio` (mismo patrón
  `fetch`+blob+`<a download>` que `descargarDocumento`).
  `SolicitudDetallePage.jsx#handleDescargarDocumento` ahora decide a cuál
  de los 2 endpoints llamar según `solicitud.categoria`; el botón también
  cambia su texto a **"Generar orden de servicio"** en Directa (queda
  "Generar documento" en Indirecta) -- un botón con el mismo nombre
  generando 2 documentos completamente distintos según categoría hubiera
  sido confuso.
- **Nombre del archivo descargado** -- pedido explícito del usuario tras
  ver el primer PDF: `"Orden de Servicio {consecutivo}.pdf"` (con espacios,
  ej. `"Orden de Servicio SOL-D-CONT-BK-KABO1-002.pdf"`), no
  `"Orden-Servicio-{consecutivo}.pdf"` con guiones. El saneo del
  consecutivo (`safeConsecutivo`) ahora permite espacios además de
  alfanuméricos/guion/guion bajo.
- **Verificado de punta a punta contra la base real de dev** (fixture
  `ZTEST_*`, sin dejar dato sintético): se generó el PDF real de la
  solicitud de prueba visual (id 38, con Cuadro Comparativo de 3 ítems +
  1 proveedor) y **se renderizó a imagen con PyMuPDF** (instalado en el
  Python del sistema) para poder revisarlo a ojo de verdad -- algo que
  normalmente esta sesión no puede hacer (no hay navegador/visor de PDF),
  pero sí hay un intérprete de PDF real disponible localmente. Confirmado
  visualmente: layout limpio, las 9 secciones en el orden correcto,
  colores diferenciados por bloque, tildes/ñ renderizando bien (`Dirección`,
  `Teléfono`, `VERSIÓN` -- ver el punto de abajo sobre por qué esto no era
  obvio), montos y fórmulas exactos (ítem 18×$431.221=$7.761.978 del
  ejemplo real de la plantilla, y el ejemplo de prueba con Subtotal
  $36.500.000 + AIU/IVA = Total $45.449.800, cuadrando a mano). También se
  confirmó que pedir este documento para una solicitud INDIRECTA devuelve
  400 (el guard funciona).
  - **Falsa alarma real durante la verificación, documentada para no
    repetir la duda**: `pdftotext` (poppler) mostraba las tildes como
    "Direcci�n"/"VERSI�N" -- inspeccionando los bytes crudos del content
    stream del PDF se confirmó que el carácter SÍ está codificado
    correctamente en WinAnsiEncoding (ej. "ó" = byte `0xF3`, el valor
    correcto) -- es una limitación de extracción de `pdftotext` con las
    14 fuentes estándar sin `ToUnicode` CMap, NO un bug del PDF generado
    ni de cómo se ve en un visor real (confirmado renderizando a imagen).
    Si se vuelve a dudar de esto, renderizar a imagen (PyMuPDF) en vez de
    confiar en `pdftotext` para verificar texto con tildes.
  - `node --check` sin errores. **No probado en un visor de PDF real de
    usuario** (Adobe/Chrome/navegador) -- se verificó con PyMuPDF, que
    usa el mismo motor de renderizado (MuPDF) que la mayoría de visores
    reales, pero vale la pena que el usuario lo abra una vez con su propio
    lector para confirmar impresión/escala de página.

## Bug real: el navegador nunca podía leer el nombre real de los 3 archivos descargados (2026-09-10)

El usuario reportó que el PDF descargado seguía llamándose "Orden de
Servicio 43" (el id numérico, el nombre de RESPALDO) en vez del nombre
real con el consecutivo -- pese a que `curl` ya había confirmado el header
`Content-Disposition` correcto en la sesión anterior. La causa real: CORS.

- **`app.js#cors()`** no declaraba `exposedHeaders` -- por especificación,
  un `fetch()` cross-origin (frontend `:5193` hacia backend `:3021` en
  dev, o cualquier dominio distinto en producción) solo puede LEER desde
  JavaScript un puñado fijo de headers de respuesta ("CORS-safelisted
  response headers": Content-Type, Content-Length, unos pocos más) --
  `Content-Disposition` NO es uno de ellos, así que aunque el servidor lo
  mandara perfecto, `res.headers.get('Content-Disposition')` en
  `api/solicitudes.js#descargarArchivo` siempre devolvía `null` en un
  navegador real, cayendo siempre al nombre de respaldo genérico. `curl`
  no está sujeto a esta restricción (es exclusiva del modelo de seguridad
  del navegador), por eso la verificación de la sesión anterior -- 100%
  hecha con `curl` -- nunca lo detectó: veía el header perfecto porque
  nunca pasó por la restricción real que sí sufre un navegador.
- **Afecta a las 3 descargas autenticadas del proyecto**, no solo la Orden
  de Servicio nueva: `documento.js` (.docx), `cronogramaExport.js`
  (.xlsx), y `ordenServicio.js` (.pdf) -- las 3 usan el mismo
  `descargarArchivo()` para leer el nombre real. Antes de este fix, las 3
  descargaban siempre con su nombre de respaldo genérico
  (`Solicitud-{id}.docx`, `cronograma.xlsx`, `Orden de Servicio {id}.pdf`)
  en cualquier navegador real -- un hueco que existía desde la Fase 5
  (documento.js), nunca antes reportado porque los nombres de respaldo
  eran lo bastante razonables como para no llamar la atención hasta que
  el nuevo formato con espacios hizo el contraste obvio.
- **Fix de una sola línea**: `cors({ ..., exposedHeaders:
  ['Content-Disposition'] })` -- declara explícitamente que ese header sí
  puede leerse desde JS en una respuesta cross-origin. No hace falta tocar
  nada en `descargarArchivo()` ni en ninguno de los 3 generadores --
  el header ya viajaba bien, solo no estaba autorizado para que JS lo
  viera.
- **Verificado** con `curl -H "Origin: http://localhost:5193"` (replica el
  header real que manda un navegador) contra el endpoint real: la
  respuesta ahora incluye `Access-Control-Expose-Headers:
  Content-Disposition` junto al `Content-Disposition` real. `node --check`
  sin errores; servidores de dev respondiendo. **No probado en un
  navegador real** -- la próxima descarga del usuario debería confirmar el
  nombre correcto.

## Módulo pendiente de migrar

Ninguno del alcance original -- el corte de tráfico real (Fase 9, ver
arriba) es la única pieza operativa que falta, y es una decisión del
usuario, no una tarea de código.

**Módulos `upload`/`solicitud.importarHistorico` — Fase 8**

- `modules/upload/upload.config.js` -- constantes compartidas entre subida y
  descarga (puerto de las constantes de `api/upload/route.ts` +
  `api/files/[filename]/route.ts`): mismo blocklist de 11 extensiones
  ejecutables (no allowlist -- `.docx`/`.csv`/imágenes pasan igual),
  límite de 20MB, y el mapa de `Content-Type` por extensión para servir el
  archivo con el tipo correcto. `UPLOADS_DIR` default cambia de `public/uploads`
  (concepto de Next.js, no existe acá) a `uploads/` en la raíz de `backend/`
  -- ya listado en `backend/.gitignore`; en producción debe apuntar a un
  volumen montado persistente, igual que documentaba el original.
- `upload.controller.js` -- `multer` en memoria (`memoryStorage`, no
  `diskStorage`) para poder validar tamaño/extensión y construir el nombre
  seguro (`{timestamp}-{nombre-sanitizado}`) ANTES de escribir a disco,
  mismo orden que el original. `POST /upload` (cualquier autenticado) recibe
  multipart `file`, devuelve `{ url, filename, nombre, size }` -- `url` es
  `/files/{filename}`, nunca una ruta estática.
- `files.controller.js` -- `GET /files/:filename` (autenticado, nunca
  estático) con la misma defensa en profundidad contra path traversal que el
  original: rechaza cualquier `filename` con `/`, `\`, `\0`, o que no
  sobreviva `path.basename()` intacto, y revalida que la ruta resuelta siga
  dentro de `UPLOADS_DIR`.
- `solicitud.importarHistorico.js` -- puerto literal de
  `api/solicitudes/importar-historico/route.ts`: registra un contrato/otrosí
  anterior a este sistema, ya COMPLETADA (`importado_historico=true`), SIN
  pasar por `solicitud.estado.js` (no hay transición real de estado que
  ejecutar). Reutiliza `generarConsecutivo`, `pickMostRecentOtrosi`, y un
  helper nuevo extraído de `crearNormal` -- `resolverResponsablesFrente()`
  (mismo criterio: aprobador/responsables copiados de `AprobadorFrente`,
  con el mismo fallback a "cualquier DIRECTOR_PROYECTO asignado al frente" si
  el array está vacío) -- para que los otrosís reales creados después sobre
  un contrato importado queden asignados y notifiquen a alguien, igual que
  uno nativo. `valorEnLetras` SIEMPRE lo calcula el frontend y viaja en el
  body (mismo criterio que `crearOtrosi`/`SolicitudForm.jsx` -- no existe un
  puerto de `numeroALetras` en el backend, es deliberado). Verificado con
  `curl`: importar un otrosí histórico SOBRE otro ya completado no lo
  bloquea el candado de "ya existe un otrosí activo" -- es correcto, no un
  bug: todo otrosí histórico nace COMPLETADA, así que nunca cuenta como
  "activo" para ese candado (a diferencia de uno real, que pasa por
  ENVIADA/etc. antes de completarse) -- se pueden encadenar varios otrosís
  históricos libremente para reconstruir el timeline completo de un
  contrato antiguo.
- **`archivosAnexos` (CREACION_MINUTA) NO se tocó en esta fase**: se
  verificó contra el original (`solicitudActions.tsx`) que esa función
  SIEMPRE fueron enlaces externos pegados a mano (`{url, nombre}`,
  SharePoint/Drive/Dropbox), nunca una subida real -- `SolicitudActions.jsx`
  (puerto de la Fase 4) ya es fiel a eso, no hacía falta ningún cambio acá.
  Los únicos 3 campos que SÍ eran subida real en el original
  (`archivoCuadroComparativo`, `archivoCotizacion`, `archivoPreBEP`, en
  `SolicitudForm.jsx`) son los que se conectaron a `POST /upload` en esta
  fase.
- **Frontend**: `components/ui/FileField.jsx` (nuevo, no viene en la
  plantilla) -- puerto del `FileField` interno de `solicitudForm.tsx`,
  usa el patrón render-prop de `<Field>` para label/error/helper pero el
  control es propio (botón "Seleccionar"/"Cambiar" sobre un input
  `type="file"` oculto, sube apenas se elige y guarda la URL devuelta).
  `api/upload.js#subirArchivo` hace su propio `fetch` con `FormData` en vez
  de pasar por `client.js` -- ese wrapper fuerza
  `Content-Type: application/json` en cualquier request con body, lo que
  rompe un multipart (el navegador necesita fijar el boundary él mismo),
  mismo motivo por el que `descargarArchivo` (Fase 5) ya hacía lo mismo.
  `HistoricoBadge.jsx` (puerto de `historicoBadge.tsx`) se muestra junto al
  `SolicitudBadge` en la lista, el detalle, y la lista de otrosís del
  detalle -- en los tres lugares donde el original lo mostraba.
  `EstadoTimeline.jsx` gana el mismo aviso ámbar "importado sin flujo de
  aprobación" del original en vez de la lista de historial cuando
  `importadoHistorico` es true (acá no había un stepper visual que
  reemplazar como en el original -- la lista de historial ya era la versión
  simplificada de esta migración desde la Fase 4 -- pero el aviso se
  mantuvo igual porque una sola entrada "IMPORTAR_HISTORICO" no comunica tan
  claro como el aviso que el registro nunca pasó por aprobaciones reales).
  `ImportarHistoricoPage.jsx` (ruta `/solicitudes/importar-historico`,
  protegida con `<ProtectedRoute permiso="crear_enviar_solicitudes">`) es un
  puerto directo de `importarHistoricoForm.tsx` -- mismo selector de
  modo CONTRATO/OTROSI, mismo buscador de contrato base para el modo OTROSI.
  Enlazada desde el paso 1 de `OtrosiForm.jsx` ("¿El contrato o el otrosí es
  anterior a este sistema? Impórtalo aquí →"), el único lugar donde el
  original enlazaba a esta pantalla -- no se inventó ningún otro punto de
  entrada nuevo.

**Módulo `dashboard` — Fase 7**

- `dashboard.service.js` -- puerto de `(app)/dashboard/page.tsx` (Server
  Component), NO de `api/dashboard/stats/route.ts`: ese endpoint existía en
  el original con lógica casi idéntica pero **nada en el frontend lo
  llamaba jamás** (confirmado por búsqueda en el código fuente) -- la página
  calculaba sus propios KPIs directo contra Prisma, duplicando la lógica del
  endpoint muerto. Acá sí hace falta un endpoint real (SPA, no SSR), así que
  `dashboard.service.js` es la única fuente de verdad, tomando `page.tsx`
  como la especificación real de lo que el usuario veía.
- **Corregido respecto al original** (mismo patrón que la corrección de
  visibilidad de `GET /solicitudes` en la Fase 4): `page.tsx` calculaba
  `userFrenteIds` (las asignaciones de frente del usuario) pero JAMÁS los
  usaba en el `where` de los KPIs -- código muerto real, el `baseWhere`
  terminaba siendo siempre `{ solicitanteId: userId }` para cualquiera sin
  rol de "ver todas". Efecto observable: un DIRECTOR_PROYECTO o un
  SOLICITANTE con un frente asignado veía menos "Total activas"/"En
  revisión"/"Completadas este mes" en el Dashboard que en `/solicitudes`
  para exactamente las mismas solicitudes. `dashboard.service.js#filtrarVisibles`
  aplica el mismo criterio ya establecido en
  `solicitud.service.js#list` (creador, aprobador, cualquiera de los 4
  responsables, o pertenece a un frente asignado) -- reexportado desde ahí
  como `usuarioTieneAlgunFrente` en vez de duplicar la query.
- `pendientesMiAprobacion` SÍ se portó literal (no es un caso de
  visibilidad general sino "cuántas solicitudes puede accionar alguien con
  este rol específico ahora mismo"): ADMIN cuenta todas las no-terminales,
  DIRECTOR_CONTROLES/CONTROLES/CONTRATOS cuentan por estado sin filtrar por
  usuario (cualquiera con ese rol puede actuar, mismo criterio ya
  documentado para `REGISTRAR_ADPRO`), DIRECTOR_PROYECTO solo cuenta las
  `ENVIADA` con `aprobador_id` = su propio id (no las de su frente en
  general), y SOLICITANTE se queda en 0 -- no tiene bandeja de aprobación.
- `GET /dashboard/recientes` (nuevo, no existía como endpoint propio en el
  original -- ahí `page.tsx` traía las 10 más recientes en la misma
  Server Component) -- mismo escopeo de visibilidad, resuelve los nombres
  de frente en una sola query batched por `frentes_ids` (igual que el
  original), devuelve `tipo` crudo (la traducción a label vive en
  `frontend/src/utils/solicitudes.js#TIPO_SOLICITUD_LABELS`, ya existente
  desde la Fase 4 -- no se dupli có un mapa de labels en el backend).
- **Frontend**: `DashboardPage.jsx` ocupa la ruta índice `/` (reemplaza el
  placeholder `InicioPage.jsx` de las Fases 0-6, que se eliminó) -- en el
  original no existía una página de aterrizaje separada de
  `(app)/dashboard/`, el login redirigía directo ahí, así que acá el
  Dashboard real ES la home tras iniciar sesión, igual que antes. El item
  "Dashboard" que vivía como `enDesarrollo: true` bajo la categoría
  Actividad del nav (Fases 0-6) se QUITÓ del todo en vez de apuntarlo a
  `/` -- ya no aplica como destino de nav lateral si es la misma home a la
  que se llega por defecto.

  **Gap real encontrado por el usuario (2026-09-01)**: quitar ese item dejó
  la app sin NINGÚN link de vuelta al dashboard -- `AppShell.jsx#.brand`
  (logo + "INDIRECTOS" en la esquina superior del sidebar) era un `<div>`
  plano, no un link. Se corrigió envolviéndolo en `<Link to="/">`. Este
  hallazgo se formalizó el mismo día como regla obligatoria en
  `plantilla-arquitectura` ("el logo del sidebar es un botón que lleva al
  inicio") -- se ajustó el hover/foco de `.brand` para calzar exacto con esa
  spec (fondo `--color-surface-sunken` en hover, no una opacidad, con el
  truco de `margin` negativo para no mover el logo de su posición visual).

  Los 4 KPIs (`StatCard`) y la tabla de
  recientes son un puerto directo del original -- sin gráficos (el
  original tampoco tenía ninguno en esta pantalla, así que no hizo falta
  instalar ApexCharts todavía; ver el comentario sobre esto en la sección
  de Actividad de la Fase 6 para el mismo razonamiento aplicado ahí).

  **Segundo gap encontrado por el usuario (2026-09-01) — items hermanos del
  nav marcados "activos" a la vez**: al entrar a "Nueva solicitud"
  (`/solicitudes/nueva`), el flyout mostraba TANTO "Nueva solicitud" COMO
  "Todas las solicitudes" resaltados como activos; mismo problema entre
  "Directorio" (`/terceros`) y "Especialidades"
  (`/terceros/especialidades`). Causa: `NavLink` de React Router matchea
  por PREFIJO por defecto (sin la prop `end`), así que cualquier item cuyo
  `to` sea prefijo literal de la ruta de otro queda encendido también.
  Arreglado agregando `end` al `<NavLink>` del flyout en
  `AppShell.jsx:215-234` (con un comentario inline explicando por qué). El
  botón de categoría de afuera (`activeGroupTitle`, `AppShell.jsx:129-131`)
  SÍ debe seguir matcheando por prefijo a propósito -- resalta la
  categoría completa (p. ej. "Solicitudes"), no un item hoja -- así que ese
  cálculo se dejó intacto, el fix fue solo en el `NavLink` de cada item del
  flyout.

**Combobox de contratista en `SolicitudForm.jsx` (2026-09-01)**

- Gap encontrado por el usuario: el selector de "Contratista" en el
  formulario de nueva solicitud/otrosí eran DOS controles separados -- un
  `<input>` de búsqueda de texto suelto (`terceroBusqueda`, filtraba en
  memoria) más un `<select>` aparte con ~390 `<option>` ya filtradas. Dos
  widgets para una sola decisión, y el `<select>` con cientos de opciones
  va en contra de la regla ya documentada en `ARQUITECTURA-FRONTEND.md`
  ("Combobox de búsqueda grande... nunca un `<select>` con miles de
  `<option>`").
- No existía un componente copiable para este patrón en
  `plantilla-arquitectura/componentes/ui/` (a diferencia de `Pagination`,
  `Checkbox`, `CheckboxGroup`, `CheckboxListSelect`, que sí se copiaron tal
  cual en el pase de reglas anterior) -- solo estaba documentado como
  patrón de texto. Se construyó desde cero
  `frontend/src/components/ui/Combobox.jsx` + `Combobox.module.css`:
  selección única, cerrado muestra la etiqueta de la opción elegida como un
  campo normal, al enfocarlo se limpia para escribir y filtra en memoria
  (sin debounce -- no hace falta, es filtrado local, no una llamada de
  red), elegir una opción (click) cierra la lista y dispara `onChange`,
  perder el foco sin elegir revierte el texto a la selección vigente sin
  borrarla. Estilo del `.input` calcado de `Field.module.css#.control`, y
  el panel flotante calcado del de `CheckboxListSelect`.
- `SolicitudForm.jsx`: se eliminó el estado `terceroBusqueda`, se
  simplificó el memo `terceroOpciones` a `{value, label}` (label incluye
  las especialidades del tercero cuando las tiene), y el JSX del picker de
  Contratista pasó a un solo `<Combobox options={terceroOpciones}
  value={form.terceroId} onChange={...} />`. Si en el futuro aparece OTRO
  selector grande en el proyecto (p. ej. un picker de usuarios/proyectos
  con cientos de filas), reutilizar este mismo `Combobox` en vez de
  reinventar el patrón de dos widgets.

**Módulo `notificacion` — Fase 6**

- `notificacion.model.js`/`notificacion.service.js` -- puerto literal de
  `src/lib/notifications.ts` (`crearNotificacion` + los 7 helpers
  `notificar*`) más el lado de lectura de `api/notificaciones/route.ts`
  (`listar`/`marcarLeida`/`marcarTodasLeidas`). Única mejora deliberada:
  `notificarAprobadaDirector` ahora SALTA la notificación al responsable de
  contratos cuando ese id es `null` en vez de intentar un `create()` con FK
  vacía -- el original mandaba `?? ""` y dejaba que Prisma fallara (atrapado
  por el try/catch del caller de todas formas, así que el efecto observable
  es idéntico: la notificación al solicitante SÍ se crea, la de contratos
  simplemente no existe si no hay responsable asignado).
- `notificacion.controller.js#stream`/`notificacion.routes.js` -- puerto de
  `api/notificaciones/stream/route.ts`: SSE con heartbeat `: ping` inicial,
  poll cada 10s, un `data:` solo cuando el conteo de no-leídas cambia. A
  diferencia del `ReadableStream` de Next.js, Express no cierra la conexión
  solo -- el `setInterval` se limpia a mano en `req.on('close', ...)`, si no
  el proceso acumula timers de clientes que ya se fueron.
- **Wiring real en `solicitud.estado.js`**: el bloque de notificaciones que
  en Fase 4 quedó como un TODO (comentado "se difiere a la Fase 6") ya está
  conectado -- las 7 llamadas a `notificacionService.notificar*` van
  DESPUÉS de la `sequelize.transaction()`, en su propio try/catch (best
  effort, un error acá nunca debe tumbar una transición de estado ya
  confirmada), puerto literal de las mismas condiciones por acción que el
  original (incluida la notificación a TODOS los usuarios con rol
  DIRECTOR_TECNICO cuando `ENVIAR` desvía a `PENDIENTE_DIRECTOR_TECNICO`).
- **Frontend**: `NotificacionesBell.jsx` (puerto de
  `notificacionesBell.tsx`, montado en `AppShell.jsx` junto a `<UserMenu>`)
  usa `new EventSource(url, { withCredentials: true })` con la URL absoluta
  de `API_BASE_URL` -- a diferencia del original (mismo origen que Next.js,
  `new EventSource("/api/...")` bastaba), acá backend/frontend son orígenes
  distintos y sin `withCredentials: true` la cookie de sesión httpOnly no
  viaja con la conexión SSE.

**Módulos `actividad`/`presence` — Fase 6**

- Split deliberado en dos módulos que no existía como tal en el original
  (ahí todo vivía en `api/presence/route.ts` + `api/actividad/*`, ya
  separados por archivo pero sin esa distinción conceptual): `modules/presence/`
  es el ÚNICO que ESCRIBE `actividades_usuario`/`sesiones_usuario`
  (`registrarActividad`/`gestionarSesion`, puerto literal de las funciones
  homónimas que vivían dentro de `api/presence/route.ts`) y el que actualiza
  `Usuario.ultima_actividad`/`presencia_estado` en cada heartbeat;
  `modules/actividad/` es puramente de LECTURA (`historial`/`sesiones`/
  `stats`/`export`, puerto de los 4 archivos en `api/actividad/`). Se separó
  así porque son consumidores distintos (cualquier autenticado hace POST a
  `/presence`; solo ADMIN lee `/actividad/*`), y evita que el módulo de
  lectura dependa del de escritura.
- `usuario.model.js` ganó dos columnas nuevas (`ultima_actividad`,
  `presencia_estado`) que existían en el `model User` original pero no se
  habían portado hasta ahora porque nada las usaba.
- `presence.service.js#fetchPresenceData` recalcula el estado EFECTIVO
  (`activo`/`ausente`/`desconectado`) comparando `ultima_actividad` contra
  el mismo umbral de 75s (`UMBRAL_EN_LINEA_MS`) que el original -- un cierre
  abrupto de pestaña (crash, pérdida de red) igual se detecta por ausencia
  de heartbeats, sin depender del `sendBeacon` final.
- **Bug encontrado en Fase 6, corregido al portar**: `actividad.service.js#stats`
  agrupa "sesiones por día" con SQL crudo (`DATE_TRUNC('day', inicio)::date`)
  -- el driver `pg` devuelve una columna `::date` como STRING `"YYYY-MM-DD"`,
  NO como objeto `Date` (a diferencia de una columna `DATE`/`TIMESTAMP` sin
  cast, que sí llega como `Date`). El primer intento hacía
  `d.dia.toISOString()` (puerto literal del `.toISOString()` que sí hacía
  falta con el `Date` que devolvía Prisma) y tiraba `TypeError: d.dia.toISOString
  is not a function` -- `GET /actividad/stats` devolvía 500. Encontrado con
  `curl` real, confirmado con un query directo (`typeof d.dia === 'string'`),
  corregido usando el string tal cual llega.
- `GET /presence` (snapshot admin, no-stream) incluye `frentes` por usuario
  vía `FrenteUsuario.findAll({include:[Frente]})` sin alias (mismo patrón ya
  usado en `solicitud.service.js#usuarioTieneAlgunFrente`); `GET
  /presence/stream` (SSE cada 5s, para el tablero en vivo) NO incluye
  frentes -- igual que el original, que solo los trae en el endpoint plano.
- **Quirk del original, no portado (código muerto)**: `api/presence/route.ts`
  tenía una rama `else if (estado === "activo") { registrarActividad(...,
  "active", ...) }` al final de una cadena `if/else if` cuyo primer `if` ya
  capturaba `estado === "activo"` -- esa rama era inalcanzable en el
  original (nunca se ejecutaba, el tipo de actividad `"active"`/"Activo de
  nuevo" nunca se registraba pese a estar definido en la UI). Se omitió acá
  por ser código muerto real, sin cambio de comportamiento observable.
- **Frontend**: `hooks/usePresence.js` (puerto de `usePresence.ts`, montado
  una vez en `AppShell.jsx`) manda el heartbeat a la URL absoluta del
  backend (mismo motivo que `NotificacionesBell`) -- `sendBeacon`/`fetch`
  con `credentials:'include'` siguen funcionando entre `localhost:3021` y
  `localhost:5193` en dev porque ambos son el mismo *site* (difieren solo en
  puerto) y la cookie de sesión usa `sameSite: 'lax'`, no `'strict'`.
  `features/actividad/ActividadPage.jsx` (ruta `/actividad`, protegida con
  `<ProtectedRoute soloAdmin>` en `App.jsx`, y el item del nav en
  `AppShell.jsx` ahora se filtra con `soloAdmin: true` para no mostrarlo a
  quien de todas formas sería redirigido) es un puerto de
  `(app)/configuracion/presencia/page.tsx` con una simplificación
  deliberada: en vez del modal de detalle por usuario del original (timeline
  + sesiones de ESE usuario en un popup), un clic en una fila de la pestaña
  Presencia salta a la pestaña Historial ya filtrada por ese usuario --
  reutiliza la misma tabla en vez de duplicar la vista en un modal nuevo
  (el `<Modal>` del proyecto se reserva para confirmaciones cortas de 1-2
  campos antes de una transición de estado de Solicitud, no para vistas de
  detalle de solo lectura). Los gráficos de "sesiones por día"/"horas
  pico"/"actividad por tipo" son barras CSS puras (mismo criterio que el
  original, que tampoco usaba una librería de charts para esta pantalla).
  `ARQUITECTURA-FRONTEND.md` exige ApexCharts como única librería de
  gráficos "para todo proyecto de la familia aed" sin acotarlo
  explícitamente a la pantalla de Dashboard -- la decisión de NO instalar
  ApexCharts acá es un juicio propio de esta migración (pantalla de
  monitoreo interno solo-ADMIN, 3 gráficos simples, sería la única
  dependencia de charts del proyecto hasta la Fase 7), no algo que el
  documento distinga explícitamente. Si el negocio prefiere consistencia
  estricta con la regla, migrar estos 3 gráficos a ApexCharts junto con el
  Dashboard de la Fase 7 es sencillo.

## Frontend (`frontend/src`)

React + Vite + JavaScript plano (sin TypeScript). Sin Tailwind — componentes
propios en `components/ui/` + CSS Modules, tokens de `tokens.css`. Ver
`plantilla-arquitectura/arquitectura/ARQUITECTURA-FRONTEND.md` para el detalle
completo (Field render-prop, SortHeader/useSortableTable obligatorios en toda
tabla, máximo 5 KPIs, etc.).

`components/layout/AppShell.jsx` — `NAV_GROUPS` tiene 3 categorías
(Solicitudes/Terceros/Actividad), todos los items en `enDesarrollo: true`
todavía — se van habilitando a rutas reales fase por fase.

`features/perfil/PerfilPage.jsx` — datos del usuario + vincular/desvincular
Microsoft (`ms_linked`/`ms_error` llegan como query params tras el callback de
`auth.azure.js`).

`features/configuracion/UsuarioFormPage.jsx` también edita
`funcionalidades_adicionales` por usuario (checkboxes desde
`GET /roles/funcionalidades-disponibles`) — esto se agregó durante la Fase 3
al notar que era la única forma de conceder `editar_terceros` a alguien que no
sea ADMIN; no estaba en el alcance original de la Fase 2 pero es del mismo
módulo.

`features/terceros/` (Fase 3) — `TercerosPage.jsx` (lista con búsqueda +
paginación de 20, igual que el original, dataset real ~390 filas; filas con
SAGRILAFT vencido/por vencer resaltadas), `NuevoTerceroPage.jsx` (puerto
directo del form original), `TerceroDetallePage.jsx` (3 secciones editables
por separado con su propio botón Guardar — contacto, debida diligencia,
especialidades — cada una con su propio permiso), `EspecialidadesPage.jsx`
(CRUD + import masivo por textarea en vez del parseo de Excel en el navegador
del original, mismo endpoint `POST /especialidades/import`).

`features/configuracion/` (Fase 2) — `AccesosLayout.jsx` es el wrapper
compartido (nav vertical, mismo patrón que cualquier detalle con Section
Navigation) que `UsuariosPage`/`UsuarioFormPage`/`RolesPage`/`ProyectosPage`/
`FrentesPage`/`FrenteDetallePage` envuelven cada uno por separado. Todas estas
rutas están además protegidas con `<ProtectedRoute soloAdmin>` en `App.jsx`
(no solo ocultas en el sidebar). `ProyectosPage`/`RolesPage` son edición
inline por fila (3 campos o checkboxes, no justifican una página aparte);
`UsuarioFormPage`/`FrenteDetallePage` sí son páginas dedicadas (`id === 'nueva'`
activa modo creación en `UsuarioFormPage`, siguiendo el patrón de la
plantilla). `FrenteDetallePage` usa `<select multiple>` (no checkboxes) para
los 5 campos de "array de usuario_id" (usuarios asignados + los 4 de
`AprobadorFrente`) — más compacto que una grilla de checkboxes con la lista
completa de usuarios repetida 5 veces. El engranaje de Accesos en el topbar de
`AppShell.jsx` solo se renderiza si `usuario.roles.includes('ADMIN')`.

`utils/permisos.js` — copia a mano de `backend/src/utils/permisos.js`
(`tienePermiso`, `FUNCIONALIDADES_POR_ROL`) para gating de UI — el frontend no
puede importar código del backend, mantener las dos en sync si cambian los
permisos base.

`/login-hero.jpg` en `frontend/public/` — foto real de personas firmando un
contrato en una oficina (fotógrafo Vitaly Gariev, Unsplash License, gratuita y
sin atribución obligatoria — mismo criterio que el resto de la familia aed, ver
la nota de fuentes de imagen en Cartera). Si más adelante aparece una foto del
dominio real de Baía Kristal (una obra/frente), reemplaza este archivo — nada
más cambia.

## Sistema de diseño

`DESIGN.md` (+ `.impeccable/design.json`) copiado tal cual de
`Plantilla-Arquitectura-AED` — mismo branding aed que el resto de la familia de
productos. Léelo antes de tocar cualquier archivo de UI.

**Pasada de cumplimiento de reglas nuevas (2026-09-01)** — la plantilla ganó 3
reglas obligatorias nuevas (`ARQUITECTURA-FRONTEND.md`) DESPUÉS de que varias
fases de esta migración ya estuvieran construidas; se auditó todo el frontend
contra las 3 y se corrigieron los gaps reales encontrados (dos de ellos eran,
literalmente, el motivo por el que esas reglas se agregaron a la plantilla):

- **Selección de uno a muchos, nunca `<select multiple>`**: se copiaron
  `components/ui/{Checkbox,CheckboxGroup,CheckboxListSelect}.jsx` tal cual de
  la plantilla. `RolesPage.jsx` (matriz de permisos) y `UsuarioFormPage.jsx`
  (roles + funcionalidades adicionales) pasaron del párrafo de checkboxes en
  flujo libre (`.checkboxGroup`/`.checkboxItem`, ya eliminadas de
  `Configuracion.module.css`) a `<CheckboxGroup>`. `FrenteDetallePage.jsx`
  (usuarios asignados + los 4 arrays de `AprobadorFrente`) pasó de 5
  `<select multiple>` nativos a `<CheckboxListSelect>` (con buscador, más
  apropiado que `CheckboxGroup` porque la lista de usuarios puede crecer).
- **Un solo componente de paginación**: se copió `components/ui/Pagination.jsx`
  tal cual. `TercerosPage.jsx` tenía un pager de botones numerados con
  elipsis (armado a mano, Fase 3) -- reemplazado por `<Pagination>`.
  `ActividadPage.jsx` (Fase 6) ya usaba el patrón simple "‹ Anterior" /
  "Siguiente ›" pero con CSS propio en vez del componente compartido --
  también migrado a `<Pagination>` en sus dos tablas paginadas (historial y
  sesiones).
- **Fluid Width Rule (ningún `.page`/`.card`/contenedor de tabla o formulario
  con `max-width` fijo)**: se quitó `maxWidth` de los wrappers de página de
  `DashboardPage`, `NuevoTerceroPage`, `TerceroDetallePage`,
  `ImportarHistoricoPage`, `OtrosiForm`, `SolicitudDetallePage`,
  `SolicitudForm`, y `PerfilPage.module.css` (este último es exactamente el
  bug real que la regla cita como ejemplo -- mismo nombre de pantalla, mismo
  tipo de error, valor de `max-width` distinto). Los `max-width` de
  `Terceros.module.css` (buscador), `NotificacionesBell.module.css`/
  `Modal.module.css` (panel flotante/diálogo), y `LoginPage.module.css`
  (columna del login split-screen) se dejaron tal cual -- son las
  excepciones legítimas que la regla misma documenta (contenido angosto por
  naturaleza, no un supuesto sobre el tamaño de pantalla). De paso, se
  corrigió `Configuracion.module.css#.row` (tenía `align-items: flex-end`,
  el otro bug real que cita la regla de Accesos -- el `stretch` por defecto
  es lo que mantiene los inputs alineados sin importar el texto de ayuda de
  cada campo) y `AccesosLayout.module.css#.navItemActive` (usaba un fill
  sólido de marca en vez del resaltado suave que documenta la plantilla).

Verificado con un bundle completo de `App.jsx` vía `esbuild` (sin errores) --
no se pudo probar visualmente porque el usuario revisa la UI directamente
(ver la instrucción de Fase 5 sobre no usar Playwright).

## Seed credentials (dev) — YA NO APLICAN tras la Fase 9

⚠ Esta sección describe el dataset de seed de las Fases 1-8, reemplazado por
datos reales de producción en la Fase 9
(`backend/scripts/importarDatosLegado.js`, corrido 2026-08-31). Los 8 emails
de abajo SÍ existen todavía en la base (son residuos reales del seed
original de producción, ver la sección Fase 9 arriba) pero con
`activo: false` -- ninguna de estas contraseñas funciona ya. Para probar
localmente después de la Fase 9, usa un usuario real (`@aed.com.co`) con su
contraseña real de producción, o pide al usuario que te dé una cuenta de
prueba puntual. Se deja el contenido original abajo solo como referencia
histórica de qué dataset sembraba `db:seed` antes del corte.

Sembradas por `db:seed` (admin + roles + `20260831000104-seed-demo-proyectos.js`
— mismo dataset que `solicitudes-indirectos/prisma/seed.ts`). Todos con
password `Abc123!` excepto admin:

- `admin@baiak.com` — ADMIN — password real actual: **`Admin123!`** (la
  temporal del seed, `CambiarEnPrimerLogin2026!`, ya se usó y cambió)
- `smercado@baiak.com` — SOLICITANTE (KALIZA 1, KALIZA 2)
- `crodriguez@baiak.com` — DIRECTOR_PROYECTO (aprobador de KALIZA 1-4)
- `vtorres@baiak.com` — DIRECTOR_PROYECTO (aprobador de KALA 1-4)
- `amorales@baiak.com` — CONTRATOS
- `ljimenez@baiak.com` — CONTROLES
- `msuarez@baiak.com` — DIRECTOR_CONTROLES
- `avargas@baiak.com` — SOLICITANTE (KALA 1, KALA 2)

## Migración de diseño a la identidad del HRMS (2026-10-09)

Objetivo (pedido del usuario: "una reforma drástica, exactamente igual"): que Solicitudes quede
visualmente idéntica al HRMS, copiando JSX/CSS del HRMS y adaptando solo textos y datos, por pasos y
usando HRMS y Cartera (ya migrada) como referencia. Esto reemplaza lo de la plantilla en cuanto a UI.

- **Paso 1 — base + login (hecho):** `tokens.css` copiado tal cual del HRMS (los nombres de token
  que usaba Solicitudes están todos definidos ahí; cambian los valores). `index.css` = el del HRMS +
  `#root{height:100%}` + las clases globales `.fieldMd`/`.fieldLg` (siguen aquí: se usan como string
  literal, no pueden vivir en un CSS module). Inter variable alojada (`@fontsource-variable/inter`,
  importada en `main.jsx`); se quitó Raleway/Google Fonts de `index.html`.
  `LoginPage.module.css` = el del HRMS + estilos del botón de Microsoft (`.divider`, `.sso`).
  `CambiarPasswordPage.jsx` copiada del HRMS (requisitos de contraseña en vivo, llama a
  `refrescarPerfil()` antes de navegar). `LoginPage.jsx` = el del HRMS con textos de Solicitudes y
  **se conserva el SSO de Azure AD** (`?error=` → mensajes, botón "Continuar con Microsoft"). Se
  conserva la foto propia `public/login-hero.jpg`.
  Verificado en navegador (escritorio y móvil 390 px, error de SSO, credenciales incorrectas,
  mostrar contraseña, pantalla de cambio de contraseña con sesión simulada) y el resto de la app
  (Inicio, Solicitudes, Terceros, Roles) renderiza sin errores con los tokens nuevos.
- **Paso 2 — menú lateral y barra superior (hecho):** `AppShell.module.css` y `UserMenu.module.css`
  copiados tal cual del HRMS (idénticos a los de Cartera). `AppShell.jsx`: etiqueta "Menú", entrada fija
  "Inicio", migas de pan (grupo > pantalla, derivadas de `NAV_GROUPS`; el detalle `/solicitudes/:id` →
  "Solicitudes > Detalle de la solicitud", `/configuracion/*` → "Configuración"), item activo por la
  ruta más específica (`encontrarItemActivo`: "Todas las solicitudes" y "Nueva solicitud" ya no se
  encienden a la vez) y divisor antes del menú de usuario. Se conservan `NAV_GROUPS` con permisos
  (`navModulos.jsx`), el engranaje de Configuración y la presencia. `UserMenu.jsx` con flecha y "Mi perfil"
  para todos. `NotificacionesBell` rediseñada con el CSS de la campana del HRMS (contador, "Marcar todas
  como leídas", pestañas Todas/Sin leer, icono por tipo según el título, hora relativa, punto de "sin leer",
  estado "Estás al día") y SIN tocar su lógica (SSE en vivo, marcar leída y navegar).
- **Paso 3 — componentes base (hecho):** `Button`, `Badge`, `BackLink`, `Checkbox`, `CheckboxGroup`,
  `CheckboxListSelect`, `Pagination`, `RowIconButtons`, `SortHeader` (JSX + CSS) y `InfoTooltip` (nuevo)
  copiados tal cual del HRMS (en varios solo cambiaban comentarios; `Button`, `RowIconButtons` y
  `CheckboxListSelect` ganan el estilo nuevo). `Modal` pasa al del HRMS (`<dialog>` nativo, prop `open`
  en vez de `isOpen`, pie `footer`): su único uso, `SolicitudActions.jsx`, ahora lleva Cancelar/Confirmar
  en el `footer`. `Field` = el del HRMS (inputs de 44 px, `#fff`, borde fuerte, radio `md`) + el `Textarea`
  que crece solo y no se redimensiona (pedido del usuario, 2026-09-09), ajustado a las medidas nuevas
  (`textarea.control` con `padding: 11px 14px` y `.growWrap` con el mismo padding/interlineado en el
  `::after`): es lo ÚNICO que difiere del `Field` del HRMS, conservarlo si se vuelve a sincronizar.
  `Modal.module.css` añade `display:flex; gap` al cuerpo (el reset global deja los `<p>` sin margen).
  `Combobox` y `FileField` (solo de Solicitudes) se alinearon a las mismas medidas del control.
  Verificado en navegador con una página de prueba temporal (borrada): variantes de botón y badge,
  campos, error, select, combobox, textarea que crece de 74 a 222 px sin scroll ni resize, diálogo con
  pie y cierre con Escape, paginación e iconos de fila; y un barrido de 13 pantallas sin errores.
- **Inicio — reforma completa (hecho):** no solo estilo: la pantalla pasó de 4 contadores + una tabla a un
  panel de situación y de atención. Backend nuevo `GET /dashboard/resumen?categoria=DIRECTA|INDIRECTA`
  (`dashboard.service.js#resumen`, mismo criterio de visibilidad que `/solicitudes` y la MISMA
  `puedeEjecutarAccion` que decide los botones del detalle): KPIs con contexto, solicitudes por etapa,
  completadas por mes (6), en flujo por tipo, "Requiere tu atención" (solicitudes concretas, incluidos
  otrosís, donde el usuario puede actuar, las más antiguas primero, con cuántos días llevan y el valor),
  "Tus solicitudes por corregir" (propias DEVUELTA/EN_REVISION con un extracto de la nota) y las 8 más
  recientes. Los endpoints viejos `/dashboard/stats` y `/recientes` siguen existiendo. Frontend: selector
  Todas/Directas/Indirectas (solo si el usuario ve ambas categorías), botón "Nueva solicitud" según
  permiso, 5 KPIs (`StatTile` con línea de contexto), gráficos con ApexCharts (copiados del HRMS:
  `ChartCard`, `CategoryBarChart`, `DonutChart`, `OrdinalBarChart`, `palette`), tabla de recientes y
  esqueleto de carga. **Cambios de definición a tener presentes:** "Solicitudes en el flujo" ahora SÍ cuenta
  los pasos intermedios (Director Técnico / Residente Administrativo) que el KPI viejo dejaba fuera;
  "Por corregir" = DEVUELTA + EN_REVISION (el KPI viejo decía "En revisión / devueltas" pero solo contaba
  EN_REVISION); "Pendientes de mi aprobación" ahora sale de la misma lista de atención. Para un ADMIN la
  lista de atención muestra todo lo que está en el flujo (puede actuar sobre cualquier solicitud). Los
  accesos rápidos del Inicio anterior se retiraron (el menú lateral ya cubre eso).
- **Paso 4a, Configuración → Usuarios (hecho):** `AccesosLayout.jsx` ahora agrupa el menú (Accesos: Usuarios/Roles;
  Flujo: Workflows; Estructura: Proyectos/Frentes) con icono + texto de ayuda, filtrado por permiso/`soloAdmin`.
  `UsuariosPage.jsx`: tarjetas (Cuentas/Activas/Inactivas/Sin primer ingreso/Con Microsoft), filtros con etiqueta,
  acciones masivas (generar contraseñas temporales con CSV, activar, inactivar) y tabla con avatar.
  `UsuarioFormPage.jsx`: banner de detalle al editar, secciones Cuenta / Roles y acceso (chips con los permisos
  efectivos) / Cuenta de Microsoft / Contraseña con "Generar contraseña aleatoria". Backend nuevo:
  `POST /usuarios/masivo` (máx. 50 ids, nunca toca la cuenta propia) y `POST /usuarios/:id/generar-password`
  (`generateRandomPassword` en `utils/passwordRules.js`); las contraseñas generadas se muestran UNA sola vez.
  No hay eliminación física de usuarios (solo inactivar), a propósito.
- **Paso 4b, Configuración → Roles (hecho):** lista con rol + tipo (sistema/personalizado), pantallas con acceso
  (badges, "+N"), "Solicitudes que ve" (alcance) y cuentas (enlaza a `/configuracion/usuarios?rol=`, que
  `UsuariosPage` ya lee como filtro inicial). Detalle con banner, secciones Datos del rol / Permisos por módulo y
  barra de acciones; crear rol igual. `ModuloPermisos.jsx` es el árbol compartido (módulo padre + pantallas,
  calcado de `NAV_GROUPS`, más "Otros permisos"). Backend: `GET /roles` ahora incluye `total_usuarios`. Se sigue
  identificando el rol por `:nombre` en la URL (Solicitudes no tiene `GET /roles/:id`) y NO se agregó borrar roles
  (el backend no lo soporta; no se pidió).
- **Eliminar roles y usuarios inactivos (2026-10-09, pedido del usuario, en Solicitudes/Cartera/HRMS):**
  `DELETE /roles/:nombre` (solo roles no `es_admin`, sin cuentas, sin uso en aprobadores de frente ni desvíos de
  Workflows: se rechaza con 409, no se limpia en silencio) y `DELETE /usuarios/:id/definitivo` (solo cuentas
  inactivas, no la propia; si tiene solicitudes u otros registros por llave foránea → 409 y queda inactiva).
  Botones con confirmación en `RolDetallePage` y `UsuarioFormPage`.
- **Pendiente (siguientes pasos, mismo orden que en Cartera):** 4c) Proyectos/Frentes, 4d) Workflows, 5) Terceros, 6) Solicitudes (lista, detalle, formularios), 7)
  Dashboard/Actividad.
- **Repositorio:** el proyecto se movió al repositorio nuevo `https://github.com/Gestion-servicios-TI-AED/SolicitudesDeContratacion` (2026-10-09). El historial se reescribió (147 commits, autor y committer `GEliasDev <GEliasDev@users.noreply.github.com>`, sin trailers de Claude), la plantilla ya no es submódulo y las capturas sueltas de la raíz y la carpeta `files/` quedan ignoradas. Commits en español, sin atribución a Claude; el push lo hace el usuario.

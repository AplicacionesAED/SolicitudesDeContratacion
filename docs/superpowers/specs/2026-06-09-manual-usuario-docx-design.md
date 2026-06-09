# Spec: Manual de Usuario — Solicitudes de Indirectos (Baia Kristal)

**Fecha:** 2026-06-09  
**Tipo:** Documento Word (.docx)  
**Audiencia:** Usuarios finales del sistema  
**Tono:** Sencillo, operativo, paso a paso  
**Capturas:** Automáticas (servidor de desarrollo + Playwright)

---

## Objetivo

Generar un archivo `manual-usuario.docx` que sirva como referencia completa para todos los usuarios del sistema de Solicitudes de Indirectos de Baia Kristal. El documento explica qué hace cada pantalla, qué espera cada campo y qué produce cada botón según el estado y el rol del usuario.

---

## Estructura del documento

### 0. Portada
- Logo (placeholder si no hay asset)
- Título: "Manual de Usuario — Sistema de Solicitudes de Indirectos"
- Subtítulo: "Baia Kristal"
- Versión: 1.0
- Fecha: junio 2026

### 1. Introducción
- Descripción de 1 párrafo: qué resuelve el sistema
- **Recuadro de advertencia prominente (IMPORTANTE):** Antes de usar el sistema, cada usuario debe vincular su correo Microsoft desde Perfil → Ajustes. Sin esto, algunas notificaciones y funcionalidades pueden no operar correctamente.
- Cómo acceder (URL, credenciales, captura del login)

### 2. Roles y accesos
Tabla con los 8 roles y sus capacidades:

| Rol | Puede crear solicitudes | Puede aprobar | Puede tramitar | Puede configurar |
|---|---|---|---|---|
| SOLICITANTE | ✓ | — | — | — |
| TECNICA | ✓ (con aprobación adicional) | — | — | — |
| DIRECTOR_TECNICO | — | ✓ (solicitudes TECNICA) | — | — |
| DIRECTOR_PROYECTO | — | ✓ (solicitudes del frente) | — | — |
| CONTRATOS | — | — | ✓ (tramitar, minutas) | — |
| CONTROLES | — | — | ✓ (registrar ADPRO) | — |
| DIRECTOR_CONTROLES | — | ✓ (aprobación final) | — | — |
| ADMIN | ✓ | ✓ | ✓ | ✓ |

### 3. Flujo del proceso

#### 3.1 Diagrama de estados
Representación visual del ciclo de vida completo de una solicitud con los 12 estados:

```
BORRADOR
  ↓ [Enviar] — SOLICITANTE / TECNICA
PENDIENTE_DIRECTOR_TECNICO  (solo si el solicitante tiene rol TECNICA)
  ↓ [Aprobar Director Técnico] — DIRECTOR_TECNICO
ENVIADA
  ↓ [Aprobar Director] — DIRECTOR_PROYECTO
EN_TRAMITE_CONTRATOS
  ↓ [Tramitar OK] — CONTRATOS
CREACION_MINUTA
  ↓ [Avanzar Contratos — subir anexos] — CONTRATOS
ENVIO_CONTRATO_POLIZAS
  ↓ [Pasar a Controles] — CONTRATOS
EN_CONTROLES
  ↓ [Registrar ADPRO] — CONTROLES
APROBACION_FINAL
  ↓ [Aprobar Final] — DIRECTOR_CONTROLES
COMPLETADA

Desvíos:
  PENDIENTE_DIRECTOR_TECNICO / ENVIADA / EN_TRAMITE_CONTRATOS → [Devolver] → DEVUELTA
  DEVUELTA / EN_REVISION → [Reenviar] → ENVIADA
  EN_TRAMITE_CONTRATOS → [Revisar] → EN_REVISION
```

#### 3.2 Tabla de transiciones
| Acción | Estado origen | Estado destino | Rol requerido | Campos adicionales |
|---|---|---|---|---|
| Enviar | BORRADOR | ENVIADA (o PENDIENTE_DIRECTOR_TECNICO si es TECNICA) | SOLICITANTE / TECNICA | — |
| Aprobar Director Técnico | PENDIENTE_DIRECTOR_TECNICO | ENVIADA | DIRECTOR_TECNICO | Nota (opcional) |
| Aprobar Director | ENVIADA | EN_TRAMITE_CONTRATOS | DIRECTOR_PROYECTO | Nota (opcional) |
| Devolver | ENVIADA / EN_TRAMITE_CONTRATOS | DEVUELTA | DIRECTOR_PROYECTO / CONTRATOS | Nota (obligatoria) |
| Tramitar OK | APROBADA_DIRECTOR / EN_TRAMITE_CONTRATOS | CREACION_MINUTA | CONTRATOS | Nota (opcional) |
| Revisar | EN_TRAMITE_CONTRATOS | EN_REVISION | CONTRATOS | Nota (obligatoria) |
| Avanzar Contratos | CREACION_MINUTA | ENVIO_CONTRATO_POLIZAS | CONTRATOS | Requiere ≥1 anexo subido |
| Pasar a Controles | ENVIO_CONTRATO_POLIZAS | EN_CONTROLES | CONTRATOS | — |
| Registrar ADPRO | EN_CONTROLES | APROBACION_FINAL | CONTROLES | N° contrato Adpro (obligatorio) |
| Aprobar Final | APROBACION_FINAL | COMPLETADA | DIRECTOR_CONTROLES | Estado contratación, nota |
| Reenviar | DEVUELTA / EN_REVISION | ENVIADA | SOLICITANTE / TECNICA | Nota (opcional) |

### 4. Recorrido por rol

Un sub-capítulo por rol. Cada uno incluye:
- Qué ve al ingresar (captura del dashboard)
- Lista de pantallas disponibles
- Paso a paso de su flujo típico con capturas

#### 4.1 Solicitante / TECNICA
1. Dashboard — resumen de mis solicitudes
2. Crear solicitud nueva (elegir tipo)
3. Llenar formulario y guardar borrador
4. Enviar solicitud
5. Recibir notificación de devolución → reenviar

#### 4.2 Director Técnico
1. Dashboard — solicitudes pendientes de mi aprobación
2. Abrir solicitud en estado PENDIENTE_DIRECTOR_TECNICO
3. Aprobar o devolver

#### 4.3 Director de Proyecto
1. Dashboard — solicitudes de mi frente
2. Aprobar o devolver solicitudes en estado ENVIADA

#### 4.4 Contratos
1. Dashboard — solicitudes en trámite
2. Tramitar solicitud (OK o a revisión)
3. Subir anexos en CREACION_MINUTA
4. Avanzar a Controles

#### 4.5 Controles
1. Dashboard — solicitudes en controles
2. Registrar número de contrato ADPRO

#### 4.6 Director de Controles
1. Dashboard — solicitudes en aprobación final
2. Aprobar definitivamente

#### 4.7 Administrador
1. Gestión completa de usuarios (crear, editar, asignar frentes y permisos)
2. Gestión de frentes y proyectos
3. Configuración de aprobadores por frente
4. Gestión de terceros y especialidades

### 5. Referencia de módulos

#### 5.1 Pantalla de inicio de sesión
- Campos: Correo electrónico, Contraseña
- Botón: Iniciar sesión

#### 5.2 Dashboard
- Tarjetas de métricas: Total solicitudes, En trámite, Completadas, Devueltas
- Acceso rápido a solicitudes recientes
- Captura general

#### 5.3 Módulo de Solicitudes

##### 5.3.1 Listado de solicitudes
- Filtros disponibles: estado, tipo, fecha
- Columnas de la tabla
- Botón "Nueva Solicitud"
- Paginación

##### 5.3.2 Página de selección de tipo (Nueva Solicitud)
9 tipos disponibles con su descripción:
- Orden de Servicio (ODS)
- Contrato (CONT)
- Otrosí por Tiempo (OST)
- Otrosí Tiempo, Cantidad y/o Modificación (OSTC)
- Trámite de Cuenta (TCC)
- Trámite de Facturas (TFC)
- Trámite de Cuentas Recurrentes (TCR)
- Trámite de Cuentas Ocasionales (TCO)
- Trámite de Bonificaciones y Comisiones (TBC)

##### 5.3.3 Formulario de solicitud (campo a campo — ver Sección 6)
Secciones del formulario:
1. Encabezado (automático: consecutivo, solicitante, fecha)
2. Información del Formulario (frentes, proyecto, tipo, tipo contrato si aplica)
3. Datos del Contratista (tercero, representante, NIT)
4. Datos del Contrato (descripción, plazo, forma de pago, valor, asunto, alcance, términos de referencia, condiciones especiales)
5. Documentos adjuntos (cuadro comparativo, cotización, generador de gastos, evaluación inicial, PreBEP)
6. Cronograma (fechas, actividades, fases opcionales)

Botones del formulario:
- **Guardar borrador** — guarda sin validar, disponible siempre
- **Enviar** — valida todos los campos obligatorios y envía al flujo de aprobación

##### 5.3.4 Detalle de solicitud
Información mostrada: consecutivo, estado (badge), tipo, solicitante, fechas, tercero, valor, descripción, plazo, forma de pago, frentes, etapas, cronograma, archivos, historial de acciones.

Botones por estado (ver Sección 3.2 — Tabla de transiciones).

Documentos generables: Resumen de Licitación (Word .docx), Cronograma (Excel .xlsx).

##### 5.3.5 Editar solicitud
Solo disponible en estado BORRADOR o DEVUELTA para el solicitante propietario.

#### 5.4 Módulo de Terceros

##### 5.4.1 Listado de terceros
- Búsqueda por nombre/NIT
- Columnas: Razón social, NIT, Tipo contrato, Vencimiento SAGRILAFT, estado DD (6 checks)
- Solo aparecen en el selector de solicitudes si `aprobadoDebidaDiligencia = true` (los 6 checks de DD están activos)

##### 5.4.2 Nuevo tercero / Editar tercero
Campos de identificación, contacto, datos del representante legal (ver Sección 6).

##### 5.4.3 Detalle de tercero
- Información completa del tercero
- Sección de Debida Diligencia: 6 verificaciones booleanas
  1. Identificación de la contraparte
  2. Consulta de listas restrictivas
  3. Verificación PEP
  4. Conocimiento del cliente
  5. Verificación de beneficiarios finales
  6. Evaluación de riesgo
- Fecha de vencimiento SAGRILAFT
- Especialidades asignadas (dropdown multi-selección)
- Botón: Editar especialidades

#### 5.5 Módulo de Configuración (solo ADMIN)

##### 5.5.1 Usuarios
- Tabla de usuarios: nombre, cargo, email, rol(es), estado activo
- Crear usuario: nombre, cargo, email, teléfono, rol(es), contraseña, frentes asignados, funcionalidades adicionales
- Editar usuario: mismos campos
- Activar/desactivar usuario
- Asignación masiva de frentes

##### 5.5.2 Frentes y Proyectos
- Crear proyecto: nombre, código de consecutivo
- Crear frente: nombre, proyecto, etapa (opcional)
- Editar frente: nombre, proyecto, etapa
- Eliminar frente (si no tiene solicitudes asociadas)
- Filtro por etapa
- Sub-página de detalle del frente: usuarios asignados, configuración de aprobadores

##### 5.5.3 Aprobadores por frente
Para cada frente se configura:
- Director de Proyecto (aprobador primario)
- Responsable Contratos – Trámite
- Responsable Contratos – Minuta
- Coordinador Controles
- Director de Controles

#### 5.6 Perfil y ajustes

**⚠️ IMPORTANTE — Vincular correo Microsoft:**
Todo usuario debe ir a Perfil → Ajustes y vincular su cuenta Microsoft antes de usar el sistema. Este paso es necesario para recibir notificaciones y utilizar funcionalidades integradas con Microsoft 365.

Captura: pantalla de perfil con botón "Vincular cuenta Microsoft".

---

### 6. Referencia de formularios (campo a campo)

#### 6.1 Formulario de Solicitud

| Campo | Sección | Tipo | Obligatorio | Valores / Formato | Regla de negocio |
|---|---|---|---|---|---|
| Consecutivo | Encabezado | Texto (auto) | Auto | SOL-{TIPO}-{PROY}-{FRENTE}-{NNN} | Generado al enviar |
| Solicitante | Encabezado | Texto (auto) | Auto | Nombre del usuario logueado | Solo lectura |
| Fecha | Encabezado | Fecha (auto) | Auto | DD/MM/YYYY | Fecha de creación |
| Frente(s) de trabajo | Info formulario | Multi-select | ✓ | Lista de frentes activos asignados al usuario | Mínimo 1 |
| Proyecto | Info formulario | Select (auto) | ✓ | Se carga automáticamente desde el frente | Solo lectura |
| Tipo de solicitud | Info formulario | Select | ✓ | 9 opciones | Determina campos adicionales |
| Tipo de contrato | Info formulario | Select | Condicional | OBRA, SUMINISTRO, SERVICIOS, DISENO, CONSULTORÍA, etc. | Solo si tipo = CONTRATO |
| Etapa | Info formulario | Número | No | Entero positivo | Informativo |
| Tercero (contratista) | Contratista | Search + select | ✓ | Terceros aprobados en DD | Solo terceros con DD completa |
| Representante legal | Contratista | Texto (auto) | Auto | Nombre | Viene del tercero, editable en contexto |
| NIT representante | Contratista | Texto | Auto | 000000000-0 | Viene del tercero |
| Descripción de la actividad | Contrato | Textarea | ✓ | Texto libre | Máx. sin límite explícito |
| Plazo de ejecución | Contrato | Texto | ✓ | Ej: "3 meses", "90 días" | Texto libre |
| Forma de pago | Contrato | Select | ✓ | Acta de recibo, Mensual, Quincenal, etc. | — |
| Valor final | Contrato | Número | ✓ | Número entero (pesos COP) | Se muestra en letras automáticamente |
| Valor en letras | Contrato | Texto (auto) | Auto | Generado desde valor final | Solo lectura |
| Asunto | Contrato | Texto | No | Texto libre | Se genera automáticamente: "Frente – Tercero – Descripción" |
| Alcance | Contrato | Textarea | No | Texto libre | — |
| Términos de referencia | Contrato | Textarea | No | Texto libre | — |
| Condiciones especiales | Contrato | Textarea | No | Texto libre | — |
| Cuadro comparativo | Documentos | Archivo | ✓ | PDF, XLSX, XLS — máx. 10 MB | Obligatorio al enviar |
| Cotización | Documentos | Archivo | ✓ | PDF, XLSX, XLS — máx. 10 MB | Obligatorio al enviar |
| Generador de gastos | Documentos | Archivo | ✓ | PDF, XLSX, XLS — máx. 10 MB | Obligatorio al enviar |
| Evaluación inicial | Documentos | Archivo | ✓ | PDF, XLSX, XLS — máx. 10 MB | Obligatorio al enviar |
| PreBEP | Documentos | Archivo | No | PDF, XLSX, XLS — máx. 10 MB | Opcional |
| Fecha inicio cronograma | Cronograma | Fecha | ✓ | YYYY-MM-DD | Mínimo 13 días hábiles desde hoy (Colombia) |
| Fecha fin cronograma | Cronograma | Fecha | ✓ | YYYY-MM-DD | Debe ser ≥ fecha inicio |
| ¿Tiene fases? | Cronograma | Toggle | No | Sí / No | Activa modo de fases |
| Actividades | Cronograma | Tabla | ✓ | Descripción + fecha inicio + fecha fin | Mínimo 1 actividad con descripción |

#### 6.2 Formulario de Tercero (nuevo / editar)

| Campo | Tipo | Obligatorio | Formato / Valores |
|---|---|---|---|
| Razón social | Texto | ✓ | Nombre legal de la empresa |
| NIT | Texto | ✓ | 000000000-0 |
| Tipo de contrato | Select | ✓ | Obra, Suministro, Servicios, etc. |
| Confidencialidad | Toggle | No | Sí / No |
| Representante legal | Texto | ✓ | Nombre completo |
| Cédula representante | Texto | ✓ | Número de cédula |
| Correo firma | Email | ✓ | correo@dominio.com |
| Dirección representante | Texto | ✓ | Dirección completa |
| Teléfono representante | Texto | ✓ | Número de teléfono |
| Nombre contacto | Texto | No | Nombre del contacto operativo |
| Teléfono contacto | Texto | No | Número de teléfono |
| Correo contacto | Email | No | correo@dominio.com |
| Fecha venc. SAGRILAFT | Fecha | No | DD/MM/YYYY |
| DD — Identificación contraparte | Toggle | No | ✓ / ✗ |
| DD — Consulta listas restrictivas | Toggle | No | ✓ / ✗ |
| DD — Verificación PEP | Toggle | No | ✓ / ✗ |
| DD — Conocimiento del cliente | Toggle | No | ✓ / ✗ |
| DD — Verificación beneficiarios | Toggle | No | ✓ / ✗ |
| DD — Evaluación de riesgo | Toggle | No | ✓ / ✗ |
| Especialidades | Multi-select | No | Lista del catálogo de especialidades |

#### 6.3 Formulario de Usuario (configuración)

| Campo | Tipo | Obligatorio | Formato / Valores |
|---|---|---|---|
| Nombre completo | Texto | ✓ | Nombre y apellidos |
| Cargo | Texto | ✓ | Ej: "Coordinador de Obra" |
| Email | Email | ✓ | correo@empresa.com |
| Teléfono | Texto | No | Número de contacto |
| Rol(es) | Multi-select | ✓ | SOLICITANTE, TECNICA, DIRECTOR_TECNICO, DIRECTOR_PROYECTO, CONTRATOS, CONTROLES, DIRECTOR_CONTROLES, ADMIN |
| Contraseña | Password | ✓ en creación | Mínimo 6 caracteres |
| Frentes asignados | Multi-select | No | Lista de frentes activos |
| Funcionalidades adicionales | Multi-select | No | Permisos extra más allá del rol base |

#### 6.4 Formulario de Frente (configuración)

| Campo | Tipo | Obligatorio | Valores |
|---|---|---|---|
| Nombre del frente | Texto | ✓ | Ej: "KALA 1" |
| Proyecto | Select | ✓ | Lista de proyectos activos |
| Etapa | Número | No | Entero positivo |

#### 6.5 Formulario de Proyecto (configuración)

| Campo | Tipo | Obligatorio | Valores |
|---|---|---|---|
| Nombre del proyecto | Texto | ✓ | Ej: "Baia Kristal" |
| Código de consecutivo | Texto | No | Ej: "BK" — aparece en el consecutivo |

---

## Decisiones de diseño

- **Advertencia de correo Microsoft:** aparece en dos lugares — recuadro amarillo en la introducción (página 2) y sección dedicada dentro del módulo de Perfil.
- **Capturas automáticas:** generadas con Playwright navegando el servidor de desarrollo local (`http://localhost:3000`). Usuario de prueba: `admin@baiak.com` / `Admin123!` para capturas de configuración; `smercado@baiak.com` / `Abc123!` para capturas del flujo de solicitante.
- **Generación .docx:** script Node.js usando el paquete `docx` (ya es dependencia del proyecto). Corre como script independiente fuera de Next.js.
- **Capturas embebidas:** imágenes PNG insertadas inline en el .docx con dimensiones máximas de 14cm de ancho para legibilidad en A4.
- **Idioma:** español colombiano, sin anglicismos técnicos.

---

## Archivos a crear

| Archivo | Propósito |
|---|---|
| `solicitudes-indirectos/scripts/generate-docs/capture-screenshots.ts` | Script Playwright: navega el app y guarda PNGs por sección |
| `solicitudes-indirectos/scripts/generate-docs/generate-docx.ts` | Script que ensambla el .docx con textos + imágenes |
| `solicitudes-indirectos/scripts/generate-docs/content.ts` | Contenido textual del documento (separado de la lógica) |
| `manual-usuario.docx` | Output final en la raíz del proyecto |

---

## Dependencias adicionales necesibles

- `playwright` (screenshots)
- `docx` (ya instalado como dependencia del proyecto)
- `ts-node` o `tsx` para ejecutar los scripts TypeScript

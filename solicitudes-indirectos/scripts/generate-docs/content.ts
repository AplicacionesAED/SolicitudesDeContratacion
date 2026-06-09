// ── Types ─────────────────────────────────────────────────────────────────────

export interface FieldRow {
  campo: string;
  tipo: string;
  obligatorio: string;
  valores: string;
  regla: string;
}

export interface BtnRow {
  estado: string;
  boton: string;
  rol: string;
  resultado: string;
  camposExtra: string;
}

export interface RolRow {
  rol: string;
  nombre: string;
  puede: string;
  ve: string;
}

// ── Introducción ──────────────────────────────────────────────────────────────

export const INTRO_TEXT = `El Sistema de Solicitudes de Indirectos es la plataforma oficial de Baia Kristal para gestionar todas las solicitudes de contratación indirecta: órdenes de servicio, contratos, otrosíes y trámites de pago. Centraliza el proceso de aprobación, garantiza trazabilidad completa de cada solicitud y notifica a cada actor en el momento que le corresponde actuar.`;

export const MICROSOFT_WARNING = `IMPORTANTE — Antes de usar el sistema por primera vez, cada usuario debe ir a Perfil (esquina superior derecha) y hacer clic en "Vincular cuenta Microsoft". Este paso es obligatorio para recibir notificaciones en tiempo real y acceder a funcionalidades integradas con Microsoft 365. Sin este vínculo, algunas alertas pueden no llegar a tu correo.`;

// ── Roles ─────────────────────────────────────────────────────────────────────

export const ROLES_TABLE: RolRow[] = [
  {
    rol: "SOLICITANTE",
    nombre: "Solicitante",
    puede: "Crear solicitudes, enviar, reenviar solicitudes devueltas, descargar documentos.",
    ve: "Solo sus propias solicitudes y las de sus frentes asignados.",
  },
  {
    rol: "TECNICA",
    nombre: "Coordinador Técnico",
    puede: "Crear y enviar solicitudes (pasan primero por Director Técnico). Puede crear solicitudes de diseño.",
    ve: "Sus propias solicitudes.",
  },
  {
    rol: "DIRECTOR_TECNICO",
    nombre: "Director Técnico",
    puede: "Aprobar o devolver solicitudes del coordinador técnico.",
    ve: "Solicitudes en estado PENDIENTE_DIRECTOR_TECNICO.",
  },
  {
    rol: "DIRECTOR_PROYECTO",
    nombre: "Director de Proyecto",
    puede: "Aprobar o devolver solicitudes de su frente.",
    ve: "Solicitudes de los frentes asignados.",
  },
  {
    rol: "CONTRATOS",
    nombre: "Responsable de Contratos",
    puede: "Tramitar solicitudes, crear minutas, subir anexos, enviar a controles.",
    ve: "Todas las solicitudes.",
  },
  {
    rol: "CONTROLES",
    nombre: "Coordinador de Controles",
    puede: "Registrar el número de contrato ADPRO.",
    ve: "Todas las solicitudes.",
  },
  {
    rol: "DIRECTOR_CONTROLES",
    nombre: "Director de Controles",
    puede: "Dar la aprobación final y completar la solicitud.",
    ve: "Todas las solicitudes.",
  },
  {
    rol: "ADMIN",
    nombre: "Administrador",
    puede: "Acceso total: gestionar usuarios, frentes, proyectos, terceros y toda la configuración.",
    ve: "Todo el sistema.",
  },
];

// ── Tipos de solicitud ────────────────────────────────────────────────────────

export const TIPOS_SOLICITUD = [
  { abrev: "ODS",  nombre: "Orden de Servicio",                        descripcion: "Para contratar un servicio puntual sin contrato formal." },
  { abrev: "CONT", nombre: "Contrato",                                 descripcion: "Para formalizar una relación contractual con un tercero." },
  { abrev: "OST",  nombre: "Otrosí por Tiempo",                        descripcion: "Para prorrogar el plazo de un contrato existente." },
  { abrev: "OSTC", nombre: "Otrosí Tiempo, Cantidad y/o Modificación", descripcion: "Para modificar plazo, cantidad o condiciones de un contrato." },
  { abrev: "TCC",  nombre: "Trámite de Cuenta",                        descripcion: "Para tramitar el pago de una cuenta única." },
  { abrev: "TFC",  nombre: "Trámite de Facturas",                      descripcion: "Para tramitar el pago de facturas." },
  { abrev: "TCR",  nombre: "Trámite de Cuentas Recurrentes",           descripcion: "Para pagos que se repiten periódicamente." },
  { abrev: "TCO",  nombre: "Trámite de Cuentas Ocasionales",           descripcion: "Para pagos esporádicos no recurrentes." },
  { abrev: "TBC",  nombre: "Trámite de Bonificaciones y Comisiones",   descripcion: "Para tramitar el pago de bonificaciones o comisiones." },
];

// ── Campos del formulario de solicitud ────────────────────────────────────────

export const CAMPOS_SOLICITUD: FieldRow[] = [
  { campo: "Consecutivo",              tipo: "Texto (automático)", obligatorio: "Auto",    valores: "SOL-{TIPO}-{PROYECTO}-{FRENTE}-{NNN}",       regla: "Se genera al enviar, no al guardar borrador." },
  { campo: "Solicitante",              tipo: "Texto (automático)", obligatorio: "Auto",    valores: "Nombre del usuario en sesión",                 regla: "Solo lectura." },
  { campo: "Fecha",                    tipo: "Fecha (automático)", obligatorio: "Auto",    valores: "DD/MM/YYYY",                                   regla: "Fecha de creación del borrador." },
  { campo: "Frente(s) de trabajo",     tipo: "Selección múltiple", obligatorio: "Sí",     valores: "Lista de frentes activos asignados al usuario", regla: "Mínimo 1 frente. Define quién aprueba." },
  { campo: "Proyecto",                 tipo: "Texto (automático)", obligatorio: "Auto",    valores: "Se asigna según el frente seleccionado",       regla: "Solo lectura." },
  { campo: "Tipo de solicitud",        tipo: "Selección",          obligatorio: "Sí",      valores: "9 opciones (ODS, CONT, OST, OSTC, TCC, TFC, TCR, TCO, TBC)", regla: "Determina qué campos adicionales se muestran." },
  { campo: "Tipo de contrato",         tipo: "Selección",          obligatorio: "Condicional", valores: "OBRA, SUMINISTRO, SERVICIOS, DISEÑO, CONSULTORÍA, ARRENDAMIENTO, OTRO", regla: "Obligatorio solo si Tipo = Contrato." },
  { campo: "Etapa",                    tipo: "Número",             obligatorio: "No",      valores: "Entero positivo",                              regla: "Informativo." },
  { campo: "Tercero (contratista)",    tipo: "Búsqueda + selección", obligatorio: "Sí",   valores: "Terceros con Debida Diligencia completa",      regla: "Solo aparecen terceros con los 6 checks de DD activos." },
  { campo: "Representante legal",      tipo: "Texto",              obligatorio: "Auto",    valores: "Nombre del representante",                     regla: "Se carga desde el tercero; editable en contexto." },
  { campo: "NIT representante",        tipo: "Texto",              obligatorio: "Auto",    valores: "000000000-0",                                  regla: "Se carga desde el tercero." },
  { campo: "Descripción de actividad", tipo: "Área de texto",      obligatorio: "Sí",      valores: "Texto libre",                                  regla: "Describe el objeto del contrato u orden de servicio." },
  { campo: "Plazo de ejecución",       tipo: "Texto",              obligatorio: "Sí",      valores: "Ej: \"3 meses\", \"90 días calendario\"",      regla: "Texto libre, no fecha." },
  { campo: "Forma de pago",            tipo: "Texto",              obligatorio: "Sí",      valores: "Ej: \"Acta de recibo de obra\", \"Mensual\"",   regla: "Texto libre." },
  { campo: "Valor final",              tipo: "Número",             obligatorio: "Sí",      valores: "Número entero en pesos COP",                   regla: "Se muestra automáticamente en letras." },
  { campo: "Valor en letras",          tipo: "Texto (automático)", obligatorio: "Auto",    valores: "Generado desde el valor final",                regla: "Solo lectura." },
  { campo: "Asunto",                   tipo: "Texto",              obligatorio: "No",       valores: "Texto libre",                                  regla: "Se auto-genera como: Frente – Tercero – Descripción." },
  { campo: "Alcance",                  tipo: "Área de texto",      obligatorio: "No",       valores: "Texto libre",                                  regla: "Descripción detallada del alcance." },
  { campo: "Términos de referencia",   tipo: "Área de texto",      obligatorio: "No",       valores: "Texto libre",                                  regla: "Condiciones técnicas del contrato." },
  { campo: "Condiciones especiales",   tipo: "Área de texto",      obligatorio: "No",       valores: "Texto libre",                                  regla: "Cualquier condición particular." },
  { campo: "Cuadro comparativo",       tipo: "Archivo",            obligatorio: "Sí",       valores: "PDF, XLSX, XLS — máx. 10 MB",                  regla: "Obligatorio al enviar." },
  { campo: "Cotización",               tipo: "Archivo",            obligatorio: "Sí",       valores: "PDF, XLSX, XLS — máx. 10 MB",                  regla: "Obligatorio al enviar." },
  { campo: "Generador de gastos",      tipo: "Archivo",            obligatorio: "Sí",       valores: "PDF, XLSX, XLS — máx. 10 MB",                  regla: "Obligatorio al enviar." },
  { campo: "Evaluación inicial",       tipo: "Archivo",            obligatorio: "Sí",       valores: "PDF, XLSX, XLS — máx. 10 MB",                  regla: "Obligatorio al enviar." },
  { campo: "PreBEP",                   tipo: "Archivo",            obligatorio: "No",        valores: "PDF, XLSX, XLS — máx. 10 MB",                  regla: "Opcional." },
  { campo: "Fecha inicio cronograma",  tipo: "Fecha",              obligatorio: "Sí",       valores: "YYYY-MM-DD",                                   regla: "Mínimo 13 días hábiles desde hoy (Colombia). No se cuentan fines de semana ni festivos." },
  { campo: "Fecha fin cronograma",     tipo: "Fecha",              obligatorio: "Sí",       valores: "YYYY-MM-DD",                                   regla: "Debe ser mayor o igual a la fecha de inicio." },
  { campo: "¿Tiene fases?",            tipo: "Toggle Sí/No",       obligatorio: "No",       valores: "Sí / No",                                      regla: "Activa el modo de fases en el cronograma." },
  { campo: "Actividades",              tipo: "Tabla",              obligatorio: "Sí",       valores: "Descripción + Fecha inicio + Fecha fin por fila", regla: "Mínimo 1 actividad con descripción no vacía." },
];

// ── Botones por estado ────────────────────────────────────────────────────────

export const BOTONES_POR_ESTADO: BtnRow[] = [
  { estado: "BORRADOR",               boton: "Guardar borrador",    rol: "Solicitante (propietario)",      resultado: "Guarda sin validar. Queda en BORRADOR.",                          camposExtra: "—" },
  { estado: "BORRADOR",               boton: "Enviar",              rol: "Solicitante (propietario)",      resultado: "Valida todos los campos obligatorios y envía. Pasa a ENVIADA (o PENDIENTE_DIRECTOR_TECNICO si el rol es TECNICA).", camposExtra: "—" },
  { estado: "BORRADOR",               boton: "Editar",              rol: "Solicitante (propietario)",      resultado: "Abre el formulario para editar el borrador.",                      camposExtra: "—" },
  { estado: "PENDIENTE_DIR_TECNICO",  boton: "Aprobar",             rol: "Director Técnico",               resultado: "Aprueba y pasa a ENVIADA para aprobación del Director de Proyecto.", camposExtra: "Nota (opcional)" },
  { estado: "PENDIENTE_DIR_TECNICO",  boton: "Devolver",            rol: "Director Técnico",               resultado: "Devuelve al solicitante. Pasa a DEVUELTA.",                        camposExtra: "Nota (obligatoria)" },
  { estado: "ENVIADA",                boton: "Aprobar",             rol: "Director de Proyecto del frente", resultado: "Aprueba y pasa a EN_TRAMITE_CONTRATOS.",                          camposExtra: "Nota (opcional)" },
  { estado: "ENVIADA",                boton: "Devolver",            rol: "Director de Proyecto del frente", resultado: "Devuelve al solicitante. Pasa a DEVUELTA.",                       camposExtra: "Nota (obligatoria)" },
  { estado: "EN_TRAMITE_CONTRATOS",   boton: "Tramitar (OK)",       rol: "Contratos",                      resultado: "Documentación revisada. Pasa a CREACION_MINUTA.",                 camposExtra: "Nota (opcional)" },
  { estado: "EN_TRAMITE_CONTRATOS",   boton: "Enviar a revisión",   rol: "Contratos",                      resultado: "Solicita correcciones al solicitante. Pasa a EN_REVISION.",        camposExtra: "Nota (obligatoria)" },
  { estado: "EN_TRAMITE_CONTRATOS",   boton: "Devolver",            rol: "Contratos",                      resultado: "Devuelve al solicitante. Pasa a DEVUELTA.",                        camposExtra: "Nota (obligatoria)" },
  { estado: "EN_REVISION",            boton: "Reenviar",            rol: "Solicitante (propietario)",      resultado: "Reenvía tras correcciones. Vuelve a EN_TRAMITE_CONTRATOS.",        camposExtra: "Nota (opcional)" },
  { estado: "CREACION_MINUTA",        boton: "Subir anexo",         rol: "Contratos",                      resultado: "Adjunta un documento (contrato, póliza, etc.) a la solicitud.",   camposExtra: "Archivo + nombre del documento" },
  { estado: "CREACION_MINUTA",        boton: "Avanzar a Controles", rol: "Contratos (requiere ≥1 anexo)",  resultado: "Envía la solicitud con sus anexos al equipo de Controles. Pasa a ENVIO_CONTRATO_POLIZAS.", camposExtra: "—" },
  { estado: "ENVIO_CONTRATO_POLIZAS", boton: "Pasar a Controles",   rol: "Contratos",                      resultado: "Confirma que el contrato y pólizas fueron enviados. Pasa a EN_CONTROLES.", camposExtra: "—" },
  { estado: "EN_CONTROLES",           boton: "Registrar ADPRO",     rol: "Controles",                      resultado: "Registra el número de contrato en ADPRO. Pasa a APROBACION_FINAL.", camposExtra: "Número de contrato ADPRO (obligatorio)" },
  { estado: "APROBACION_FINAL",       boton: "Aprobar definitivo",  rol: "Director de Controles",          resultado: "Aprobación final. La solicitud queda COMPLETADA.",                 camposExtra: "Estado de contratación, nota (opcionales)" },
  { estado: "DEVUELTA",               boton: "Reenviar",            rol: "Solicitante (propietario)",      resultado: "Reenvía la solicitud corregida. Vuelve a ENVIADA.",                camposExtra: "Nota (opcional)" },
  { estado: "DEVUELTA",               boton: "Editar",              rol: "Solicitante (propietario)",      resultado: "Abre el formulario para hacer correcciones antes de reenviar.",    camposExtra: "—" },
];

// ── Campos del formulario de tercero ─────────────────────────────────────────

export const CAMPOS_TERCERO: FieldRow[] = [
  { campo: "Razón social",              tipo: "Texto",   obligatorio: "Sí",  valores: "Nombre legal de la empresa",   regla: "Debe ser único en el sistema." },
  { campo: "NIT",                       tipo: "Texto",   obligatorio: "Sí",  valores: "000000000-0",                  regla: "Formato con dígito de verificación." },
  { campo: "Tipo de contrato",          tipo: "Selección", obligatorio: "Sí", valores: "Obra, Suministro, Servicios, Diseño, Consultoría, Arrendamiento, Otro", regla: "Define la categoría del tercero." },
  { campo: "Confidencialidad",          tipo: "Toggle",  obligatorio: "No",  valores: "Sí / No",                      regla: "Marca si la información del tercero es confidencial." },
  { campo: "Representante legal",       tipo: "Texto",   obligatorio: "Sí",  valores: "Nombre completo",              regla: "—" },
  { campo: "Cédula representante",      tipo: "Texto",   obligatorio: "Sí",  valores: "Número de cédula",             regla: "—" },
  { campo: "Correo de firma",           tipo: "Email",   obligatorio: "Sí",  valores: "correo@dominio.com",           regla: "Usado para envíos de documentos para firma." },
  { campo: "Dirección representante",   tipo: "Texto",   obligatorio: "Sí",  valores: "Dirección completa",           regla: "—" },
  { campo: "Teléfono representante",    tipo: "Texto",   obligatorio: "Sí",  valores: "Número de teléfono",           regla: "—" },
  { campo: "Nombre contacto",           tipo: "Texto",   obligatorio: "No",  valores: "Nombre del contacto operativo", regla: "Persona de contacto para operaciones del día a día." },
  { campo: "Teléfono contacto",         tipo: "Texto",   obligatorio: "No",  valores: "Número de teléfono",           regla: "—" },
  { campo: "Correo contacto",           tipo: "Email",   obligatorio: "No",  valores: "correo@dominio.com",           regla: "—" },
  { campo: "Fecha venc. SAGRILAFT",     tipo: "Fecha",   obligatorio: "No",  valores: "DD/MM/YYYY",                   regla: "Fecha de vencimiento del registro SAGRILAFT." },
  { campo: "DD — Identificación contraparte",     tipo: "Toggle", obligatorio: "No", valores: "✓ / ✗", regla: "Check 1 de 6 de Debida Diligencia." },
  { campo: "DD — Consulta listas restrictivas",   tipo: "Toggle", obligatorio: "No", valores: "✓ / ✗", regla: "Check 2 de 6 de Debida Diligencia." },
  { campo: "DD — Verificación PEP",               tipo: "Toggle", obligatorio: "No", valores: "✓ / ✗", regla: "Check 3 de 6 de Debida Diligencia." },
  { campo: "DD — Conocimiento del cliente",       tipo: "Toggle", obligatorio: "No", valores: "✓ / ✗", regla: "Check 4 de 6 de Debida Diligencia." },
  { campo: "DD — Verificación beneficiarios",     tipo: "Toggle", obligatorio: "No", valores: "✓ / ✗", regla: "Check 5 de 6 de Debida Diligencia." },
  { campo: "DD — Evaluación de riesgo",           tipo: "Toggle", obligatorio: "No", valores: "✓ / ✗", regla: "Check 6 de 6. El tercero queda aprobado cuando los 6 están activos." },
  { campo: "Especialidades",            tipo: "Selección múltiple", obligatorio: "No", valores: "Lista del catálogo de especialidades", regla: "Clasifica al tercero por área de trabajo." },
];

// ── Campos del formulario de usuario ─────────────────────────────────────────

export const CAMPOS_USUARIO: FieldRow[] = [
  { campo: "Nombre completo",               tipo: "Texto",              obligatorio: "Sí",           valores: "Nombre y apellidos",                 regla: "—" },
  { campo: "Cargo",                         tipo: "Texto",              obligatorio: "Sí",           valores: "Ej: \"Coordinador de Obra\"",        regla: "—" },
  { campo: "Email",                         tipo: "Email",              obligatorio: "Sí",           valores: "correo@empresa.com",                 regla: "Debe ser único. Es el usuario de acceso." },
  { campo: "Teléfono",                      tipo: "Texto",              obligatorio: "No",           valores: "Número de contacto",                 regla: "—" },
  { campo: "Rol(es)",                       tipo: "Selección múltiple", obligatorio: "Sí",           valores: "SOLICITANTE, TECNICA, DIRECTOR_TECNICO, DIRECTOR_PROYECTO, CONTRATOS, CONTROLES, DIRECTOR_CONTROLES, ADMIN", regla: "Un usuario puede tener más de un rol." },
  { campo: "Contraseña",                    tipo: "Contraseña",         obligatorio: "Sí (creación)", valores: "Mínimo 6 caracteres",               regla: "En edición, dejar vacío para no cambiar." },
  { campo: "Frentes asignados",             tipo: "Selección múltiple", obligatorio: "No",           valores: "Lista de frentes activos",           regla: "Define qué solicitudes puede ver el usuario." },
  { campo: "Funcionalidades adicionales",   tipo: "Selección múltiple", obligatorio: "No",           valores: "Permisos extra fuera del rol base",  regla: "Permite dar o quitar permisos específicos sin cambiar el rol." },
];

// ── Campos del formulario de frente ──────────────────────────────────────────

export const CAMPOS_FRENTE: FieldRow[] = [
  { campo: "Nombre del frente", tipo: "Texto",    obligatorio: "Sí", valores: "Ej: \"KALA 1\"",          regla: "Se usa en el consecutivo (normalizado, sin tildes ni espacios)." },
  { campo: "Proyecto",          tipo: "Selección", obligatorio: "Sí", valores: "Lista de proyectos activos", regla: "—" },
  { campo: "Etapa",             tipo: "Número",   obligatorio: "No", valores: "Entero positivo",          regla: "Informativo. Permite filtrar frentes por etapa." },
];

export const CAMPOS_PROYECTO: FieldRow[] = [
  { campo: "Nombre del proyecto",    tipo: "Texto", obligatorio: "Sí",  valores: "Nombre completo del proyecto",  regla: "—" },
  { campo: "Código de consecutivo",  tipo: "Texto", obligatorio: "No",  valores: "Ej: \"BK\"",                    regla: "Aparece en el consecutivo de cada solicitud (SOL-ODS-BK-...)." },
];

// ── Sección Aprobadores por frente ────────────────────────────────────────────

export const CAMPOS_APROBADORES: FieldRow[] = [
  { campo: "Director de Proyecto",           tipo: "Selección", obligatorio: "Sí",  valores: "Usuarios con rol DIRECTOR_PROYECTO", regla: "Aprobador primario. Si no se configura, cualquier Director del frente puede aprobar." },
  { campo: "Responsable Contratos – Trámite", tipo: "Selección", obligatorio: "No", valores: "Usuarios con rol CONTRATOS",         regla: "Se asigna automáticamente al crear la solicitud." },
  { campo: "Responsable Contratos – Minuta",  tipo: "Selección", obligatorio: "No", valores: "Usuarios con rol CONTRATOS",         regla: "—" },
  { campo: "Coordinador Controles",           tipo: "Selección", obligatorio: "No", valores: "Usuarios con rol CONTROLES",         regla: "Informativo. Cualquier usuario CONTROLES puede registrar ADPRO." },
  { campo: "Director de Controles",           tipo: "Selección", obligatorio: "No", valores: "Usuarios con rol DIRECTOR_CONTROLES", regla: "Da la aprobación final." },
];

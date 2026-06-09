import {
  Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  TableLayoutType, ImageRun, UnderlineType,
} from "docx";
import * as fs from "fs";
import * as path from "path";
import {
  INTRO_TEXT, MICROSOFT_WARNING, ROLES_TABLE, TIPOS_SOLICITUD,
  CAMPOS_SOLICITUD, BOTONES_POR_ESTADO, CAMPOS_TERCERO,
  CAMPOS_USUARIO, CAMPOS_FRENTE, CAMPOS_PROYECTO, CAMPOS_APROBADORES,
  type FieldRow, type BtnRow, type RolRow,
} from "./content";

const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");
const OUTPUT_PATH     = path.join(__dirname, "../../manual-usuario.docx");

// ── Image helpers ─────────────────────────────────────────────────────────────

const IMG_W = 530;
const IMG_H = 332;

function img(filename: string): ImageRun | null {
  const p = path.join(SCREENSHOTS_DIR, filename);
  if (!fs.existsSync(p)) {
    console.warn(`  ⚠️  Captura no encontrada: ${filename}`);
    return null;
  }
  return new ImageRun({
    data: fs.readFileSync(p) as unknown as string,
    transformation: { width: IMG_W, height: IMG_H },
    type: "png",
  });
}

function imgParagraph(filename: string): Paragraph {
  const image = img(filename);
  if (!image) {
    return new Paragraph({
      children: [new TextRun({ text: `[Captura no disponible: ${filename}]`, italics: true, color: "999999" })],
      spacing: { before: 120, after: 120 },
    });
  }
  return new Paragraph({
    children: [image],
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 200 },
  });
}

// ── Text helpers ──────────────────────────────────────────────────────────────

function h1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, color: "1E3A8A", size: 36 })],
    spacing: { before: 480, after: 200 },
    pageBreakBefore: true,
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, color: "1E3A8A", size: 28 })],
    spacing: { before: 320, after: 120 },
  });
}

function h3(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, bold: true, size: 24 })],
    spacing: { before: 240, after: 80 },
  });
}

function p(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    spacing: { before: 80, after: 80 },
  });
}

function spacer(): Paragraph {
  return new Paragraph({ text: "", spacing: { before: 80, after: 80 } });
}

function warningBox(text: string): Table {
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 6, color: "D97706" },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "D97706" },
      left:   { style: BorderStyle.SINGLE, size: 6, color: "D97706" },
      right:  { style: BorderStyle.SINGLE, size: 6, color: "D97706" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: "FEF3C7", type: ShadingType.CLEAR, color: "auto" },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "⚠️ IMPORTANTE  ", bold: true, size: 22, color: "92400E" }),
                  new TextRun({ text, size: 22, color: "92400E" }),
                ],
                spacing: { before: 60, after: 60 },
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ── Generic table ─────────────────────────────────────────────────────────────

function headerCell(text: string): TableCell {
  return new TableCell({
    shading: { fill: "1E3A8A", type: ShadingType.CLEAR, color: "auto" },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 18 })],
      }),
    ],
  });
}

function dataCell(text: string, shade?: string): TableCell {
  return new TableCell({
    shading: shade ? { fill: shade, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 18 })],
      }),
    ],
  });
}

function fieldTable(rows: FieldRow[]): Table {
  const headers = ["Campo", "Tipo", "Obligatorio", "Valores / Formato", "Regla de negocio"];
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map(headerCell) }),
      ...rows.map((r, i) =>
        new TableRow({
          children: [
            dataCell(r.campo,        i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.tipo,         i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.obligatorio,  i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.valores,      i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.regla,        i % 2 ? "F8FAFC" : "FFFFFF"),
          ],
        })
      ),
    ],
  });
}

function buttonTable(rows: BtnRow[]): Table {
  const headers = ["Estado", "Botón", "Rol requerido", "Resultado", "Campos adicionales"];
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map(headerCell) }),
      ...rows.map((r, i) =>
        new TableRow({
          children: [
            dataCell(r.estado,       i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.boton,        i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.rol,          i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.resultado,    i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.camposExtra,  i % 2 ? "F8FAFC" : "FFFFFF"),
          ],
        })
      ),
    ],
  });
}

function rolesTable(rows: RolRow[]): Table {
  const headers = ["Rol", "Nombre", "Puede hacer", "Ve en el sistema"];
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map(headerCell) }),
      ...rows.map((r, i) =>
        new TableRow({
          children: [
            dataCell(r.rol,    i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.nombre, i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.puede,  i % 2 ? "F8FAFC" : "FFFFFF"),
            dataCell(r.ve,     i % 2 ? "F8FAFC" : "FFFFFF"),
          ],
        })
      ),
    ],
  });
}

function estadoFlowTable(): Table {
  const headers = ["Acción", "Estado origen", "Estado destino", "Rol requerido", "Campos adicionales"];
  const rows = [
    ["Enviar",                "BORRADOR",               "ENVIADA (o PENDIENTE_DIR_TECNICO si rol=TECNICA)", "Solicitante / TECNICA",    "—"],
    ["Aprobar Dir. Técnico",  "PENDIENTE_DIR_TECNICO",  "ENVIADA",                                          "Director Técnico",         "Nota (opcional)"],
    ["Aprobar Director",      "ENVIADA",                "EN_TRAMITE_CONTRATOS",                             "Director de Proyecto",     "Nota (opcional)"],
    ["Devolver",              "PENDIENTE / ENVIADA / EN_TRAMITE_CONTRATOS", "DEVUELTA",                    "Dir. Técnico / Dir. Proyecto / Contratos", "Nota (obligatoria)"],
    ["Tramitar OK",           "EN_TRAMITE_CONTRATOS",   "CREACION_MINUTA",                                  "Contratos",                "Nota (opcional)"],
    ["Enviar a revisión",     "EN_TRAMITE_CONTRATOS",   "EN_REVISION",                                      "Contratos",                "Nota (obligatoria)"],
    ["Avanzar a Controles",   "CREACION_MINUTA",        "ENVIO_CONTRATO_POLIZAS",                           "Contratos (≥1 anexo)",     "—"],
    ["Pasar a Controles",     "ENVIO_CONTRATO_POLIZAS", "EN_CONTROLES",                                     "Contratos",                "—"],
    ["Registrar ADPRO",       "EN_CONTROLES",           "APROBACION_FINAL",                                 "Controles",                "N° contrato Adpro (obligatorio)"],
    ["Aprobar definitivo",    "APROBACION_FINAL",       "COMPLETADA",                                       "Director de Controles",    "Estado contratación, nota (opcionales)"],
    ["Reenviar",              "DEVUELTA / EN_REVISION", "ENVIADA",                                          "Solicitante",              "Nota (opcional)"],
  ];
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map(headerCell) }),
      ...rows.map((r, i) =>
        new TableRow({
          children: r.map((cell) => dataCell(cell, i % 2 ? "F8FAFC" : "FFFFFF")),
        })
      ),
    ],
  });
}

// ── Document assembly ─────────────────────────────────────────────────────────

async function main() {
  console.log("📄 Generando manual-usuario.docx...\n");

  const doc = new Document({
    styles: {
      paragraphStyles: [
        { id: "Normal", name: "Normal", run: { size: 22, font: "Calibri" } },
      ],
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 900, right: 720 } },
        },
        children: [

          // PORTADA
          new Paragraph({
            children: [new TextRun({ text: "MANUAL DE USUARIO", bold: true, size: 56, color: "1E3A8A" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 2000, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Sistema de Solicitudes de Indirectos", size: 36, color: "374151" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Baia Kristal — AED Constructores S.A.S", size: 28, color: "6B7280" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Versión 1.0  |  Junio 2026", size: 24, color: "9CA3AF" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 800 },
          }),

          // 1. INTRODUCCIÓN
          h1("1. Introducción"),
          p(INTRO_TEXT),
          spacer(),
          warningBox(MICROSOFT_WARNING),
          spacer(),
          h2("1.1 Cómo acceder al sistema"),
          p("Ingresa desde tu navegador a la URL del sistema. En la pantalla de inicio de sesión, escribe tu correo corporativo y contraseña asignados por el administrador."),
          imgParagraph("01-login.png"),

          // 2. ROLES Y ACCESOS
          h1("2. Roles y Accesos"),
          p("El sistema tiene 8 roles. Cada usuario puede tener uno o más roles asignados. El administrador puede añadir funcionalidades adicionales a un usuario sin cambiar su rol base."),
          spacer(),
          rolesTable(ROLES_TABLE),

          // 3. FLUJO DEL PROCESO
          h1("3. Flujo del Proceso"),
          p("Toda solicitud sigue el ciclo de vida que se describe a continuación. Cada estado tiene un color distintivo en el sistema para identificarlo rápidamente."),
          spacer(),

          h2("3.1 Estados de una solicitud"),
          ...([
            ["BORRADOR",                "Gris",    "La solicitud fue creada pero aún no se ha enviado."],
            ["PENDIENTE DIR. TÉCNICO",  "Violeta", "Esperando aprobación del Director Técnico (solo solicitudes de Coordinador Técnico)."],
            ["ENVIADA",                 "Azul",    "Enviada al Director de Proyecto para aprobación."],
            ["EN TRÁMITE CONTRATOS",    "Púrpura", "En revisión y tramitación por el área de Contratos."],
            ["CREACIÓN DE MINUTA",      "Naranja", "Contratos está preparando la minuta del contrato y subiendo anexos."],
            ["ENVÍO CONTRATO Y PÓLIZAS","Cyan",    "El contrato y pólizas fueron enviados, pendiente confirmación."],
            ["EN CONTROLES",            "Verde azulado", "En proceso de registro en ADPRO por Controles."],
            ["APROBACIÓN FINAL",        "Lima",    "Pendiente de aprobación definitiva por el Director de Controles."],
            ["COMPLETADA",              "Verde",   "Solicitud aprobada y cerrada exitosamente."],
            ["DEVUELTA",                "Rojo",    "Devuelta al solicitante para correcciones."],
            ["EN REVISIÓN",             "Amarillo","Enviada de vuelta al solicitante por Contratos para ajustes puntuales."],
          ] as [string, string, string][]).map(([estado, color, desc]) =>
            new Paragraph({
              children: [
                new TextRun({ text: `${estado}  `, bold: true, size: 20 }),
                new TextRun({ text: `(${color})  `, size: 20, color: "6B7280" }),
                new TextRun({ text: desc, size: 20 }),
              ],
              spacing: { before: 60, after: 60 },
              bullet: { level: 0 },
            })
          ),

          spacer(),
          h2("3.2 Tabla de transiciones"),
          p("Esta tabla muestra qué acción lleva de un estado a otro y quién puede ejecutarla."),
          spacer(),
          estadoFlowTable(),

          // 4. RECORRIDO POR ROL
          h1("4. Recorrido por Rol"),
          p("Esta sección describe el flujo típico desde la perspectiva de cada rol."),

          h2("4.1 Solicitante"),
          p("El Solicitante crea solicitudes, las envía y las corrige si son devueltas."),
          h3("Dashboard"),
          p("Al ingresar, el dashboard muestra un resumen de tus solicitudes activas."),
          imgParagraph("02-dashboard-solicitante.png"),
          h3("Paso 1 — Crear nueva solicitud"),
          p("Haz clic en Nueva Solicitud. Elige el tipo de solicitud que corresponde a tu necesidad."),
          imgParagraph("04-nueva-tipo.png"),
          h3("Paso 2 — Llenar el formulario"),
          p("Completa todos los campos obligatorios (marcados con asterisco rojo). Puedes guardar el borrador en cualquier momento con el botón Guardar borrador."),
          imgParagraph("05-form-encabezado.png"),
          imgParagraph("05-form-informacion.png"),
          imgParagraph("05-form-contratista.png"),
          imgParagraph("05-form-contrato.png"),
          imgParagraph("05-form-documentos.png"),
          imgParagraph("05-form-cronograma.png"),
          h3("Paso 3 — Enviar la solicitud"),
          p("Cuando hayas completado todos los campos y subido los archivos requeridos, haz clic en Enviar. Si falta algún campo, el sistema te llevará al primer error."),
          imgParagraph("06-detalle-borrador.png"),
          h3("Paso 4 — Solicitud devuelta"),
          p("Si tu solicitud es devuelta, recibirás una notificación. Abre la solicitud, revisa la nota del aprobador, corrige lo necesario y haz clic en Reenviar."),
          imgParagraph("14-detalle-devuelta.png"),

          h2("4.2 Director Técnico"),
          p("El Director Técnico aprueba o devuelve las solicitudes creadas por Coordinadores Técnicos antes de que lleguen al Director de Proyecto."),
          imgParagraph("07-detalle-enviada.png"),
          p("Botones disponibles: Aprobar (pasa a ENVIADA para el Director de Proyecto) o Devolver (regresa al solicitante con una nota)."),

          h2("4.3 Director de Proyecto"),
          p("El Director de Proyecto recibe las solicitudes de su frente y las aprueba o devuelve."),
          imgParagraph("07-detalle-enviada.png"),
          p("Botones disponibles: Aprobar (pasa a EN_TRAMITE_CONTRATOS) o Devolver (regresa al solicitante con una nota obligatoria)."),

          h2("4.4 Contratos"),
          p("El área de Contratos tramita la solicitud, prepara la minuta y los documentos, y los envía a Controles."),
          h3("En Trámite Contratos"),
          imgParagraph("08-detalle-en-tramite.png"),
          p("Opciones: Tramitar OK (documentación en orden, pasa a CREACION_MINUTA) o Enviar a revisión (solicita correcciones al solicitante)."),
          h3("Creación de Minuta"),
          imgParagraph("09-detalle-creacion-minuta.png"),
          p("En este estado aparece la zona de subida de anexos. Sube el contrato, las pólizas y cualquier documento adicional. Cuando hayas subido todos los documentos, haz clic en Avanzar a Controles."),
          h3("Envío de Contrato y Pólizas"),
          imgParagraph("10-detalle-envio-polizas.png"),
          p("Confirma que el contrato y las pólizas fueron enviados haciendo clic en Pasar a Controles."),

          h2("4.5 Controles"),
          p("Controles registra el número de contrato en el sistema ADPRO."),
          imgParagraph("11-detalle-en-controles.png"),
          p("Haz clic en Registrar ADPRO, escribe el número de contrato y confirma. La solicitud pasa a APROBACION_FINAL."),

          h2("4.6 Director de Controles"),
          p("El Director de Controles da la aprobación definitiva y cierra el proceso."),
          imgParagraph("12-detalle-aprobacion-final.png"),
          p("Haz clic en Aprobar definitivo. La solicitud queda en estado COMPLETADA."),
          imgParagraph("13-detalle-completada.png"),

          h2("4.7 Administrador"),
          p("El Administrador tiene acceso completo al sistema: usuarios, frentes, proyectos, terceros y toda la configuración."),
          imgParagraph("02-dashboard-admin.png"),

          // 5. REFERENCIA DE MÓDULOS
          h1("5. Referencia de Módulos"),

          h2("5.1 Lista de Solicitudes"),
          p("Muestra todas las solicitudes a las que tienes acceso según tu rol. Puedes filtrar por estado, tipo y fecha. Haz clic en cualquier fila para ver el detalle."),
          imgParagraph("03-solicitudes-lista.png"),

          h2("5.2 Detalle de Solicitud"),
          p("Muestra toda la información de una solicitud: consecutivo, estado (badge de color), tipo, solicitante, tercero, valor, frentes, cronograma, documentos adjuntos, historial de acciones y botones de acción según el estado y tu rol."),
          p("Documentos generables desde el detalle:"),
          new Paragraph({ children: [new TextRun({ text: "Resumen de Licitación — genera un archivo Word (.docx) con los datos de la solicitud.", size: 20 })], bullet: { level: 0 }, spacing: { before: 40, after: 40 } }),
          new Paragraph({ children: [new TextRun({ text: "Cronograma — genera un archivo Excel (.xlsx) con el cronograma de actividades.", size: 20 })], bullet: { level: 0 }, spacing: { before: 40, after: 40 } }),

          h2("5.3 Módulo de Terceros"),
          h3("Lista de Terceros"),
          p("Muestra todos los terceros registrados. Puedes buscar por nombre o NIT. El ícono verde indica que el tercero tiene Debida Diligencia completa y puede ser seleccionado en solicitudes."),
          imgParagraph("16-terceros-lista.png"),
          h3("Detalle de Tercero"),
          p("Muestra la ficha completa del tercero incluyendo los 6 checks de Debida Diligencia y sus especialidades."),
          imgParagraph("17-tercero-detalle.png"),
          h3("Nuevo Tercero"),
          imgParagraph("18-tercero-nuevo.png"),

          h2("5.4 Módulo de Configuración (solo ADMIN)"),
          h3("Usuarios"),
          p("Crea, edita, activa y desactiva usuarios. Asigna roles, frentes y funcionalidades adicionales."),
          imgParagraph("19-config-usuarios.png"),
          h3("Frentes y Proyectos"),
          p("Crea proyectos y frentes. Cada frente pertenece a un proyecto. El nombre del frente se usa en el consecutivo de las solicitudes."),
          imgParagraph("20-config-frentes.png"),
          h3("Aprobadores por Frente"),
          p("Configura qué usuarios son responsables de aprobar, tramitar y controlar las solicitudes de cada frente."),
          imgParagraph("21-config-aprobadores.png"),

          h2("5.5 Perfil y Ajustes"),
          spacer(),
          warningBox("Para vincular tu cuenta Microsoft: ve a Perfil (haz clic en tu nombre, esquina superior derecha) y busca el botón \"Vincular cuenta Microsoft\". Completa el proceso de autenticación con tu cuenta corporativa. Solo debes hacerlo una vez."),
          spacer(),
          imgParagraph("22-perfil-vincular.png"),

          // 6. REFERENCIA DE FORMULARIOS
          h1("6. Referencia de Formularios"),
          p("Las siguientes tablas detallan todos los campos de cada formulario: tipo de dato esperado, si es obligatorio y las reglas de negocio que aplican."),

          h2("6.1 Formulario de Solicitud"),
          p("Este formulario se usa para crear y editar solicitudes. Todos los tipos de solicitud (ODS, Contrato, Otrosíes, Trámites) comparten el mismo formulario con pequeñas variaciones según el tipo."),
          spacer(),
          fieldTable(CAMPOS_SOLICITUD),

          h2("6.2 Botones por Estado"),
          p("Esta tabla muestra exactamente qué botones aparecen en el detalle de una solicitud según su estado y el rol del usuario conectado."),
          spacer(),
          buttonTable(BOTONES_POR_ESTADO),

          h2("6.3 Formulario de Tercero"),
          spacer(),
          fieldTable(CAMPOS_TERCERO),

          h2("6.4 Formulario de Usuario"),
          p("Disponible en Configuración → Usuarios (solo ADMIN)."),
          spacer(),
          fieldTable(CAMPOS_USUARIO),

          h2("6.5 Formulario de Frente"),
          p("Disponible en Configuración → Frentes (solo ADMIN)."),
          spacer(),
          fieldTable(CAMPOS_FRENTE),

          h2("6.6 Formulario de Proyecto"),
          spacer(),
          fieldTable(CAMPOS_PROYECTO),

          h2("6.7 Configuración de Aprobadores por Frente"),
          spacer(),
          fieldTable(CAMPOS_APROBADORES),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUTPUT_PATH, buffer);
  console.log(`✅ manual-usuario.docx generado en: ${OUTPUT_PATH}`);
  console.log(`   Tamaño: ${(buffer.byteLength / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});

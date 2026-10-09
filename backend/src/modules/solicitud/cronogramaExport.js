// Puerto literal de api/solicitudes/cronograma/export/route.ts -- recibe un
// CronogramaData tal cual lo arma el frontend (no necesita que exista en BD
// todavía, ver CronogramaBuilder) y devuelve un .xlsx con estilos vía
// exceljs.
const ExcelJS = require('exceljs');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const { countBusinessDays } = require('../../utils/holidays');

function parseDate(iso) {
  return new Date(iso + 'T12:00:00');
}
function formatDateCO(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function businessDays(start, end) {
  if (!start || !end) return 0;
  const s = parseDate(start);
  const e = parseDate(end);
  if (e <= s) return 0;
  return countBusinessDays(s, e);
}

const exportarCronograma = asyncHandler(async (req, res) => {
  const body = req.body;
  if (!body.fechaInicio || !body.fechaFin) throw new ApiError(400, 'fechaInicio y fechaFin son requeridos');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Solicitudes de Contratación';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Cronograma', { pageSetup: { fitToPage: true, fitToWidth: 1 } });

  sheet.columns = [
    { key: 'fase', header: 'Fase', width: 22 },
    { key: 'actividad', header: 'Actividad', width: 50 },
    { key: 'fechaInicio', header: 'Fecha Inicio', width: 16 },
    { key: 'fechaFin', header: 'Fecha Fin', width: 16 },
    { key: 'duracion', header: 'Duración (días háb.)', width: 22 },
  ];

  sheet.insertRow(1, ['CRONOGRAMA DE CONTRATO']);
  sheet.mergeCells('A1:E1');
  const titleCell = sheet.getCell('A1');
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 28;

  sheet.insertRow(2, [`Período: ${formatDateCO(body.fechaInicio)} — ${formatDateCO(body.fechaFin)}`]);
  sheet.mergeCells('A2:E2');
  const subCell = sheet.getCell('A2');
  subCell.font = { italic: true, size: 10, color: { argb: 'FF374151' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  subCell.alignment = { horizontal: 'center' };
  sheet.getRow(2).height = 18;

  const headerRow = sheet.getRow(3);
  headerRow.values = ['Fase', 'Actividad', 'Fecha Inicio', 'Fecha Fin', 'Duración (días háb.)'];
  headerRow.height = 22;
  headerRow.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = { bottom: { style: 'thin', color: { argb: 'FFBFDBFE' } }, right: { style: 'thin', color: { argb: 'FFBFDBFE' } } };
  });

  let rowIndex = 4;
  const COLORS_FASE = ['FFDBEAFE', 'FFE0F2FE'];
  const COLOR_ACT_EVEN = 'FFFFFFFF';
  const COLOR_ACT_ODD = 'FFF9FAFB';

  function addRow(fase, actividad, fechaInicio, fechaFin, bgFase, bgAct) {
    const dur = businessDays(fechaInicio, fechaFin);
    const row = sheet.getRow(rowIndex);
    row.values = [fase, actividad, formatDateCO(fechaInicio), formatDateCO(fechaFin), dur > 0 ? dur : ''];
    row.height = 18;
    row.eachCell({ includeEmpty: true }, (c, colNum) => {
      const bg = colNum === 1 ? bgFase : bgAct;
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      c.font = { size: 10 };
      c.alignment = { vertical: 'middle', wrapText: colNum === 2 };
      c.border = { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } }, right: { style: 'hair', color: { argb: 'FFE5E7EB' } } };
      if (colNum >= 3 && colNum <= 4) c.alignment = { horizontal: 'center', vertical: 'middle' };
      if (colNum === 5) c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    rowIndex++;
  }

  if (body.tieneFases && body.fases?.length > 0) {
    body.fases.forEach((fase, fi) => {
      const bgFase = COLORS_FASE[fi % COLORS_FASE.length];
      const faseDur = businessDays(fase.fechaInicio, fase.fechaFin);
      const faseRow = sheet.getRow(rowIndex);
      faseRow.values = [`FASE ${fase.numeroFase}: ${fase.nombreFase}`, '', formatDateCO(fase.fechaInicio), formatDateCO(fase.fechaFin), faseDur > 0 ? faseDur : ''];
      sheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
      faseRow.height = 20;
      faseRow.eachCell({ includeEmpty: true }, (c, colNum) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgFase } };
        c.font = { bold: true, size: 10, color: { argb: 'FF1E3A8A' } };
        c.alignment = { vertical: 'middle' };
        if (colNum >= 3 && colNum <= 4) c.alignment = { horizontal: 'center', vertical: 'middle' };
        if (colNum === 5) c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = { top: { style: 'thin', color: { argb: 'FF93C5FD' } }, bottom: { style: 'thin', color: { argb: 'FF93C5FD' } }, right: { style: 'hair', color: { argb: 'FFE5E7EB' } } };
      });
      rowIndex++;

      if (fase.actividades?.length > 0) {
        fase.actividades.forEach((act, ai) => {
          const bgAct = ai % 2 === 0 ? COLOR_ACT_EVEN : COLOR_ACT_ODD;
          addRow('', act.descripcion, act.fechaInicio, act.fechaFin, bgAct, bgAct);
        });
      } else {
        addRow('', '(Sin actividades)', fase.fechaInicio, fase.fechaFin, COLOR_ACT_EVEN, COLOR_ACT_EVEN);
      }
    });
  } else {
    const actividades = body.actividades ?? [];
    if (actividades.length === 0) {
      addRow('—', '(Sin actividades)', body.fechaInicio, body.fechaFin, COLOR_ACT_EVEN, COLOR_ACT_EVEN);
    } else {
      actividades.forEach((act, ai) => {
        const bgAct = ai % 2 === 0 ? COLOR_ACT_EVEN : COLOR_ACT_ODD;
        addRow('—', act.descripcion, act.fechaInicio, act.fechaFin, bgAct, bgAct);
      });
    }
  }

  const totalDur = businessDays(body.fechaInicio, body.fechaFin);
  const totalRow = sheet.getRow(rowIndex);
  totalRow.values = ['TOTAL', '', '', '', totalDur];
  totalRow.height = 22;
  sheet.mergeCells(`A${rowIndex}:D${rowIndex}`);
  totalRow.eachCell({ includeEmpty: true }, (c, colNum) => {
    c.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    c.alignment = { horizontal: colNum === 5 ? 'center' : 'left', vertical: 'middle' };
  });

  sheet.views = [{ state: 'frozen', ySplit: 3, activeCell: 'A4' }];

  const buffer = await workbook.xlsx.writeBuffer();

  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="cronograma-${Date.now()}.xlsx"`,
    'Cache-Control': 'no-store',
  });
  res.send(Buffer.from(buffer));
});

module.exports = { exportarCronograma };

import ExcelJS from "exceljs";

const BRAND = "FF2346B0";

// Builds a one-sheet workbook with a branded title row, a bold header and sized columns.
export async function workbook({ title, sheet, columns, rows }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "UZLITRPRO";
  wb.created = new Date();
  const ws = wb.addWorksheet(sheet, { views: [{ state: "frozen", ySplit: 3 }] });
  ws.columns = columns.map((c) => ({ key: c.key, width: c.width || 16, style: c.numFmt ? { numFmt: c.numFmt } : {} }));

  ws.mergeCells(1, 1, 1, columns.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14, color: { argb: BRAND } };
  ws.getRow(1).height = 24;

  const header = ws.getRow(3);
  columns.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
    cell.alignment = { vertical: "middle" };
  });
  header.height = 20;
  for (const r of rows) ws.addRow(r);
  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: columns.length } };
  return wb.xlsx.writeBuffer();
}

export function xlsxResponse(buffer, filename) {
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store"
    }
  });
}

// Excel shows dates in local time; send Tashkent wall-clock time.
export function tashkentDate(value) {
  if (!value) return null;
  return new Date(new Date(value).getTime() + 5 * 3600e3);
}

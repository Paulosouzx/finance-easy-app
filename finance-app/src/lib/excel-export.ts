import ExcelJS from "exceljs";

export type ExcelColumn = {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
};

export async function downloadStyledExcel(
  filename: string,
  sheetName: string,
  columns: ExcelColumn[],
  rows: Record<string, string | number>[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FinanceApp";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width ?? 18,
    style: col.numFmt ? { numFmt: col.numFmt } : undefined,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7B2FF7" } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF5A1FB8" } } };
  });

  rows.forEach((row, index) => {
    const excelRow = sheet.addRow(row);
    const isEven = index % 2 === 0;
    excelRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? "FFF7F3FE" : "FFFFFFFF" },
      };
      cell.border = { bottom: { style: "hair", color: { argb: "FFE5DCF9" } } };
      cell.alignment = { vertical: "middle" };
    });
  });

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

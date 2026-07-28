import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], filename: string, colWidths?: number[]) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  if (colWidths && colWidths.length > 0) {
    worksheet['!cols'] = colWidths.map(w => ({ wch: w }));
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

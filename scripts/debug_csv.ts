import * as XLSX from 'xlsx';
import * as fs from 'fs';

async function debugCsv() {
  try {
    const filePath = 'c:\\Users\\rutsu\\Downloads\\勤怠管理_202602.csv';
    const buf = fs.readFileSync(filePath);
    console.log("First 20 bytes (hex):", buf.slice(0, 20).toString('hex'));
    
    // Try reading as string with explicit codepage and parsing
    const workbook = XLSX.read(buf, { type: 'buffer', codepage: 932 });
    console.log("Sheet names:", workbook.SheetNames);
    if (workbook.SheetNames.length > 0) {
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      console.log(`--- CSV Data (Rows: ${data.length}) ---`);
      data.slice(0, 20).forEach((row, i) => {
        console.log(`${i}: ${JSON.stringify(row)}`);
      });
    }
  } catch (e) {
    console.error("Error reading CSV:", e);
  }
}

debugCsv();

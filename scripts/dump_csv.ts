import * as XLSX from 'xlsx';
import * as fs from 'fs';

const csvPath = 'c:\\Users\\rutsu\\Downloads\\勤怠管理_202603.csv';
const buffer = fs.readFileSync(csvPath);
const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 932 });
const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }) as any[][];

console.log(`Total rows: ${data.length}`);
fs.writeFileSync('c:\\Users\\rutsu\\shift\\data\\raw_csv_dump.json', JSON.stringify(data, null, 2));

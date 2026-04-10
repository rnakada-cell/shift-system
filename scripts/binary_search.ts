import * as fs from 'fs';

const csvPath = 'c:\\Users\\rutsu\\Downloads\\勤怠管理_202603.csv';
const buffer = fs.readFileSync(csvPath);

console.log(`Buffer length: ${buffer.length}`);
console.log(`First 16 bytes: ${buffer.slice(0, 16).toString('hex')}`);

// UTF-8 for "みるく"
const miruku = Buffer.from('みるく', 'utf8');
console.log(`Searching for "みるく" (hex: ${miruku.toString('hex')})...`);
const idx = buffer.indexOf(miruku);
console.log(`Result: ${idx}`);

if (idx === -1) {
    // Try Shift-JIS? I can't easily generate SJIS bytes with Buffer.from,
    // but I'll try to find any Japanese-looking bytes (E3 8x xx)
    console.log("No UTF-8 'みるく' found. Searching for any E3 bytes...");
    let e3Count = 0;
    for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] === 0xE3) e3Count++;
    }
    console.log(`Found ${e3Count} E3 bytes.`);
} else {
    console.log(`Found "みるく" at ${idx}. Surrounding: ${buffer.slice(idx - 10, idx + 20).toString('utf8')}`);
}

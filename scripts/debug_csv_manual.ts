import * as fs from 'fs';
import 'dotenv/config';
import prisma from '../lib/db';

async function main() {
    const csvPath = 'c:\\Users\\rutsu\\shift\\data\\attendance_march_utf8_final.csv';
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n');
    console.log(`Total lines: ${lines.length}`);
    
    const allCasts = await prisma.cast.findMany();
    const castNames = allCasts.map(c => c.name);
    console.log(`DB Cast Names: ${castNames.join(', ')}`);

    for (let i = 0; i < 20; i++) {
        console.log(`Line ${i}: ${lines[i]}`);
    }

    // Try to match some lines
    let matches = 0;
    for (const line of lines) {
        const parts = line.split(',');
        if (parts.length < 4) continue;
        const name = parts[0].trim();
        if (castNames.includes(name)) {
            matches++;
        }
    }
    console.log(`Total name matches: ${matches}`);
}

main().catch(console.error);

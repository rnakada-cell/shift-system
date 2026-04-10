import 'dotenv/config';
import prisma from '../lib/db';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
// import { calcScore } from '../lib/optimizer';

async function main() {
    // 1. Import Attendance
    const csvPath = 'c:\\Users\\rutsu\\shift\\data\\attendance_march_utf8_final.csv';
    const content = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
    const lines = content.split('\n');

    const allCasts = await prisma.cast.findMany();
    const castNameMap = new Map(allCasts.map(c => [c.name, c.id]));

    console.log('\n--- Importing Attendance (Manual Parse) ---');
    let attCount = 0;
    const missingNames = new Set<string>();
    const dailyMap = new Map<string, number>();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        if (parts.length < 6) continue;

        const rawName = parts[0].trim();
        const rawDate = parts[3].trim().replace(/\//g, '-');
        const checkIn = parts[4].trim();
        const checkOut = parts[5].trim();

        if (!rawName || !rawDate || rawDate === '日付') continue;

        const castId = castNameMap.get(rawName);
        if (!castId) {
            missingNames.add(rawName);
            continue;
        }

        await prisma.castAttendance.upsert({
            where: { castId_date: { castId, date: rawDate } },
            update: { checkIn, checkOut, status: 'attend' },
            create: { castId, date: rawDate, checkIn, checkOut, status: 'attend', shopId: 'love_point' }
        });
        attCount++;
        dailyMap.set(rawDate, (dailyMap.get(rawDate) || 0) + 1);
    }
    console.log(`Imported ${attCount} attendance records.`);
    if (missingNames.size > 0) {
        console.warn(`Missing cast names in DB: ${Array.from(missingNames).join(', ')}`);
    }

    // 2. Import Real Sales
    console.log('\n--- Daily Attendance Count ---');
    Array.from(dailyMap.entries()).sort().forEach(([d, c]) => console.log(`${d}: ${c} items`));

    console.log('\n--- Importing Real Sales ---');
    const realSales = JSON.parse(fs.readFileSync('c:\\Users\\rutsu\\shift\\data\\real_sales_march.json', 'utf8'));
    for (const s of realSales) {
        await prisma.dailySummary.upsert({
            where: { date_shopId: { date: s.date, shopId: 'love_point' } },
            update: { salesInclTax: s.revenue, customerCount: s.customers },
            create: { date: s.date, shopId: 'love_point', salesInclTax: s.revenue, customerCount: s.customers }
        });
    }
    console.log(`Imported ${realSales.length} daily summaries.`);

    // 3. Run Simulation
    console.log('\n--- Running Simulation (AI Prediction) ---');
    const simResults: any[] = [];

    // Get store settings for segments
    const settings = await prisma.storeSetting.findUnique({ where: { id: 'main-store' } });
    const segments = (settings?.defaultSegments as any[]) || [];

    for (const s of realSales) {
        const date = s.date;
        const attendances = await prisma.castAttendance.findMany({
            where: { date, status: 'attend' },
            include: { cast: { include: { castScores: { orderBy: { calculatedAt: 'desc' }, take: 1 } } } }
        });

        let dayExpectedRevenue = 0;

        // Simulating the logic from optimizer.ts / calcScore
        for (const segment of segments) {
            const segHours = Number(segment.hours) || 2;
            const demandFactor = Number(segment.demandFactor) || 1.0;

            // Get segment start/end times from label (e.g. "18:00 - 20:00")
            const [segStart, segEnd] = (segment.label || "00:00 - 00:00").split(' - ');
            const sH = parseInt(segStart.split(':')[0]);
            const eH = parseInt(segEnd.split(':')[0]);

            // Filter casts who are actually working in this segment
            const workingNow = attendances.filter(a => {
                const checkInH = parseInt(a.checkIn?.split(':')[0] || "0");
                const checkOutH = parseInt(a.checkOut?.split(':')[0] || "24");
                // Simple overlap check
                return (checkInH < eH && checkOutH > sH);
            });

            for (const att of workingNow) {
                const cast = att.cast;
                const scoreObj = (cast as any).castScores?.[0];
                const hourlyRevenue = scoreObj?.hourlyRevenue || 0;
                const expected = hourlyRevenue * segHours * demandFactor;
                dayExpectedRevenue += expected;
            }
        }

        simResults.push({
            date,
            real: s.revenue,
            predicted: Math.round(dayExpectedRevenue),
            diff: Math.round(dayExpectedRevenue - s.revenue),
            error: s.revenue > 0 ? ((dayExpectedRevenue - s.revenue) / s.revenue * 100).toFixed(1) + '%' : 'N/A'
        });
    }

    console.table(simResults);
    fs.writeFileSync('c:\\Users\\rutsu\\shift\\data\\simulation_results.json', JSON.stringify(simResults, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });

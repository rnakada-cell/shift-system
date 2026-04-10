const http = require('http');

const defaultCasts = [
    { id: 'c1', name: 'さくら', hourlyWage: 3000, averageSales: 18000, nominationRate: 0.75, isRookie: false, preferredSegments: ['SEG_20_22', 'SEG_22_24'] },
    { id: 'c2', name: 'ことね', hourlyWage: 5000, averageSales: 20000, nominationRate: 0.90, isRookie: false, preferredSegments: ['SEG_20_22'] },
    { id: 'c3', name: 'りな（新人）', hourlyWage: 2500, averageSales: 4000, nominationRate: 0.10, isRookie: true, preferredSegments: ['SEG_18_20', 'SEG_20_22'] }
];

const defaultAvails = [
    { castId: 'c1', availability: [{ date: '2024-03-01', startTime: '20:00', endTime: '24:00', segments: [{ segmentId: 'SEG_20_22', hasDropIn: true }, { segmentId: 'SEG_22_24' }] }] },
    { castId: 'c2', availability: [{ date: '2024-03-01', startTime: '20:00', endTime: '22:00', segments: [{ segmentId: 'SEG_20_22', hasCompanion: true }] }] }
];


async function postData(path, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify(data))
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });

        req.on('error', (e) => reject(e));
        req.write(JSON.stringify(data));
        req.end();
    });
}

async function main() {
    console.log('Starting seed via Next.js API...');

    for (const cast of defaultCasts) {
        console.log(`Seeding Cast: ${cast.name}`);
        const res = await postData('/api/casts', cast);
        console.log(res);
    }

    for (const avail of defaultAvails) {
        console.log(`Seeding Availability for: ${avail.castId}`);
        const res = await postData('/api/availabilities', avail);
        console.log(res);
    }

    console.log('Seed via API complete.');
}

main().catch(console.error);

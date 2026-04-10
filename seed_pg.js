require('dotenv').config();
const { Client } = require('pg');

const defaultStore = {
    id: 'main-store',
    name: 'Demo Store',
    businessStart: '18:00',
    businessEnd: '05:00',
    defaultSegments: [
        { id: 'SEG_18_20', label: '18:00 - 20:00', maxCapacity: 4 },
        { id: 'SEG_20_22', label: '20:00 - 22:00', maxCapacity: 8 },
        { id: 'SEG_22_24', label: '22:00 - 24:00', maxCapacity: 6 }
    ]
};

const defaultCasts = [
    { id: 'c1', name: 'さくら', rank: 'S', hourlyWage: 3000, drinkBackRate: 0.1, chekiBackRate: 0.5, averageSales: 18000, nominationRate: 0.75, snsFollowers: 15000, absenceRate: 0.0, floorPreference: '1F', canOpen: true, canClose: true, isRookie: false, preferredSegments: ['SEG_20_22', 'SEG_22_24'] },
    { id: 'c2', name: 'ことね', rank: 'A', hourlyWage: 5000, drinkBackRate: 0.2, chekiBackRate: 0.5, averageSales: 20000, nominationRate: 0.90, snsFollowers: 3000, absenceRate: 0.2, floorPreference: 'ANY', canOpen: false, canClose: true, isRookie: false, preferredSegments: ['SEG_20_22'] },
    { id: 'c3', name: 'りな（新人）', rank: 'C', hourlyWage: 2500, drinkBackRate: 0.1, chekiBackRate: 0.3, averageSales: 4000, nominationRate: 0.10, snsFollowers: 500, absenceRate: 0.1, floorPreference: 'ANY', canOpen: false, canClose: false, isRookie: true, preferredSegments: ['SEG_18_20', 'SEG_20_22'] }
];

const defaultAvails = [
    { castId: 'c1', date: '2026-03-12', startTime: '20:00', endTime: '24:00', targetFloor: '1F', segments: [{ segmentId: 'SEG_20_22', hasDropIn: true }, { segmentId: 'SEG_22_24' }] },
    { castId: 'c2', date: '2026-03-12', startTime: '20:00', endTime: '22:00', targetFloor: 'ANY', segments: [{ segmentId: 'SEG_20_22', hasCompanion: true }] }
];

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    console.log('Connected to PG');

    try {
        await client.query('ALTER TABLE "Cast" RENAME COLUMN "rank" TO "cast_rank"');
        console.log('Column "rank" renamed to "cast_rank" successfully.');
    } catch (e) {
        console.log('Column "rank" not found, attempting to add "cast_rank" directly.');
        try {
            await client.query('ALTER TABLE "Cast" ADD COLUMN "cast_rank" TEXT DEFAULT \'C\' NOT NULL');
            console.log('Column "cast_rank" added.');
        } catch (e2) {
            console.log('Column "cast_rank" might already exist:', e2.message);
        }
    }

    // Upsert Store Setting
    const s = defaultStore;
    await client.query(`
    INSERT INTO "StoreSetting" ("id", "name", "businessStart", "businessEnd", "defaultSegments", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "businessStart" = EXCLUDED."businessStart", "businessEnd" = EXCLUDED."businessEnd", "defaultSegments" = EXCLUDED."defaultSegments", "updatedAt" = NOW();
  `, [s.id, s.name, s.businessStart, s.businessEnd, JSON.stringify(s.defaultSegments)]);

    // Upsert Casts
    for (const c of defaultCasts) {
        await client.query(`
      INSERT INTO "Cast" ("id", "name", "cast_rank", "hourlyWage", "drinkBackRate", "chekiBackRate", "averageSales", "nominationRate", "snsFollowers", "absenceRate", "floorPreference", "canOpen", "canClose", "isRookie", "preferredSegments", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      ON CONFLICT ("id") DO UPDATE SET "name"=EXCLUDED."name", "cast_rank"=EXCLUDED."cast_rank", "hourlyWage"=EXCLUDED."hourlyWage", "drinkBackRate"=EXCLUDED."drinkBackRate", "chekiBackRate"=EXCLUDED."chekiBackRate", "averageSales"=EXCLUDED."averageSales", "nominationRate"=EXCLUDED."nominationRate", "snsFollowers"=EXCLUDED."snsFollowers", "absenceRate"=EXCLUDED."absenceRate", "floorPreference"=EXCLUDED."floorPreference", "canOpen"=EXCLUDED."canOpen", "canClose"=EXCLUDED."canClose", "isRookie"=EXCLUDED."isRookie", "preferredSegments"=EXCLUDED."preferredSegments", "updatedAt"=NOW();
    `, [c.id, c.name, c.rank, c.hourlyWage, c.drinkBackRate, c.chekiBackRate, c.averageSales, c.nominationRate, c.snsFollowers, c.absenceRate, c.floorPreference, c.canOpen, c.canClose, c.isRookie, c.preferredSegments]);
    }

    // Upsert Availability
    for (const a of defaultAvails) {
        await client.query(`
      INSERT INTO "Availability" ("id", "castId", "date", "startTime", "endTime", "targetFloor", "segments", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT ("castId", "date") DO UPDATE SET "startTime"=EXCLUDED."startTime", "endTime"=EXCLUDED."endTime", "targetFloor"=EXCLUDED."targetFloor", "segments"=EXCLUDED."segments", "updatedAt"=NOW();
    `, [a.castId + '_' + a.date, a.castId, new Date(a.date), a.startTime, a.endTime, a.targetFloor, JSON.stringify(a.segments)]);
    }

    console.log('Done PG Seeding');
    await client.end();
}

main().catch(console.error);

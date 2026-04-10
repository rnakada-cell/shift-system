const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function initializeDb() {
  const connectionString = 'postgresql://postgres.njtethmjihphnyzsdcqg:Rutsuki0412@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';
  
  console.log('Connecting to database with a clean slate...');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1 // Only one connection to avoid hitting limits
  });

  try {
    const rawSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const statements = rawSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`Executing ${statements.length} schema statements...`);
    for (let i = 0; i < statements.length; i++) {
        await pool.query(statements[i] + ';');
    }
    console.log('✅ Schema created successfully!');

    // Seeding initial settings directly in DB since dev server is off
    console.log('Seeding initial settings...');
    const settings = {
        id: 'main-store',
        name: 'Future Shift Store',
        businessStart: '18:00',
        businessEnd: '05:00',
        defaultSegments: JSON.stringify([
            {id: 'seg-1', label: '18:00〜20:00', start: '18:00', end: '20:00'},
            {id: 'seg-2', label: '20:00〜22:00', start: '20:00', end: '22:00'},
            {id: 'seg-3', label: '22:00〜00:00', start: '22:00', end: '00:00'},
            {id: 'seg-4', label: '00:00〜02:00', start: '00:00', end: '02:00'},
            {id: 'seg-5', label: '02:00〜05:00', start: '02:00', end: '05:00'}
        ]),
        rankDefaultWages: JSON.stringify({S: 3500, A: 3000, B: 2500, C: 2000}),
        defaultCapacity: JSON.stringify({min1F: 5, max1F: 6, min2F: 3, max2F: 4}),
        updatedAt: new Date()
    };

    await pool.query(`
        INSERT INTO "StoreSetting" ("id", "name", "businessStart", "businessEnd", "defaultSegments", "rankDefaultWages", "defaultCapacity", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT ("id") DO UPDATE SET
            "name" = EXCLUDED."name",
            "businessStart" = EXCLUDED."businessStart",
            "businessEnd" = EXCLUDED."businessEnd",
            "defaultSegments" = EXCLUDED."defaultSegments",
            "rankDefaultWages" = EXCLUDED."rankDefaultWages",
            "defaultCapacity" = EXCLUDED."defaultCapacity",
            "updatedAt" = EXCLUDED."updatedAt"
    `, [settings.id, settings.name, settings.businessStart, settings.businessEnd, settings.defaultSegments, settings.rankDefaultWages, settings.defaultCapacity, settings.updatedAt]);
    
    console.log('✅ Initial settings seeded successfully!');
    console.log('🏁 ALL DATABASE WORK FINISHED!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

initializeDb();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres.njtethmjihphnyzsdcqg:Rutsuki0412@3.39.47.126:5432/postgres?sslmode=disable",
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Testing connection to Supabase (sdcqg)...");
    try {
        const counts = await prisma.cast.count();
        console.log(`Connection successful! Total casts: ${counts}`);
    } catch (error) {
        console.error("Connection failed:", error);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();

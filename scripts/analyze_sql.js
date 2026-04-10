const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres.xnrgipfhkqnsboyllbjo:Rutsuki0412@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres",
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('--- Analyzing Companion/Nomination Revenue ---');
  
  // 1. Find all distinct item names that look like companions or nominations
  const resItems = await pool.query(`
    SELECT "itemName", "category", COUNT(*) as count, AVG("totalPrice") as avg_price
    FROM "PosTransaction"
    WHERE "itemName" LIKE '%同伴%' OR "itemName" LIKE '%指名%' OR "itemName" LIKE '%SC%'
    GROUP BY "itemName", "category"
    ORDER BY count DESC
  `);
  console.log('\nPotential Items:');
  console.table(resItems.rows);

  // 2. Calculate the average TOTAL revenue for transactions that INCLUDE a companion item
  // We identify transactions by the first part of the ID (assuming ID is "TXID-ITEMID")
  // Or better, let's just look at the average of all "totalPrice" for those specific items
  
  // 3. Average check size for "companion" vs "non-companion"
  // Assuming ID format is ID-INDEX
  const resChecks = await pool.query(`
    WITH CheckTotal AS (
      SELECT split_part(id, '-', 1) as check_id, SUM("totalPrice") as total_sum,
             MAX(CASE WHEN "itemName" LIKE '%同伴%' THEN 1 ELSE 0 END) as is_companion
      FROM "PosTransaction"
      GROUP BY split_part(id, '-', 1)
    )
    SELECT is_companion, COUNT(*) as check_count, AVG(total_sum) as avg_check_total
    FROM CheckTotal
    GROUP BY is_companion
  `);
  console.log('\nAverage Check Total (Companion vs Normal):');
  console.table(resChecks.rows);

  // 4. Item Synergy / Champagne check
  const resChampagne = await pool.query(`
    SELECT "itemName", COUNT(*) as count, AVG("totalPrice") as avg_price
    FROM "PosTransaction"
    WHERE "category" = 'drink' AND "totalPrice" >= 10000
    GROUP BY "itemName"
    ORDER BY count DESC
    LIMIT 10
  `);
  console.log('\nTop High-Value Drinks (Synergy Potential):');
  console.table(resChampagne.rows);

  await pool.end();
}

main().catch(console.error);

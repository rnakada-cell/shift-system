import 'dotenv/config';
import prisma from '../lib/db';

async function main() {
  const casts = await prisma.cast.findMany({ select: { id: true, name: true } });
  console.log(JSON.stringify(casts, null, 2));
}

main().catch(console.error);

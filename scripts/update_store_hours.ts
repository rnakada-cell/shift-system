import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration to expand business hours...');
  
  const segments = [
    { id: 'SEG_14_16', label: '14:00 - 16:00', hours: 2, demandFactor: 0.6, maxCapacity: 17 },
    { id: 'SEG_16_18', label: '16:00 - 18:00', hours: 2, demandFactor: 0.8, maxCapacity: 17 },
    { id: 'SEG_18_20', label: '18:00 - 20:00', hours: 2, demandFactor: 1.0, maxCapacity: 17 },
    { id: 'SEG_20_22', label: '20:00 - 22:00', hours: 2, demandFactor: 1.3, maxCapacity: 17 },
    { id: 'SEG_22_24', label: '22:00 - 24:00', hours: 2, demandFactor: 1.1, maxCapacity: 17 },
    { id: 'SEG_00_02', label: '00:00 - 02:00', hours: 2, demandFactor: 0.9, maxCapacity: 12 },
    { id: 'SEG_02_04', label: '02:00 - 04:00', hours: 2, demandFactor: 0.7, maxCapacity: 8 },
    { id: 'SEG_04_06', label: '04:00 - 06:00', hours: 2, demandFactor: 0.5, maxCapacity: 8 },
  ];

  const result = await prisma.storeSetting.upsert({
    where: { id: 'main-store' },
    update: {
      businessStart: '14:00',
      businessEnd: '06:00',
      defaultSegments: segments
    },
    create: {
      id: 'main-store',
      name: 'Future Shift Main Store',
      businessStart: '14:00',
      businessEnd: '06:00',
      defaultSegments: segments
    }
  });

  console.log('Successfully updated StoreSetting:', result.businessStart, 'to', result.businessEnd);
  console.log('Segments count:', (result.defaultSegments as any[]).length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

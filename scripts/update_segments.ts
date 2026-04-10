import prisma from '../lib/db';

async function updateSegments() {
  console.log('🚀 Updating Store Settings for Flex-Time & 1-Hour Segments...');

  const hours = [
    { h: 15, label: "15:00" }, { h: 16, label: "16:00" }, { h: 17, label: "17:00" },
    { h: 18, label: "18:00" }, { h: 19, label: "19:00" }, { h: 20, label: "20:00" },
    { h: 21, label: "21:00" }, { h: 22, label: "22:00" }, { h: 23, label: "23:00" },
    { h: 0, label: "00:00" }
  ];

  const defaultSegments = hours.map((item, index) => ({
    id: `seg-${item.label.replace(':', '')}`,
    label: item.label,
    hours: 1.0,
    demandFactor: 1.0,
    maxCapacity: 10
  }));

  const settings = await prisma.storeSetting.upsert({
    where: { id: 'main-store' },
    update: {
      businessStart: '15:00',
      businessEnd: '01:00',
      defaultSegments: defaultSegments
    },
    create: {
      id: 'main-store',
      name: 'Future Shift Store',
      businessStart: '15:00',
      businessEnd: '01:00',
      defaultSegments: defaultSegments,
      scoreWeightHourlyRevenue: 0.4,
      scoreWeightTotalRevenue: 0.3,
      scoreWeightCustomerCount: 0.2,
      scoreWeightAttendanceRate: 0.1,
      scorePeriodDays: 30,
      rankDefaultWages: { "S": 3500, "A": 3000, "B": 2500, "C": 2000 },
      defaultCapacity: { "min1F": 5, "max1F": 6, "min2F": 3, "max2F": 4 }
    }
  });

  console.log('✅ Store Settings Updated Successfully!');
  console.log('New Segments Count:', (settings.defaultSegments as any).length);
}

updateSegments()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

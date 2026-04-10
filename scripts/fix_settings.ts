import prisma from '../lib/db';

async function fixSettings() {
  console.log('Checking store settings...');
  const settings = await prisma.storeSetting.findUnique({
    where: { id: 'main-store' }
  });

  if (!settings) {
    console.log('No settings found. Creating default...');
    await prisma.storeSetting.create({
      data: {
        id: 'main-store',
        name: 'Future Shift Store',
        businessStart: '18:00',
        businessEnd: '05:00',
        defaultSegments: [],
        scoreWeightHourlyRevenue: 0.4,
        scoreWeightTotalRevenue: 0.3,
        scoreWeightCustomerCount: 0.2,
        scoreWeightAttendanceRate: 0.1,
        scorePeriodDays: 30,
        rankDefaultWages: { "S": 3500, "A": 3000, "B": 2500, "C": 2000 },
        defaultCapacity: { "min1F": 5, "max1F": 6, "min2F": 3, "max2F": 4 }
      }
    });
  } else {
    console.log('Settings found. Ensuring fields...');
    const updates: any = {};
    if (!settings.rankDefaultWages) updates.rankDefaultWages = { "S": 3500, "A": 3000, "B": 2500, "C": 2000 };
    if (settings.scoreWeightHourlyRevenue === null) updates.scoreWeightHourlyRevenue = 0.4;
    // ... add more if needed
    
    if (Object.keys(updates).length > 0) {
      await prisma.storeSetting.update({
        where: { id: 'main-store' },
        data: updates
      });
      console.log('Updated settings with defaults:', updates);
    } else {
      console.log('Settings are already up to date.');
    }
  }
}

fixSettings()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

import prisma from '../lib/db';

async function recordTodayShifts() {
  const date = '2026-03-26';
  const shopId = 'love_point';

  // 1. Update Store Settings to include early segments
  console.log('Updating Store Settings...');
  const settings = await prisma.storeSetting.findUnique({ where: { id: 'main-store' } });
  if (settings) {
    const segments = [
      { id: 'SEG_14_16', label: '14:00 - 16:00' },
      { id: 'SEG_16_18', label: '16:00 - 18:00' },
      { id: 'SEG_18_20', label: '18:00 - 20:00' },
      { id: 'SEG_20_22', label: '20:00 - 22:00' },
      { id: 'SEG_22_00', label: '22:00 - 00:00' },
      { id: 'SEG_00_02', label: '00:00 - 02:00' },
      { id: 'SEG_02_05', label: '02:00 - 05:00' }
    ];
    await prisma.storeSetting.update({
      where: { id: 'main-store' },
      data: { defaultSegments: segments }
    });
  }

  // 2. Define Shift Data
  const shiftData = [
    { name: 'ねむ', start: 14, end: 22 },
    { name: 'いち', start: 14, end: 19 },
    { name: 'まりあ', start: 15, end: 23 },
    { name: 'みう', start: 15, end: 22 },
    { name: 'しゅうほ', start: 15, end: 20 },
    { name: 'ゆいたん', start: 15.5, end: 21 },
    { name: 'めん', start: 17, end: 23.5 },
    { name: 'るい', start: 18, end: 24 },
    { name: 'ふに', start: 18.5, end: 22.5 },
    { name: 'にゃんねこ', start: 21, end: 24 }
  ];

  const castMap: Record<string, string> = {
    'ねむ': 'cmmulln300004kot5sjn5o0xe',
    'いち': 'cmmw8szak000usgt5ih5jpucy',
    'まりあ': 'cmmullo4y001akot553iq6f2r',
    'みう': 'cmmullnwe0010kot5c9da4cgs',
    'しゅうほ': 'cmmulln1b0002kot5uzdmb9s4',
    'ゆいたん': 'cmmullo9t001gkot51chgpzaz',
    'めん': 'cmmullnrc000ukot5wf5mnui1',
    'るい': 'cmmullnut000ykot5huczc78t',
    'ふに': 'cmmullsv90023kot5lc7ib3z9',
    'にゃんねこ': 'cmmullo370018kot5ycigj6y4'
  };

  const segments = [
    { id: 'SEG_14_16', start: 14, end: 16 },
    { id: 'SEG_16_18', start: 16, end: 18 },
    { id: 'SEG_18_20', start: 18, end: 20 },
    { id: 'SEG_20_22', start: 20, end: 22 },
    { id: 'SEG_22_00', start: 22, end: 24 }
  ];

  // 3. Clear existing shifts for today
  console.log('Clearing existing shifts for', date);
  await prisma.shift.deleteMany({ where: { date, shopId } });

  // 4. Create new shifts
  console.log('Inserting new shifts...');
  const newShifts = [];
  for (const s of shiftData) {
    const castId = castMap[s.name];
    if (!castId) continue;

    for (const seg of segments) {
      if (s.start < seg.end && s.end > seg.start) {
        newShifts.push({
          date,
          shopId,
          segmentId: seg.id,
          castId,
          floor: s.name === 'めん' || s.name === 'しゅうほ' ? '1F' : '2F' // Dummy layout assignment
        });
      }
    }
  }

  await prisma.shift.createMany({ data: newShifts });
  console.log(`Successfully recorded ${newShifts.length} shift segments for today.`);
}

recordTodayShifts()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

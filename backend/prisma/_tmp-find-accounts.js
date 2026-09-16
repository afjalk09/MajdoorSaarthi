const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const employers = await p.user.findMany({
    where: { role: 'EMPLOYER' },
    take: 3,
    select: { email: true, employerProfile: { select: { displayName: true, isVerified: true } } }
  });
  const workers = await p.user.findMany({
    where: { role: 'WORKER', workerProfile: { is: { isVerified: true } } },
    take: 5,
    select: { email: true, workerProfile: { select: { fullName: true, roles: true, locationText: true, availability: true } } }
  });
  console.log('EMPLOYERS:');
  for (const e of employers) console.log(' ', e.email, JSON.stringify(e.employerProfile));
  console.log('VERIFIED_WORKERS:');
  for (const w of workers) console.log(' ', w.email, JSON.stringify(w.workerProfile));
  await p.$disconnect();
})();
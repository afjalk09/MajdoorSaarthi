const { PrismaClient } = require('@prisma/client');
const { STAR_MAX, STORED_MAX, normalizeReliability } = require('../src/lib/reliability');

const prisma = new PrismaClient();

// The `WorkerProfile.reliabilityScore` column is meant to hold a 0-100 value:
// review.controller.js and rating.controller.js both write `(avg / 5) * 100`.
// But the existing rows overwhelmingly hold a RAW 0-5 value (100 of 121 in the
// seeded dev database), which was written by an earlier code path or seeding.
//
// That mixed scale is not merely cosmetic — `matching.service.js` multiplies the
// column by the 0.25 reliability weight, so a worker stored as 4.8 scored 1.2
// instead of 24 and was buried at the bottom of every match list. Reads are now
// defensive (see src/lib/reliability.js); this script fixes the stored data so
// the column has a single meaning.
//
// Safe by construction: a 0-100 value is always > 5 and a 0-5 value never is,
// so `> 0 AND <= 5` selects exactly the legacy rows. 0 is left alone (unrated).
// Pass --dry-run to preview without writing.
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const legacy = await prisma.workerProfile.findMany({
    where: { reliabilityScore: { gt: 0, lte: STAR_MAX } },
    select: { id: true, fullName: true, reliabilityScore: true }
  });

  if (legacy.length === 0) {
    console.log('Nothing to backfill — every reliabilityScore is already on the 0-100 scale.');
    return;
  }

  console.log(`${legacy.length} worker(s) hold a raw 0-5 reliabilityScore:`);
  for (const w of legacy) {
    console.log(`  ${w.fullName}: ${w.reliabilityScore} -> ${normalizeReliability(w.reliabilityScore)}`);
  }

  if (DRY_RUN) {
    console.log('\n--dry-run: no rows written.');
    return;
  }

  // Grouped by distinct source value so this is a handful of UPDATE ... IN (...)
  // statements rather than 100 sequential round trips.
  const byValue = new Map();
  for (const w of legacy) {
    const key = w.reliabilityScore;
    if (!byValue.has(key)) byValue.set(key, []);
    byValue.get(key).push(w.id);
  }

  let updated = 0;
  for (const [source, ids] of byValue) {
    const target = normalizeReliability(source);
    const { count } = await prisma.workerProfile.updateMany({
      where: { id: { in: ids } },
      data: { reliabilityScore: target }
    });
    updated += count;
    console.log(`[ok] ${count} worker(s): ${source} -> ${target}`);
  }

  console.log(`\nNormalised ${updated} worker(s) to the 0-100 scale.`);
}

main()
  .catch(err => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
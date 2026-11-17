const { PrismaClient } = require("@prisma/client");
const { ROLE_NAMES } = require("../src/lib/roleNames");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding worker role taxonomy...\n");

  const existing = await prisma.workerRole.findMany({ select: { name: true } });
  const existingNames = new Set(existing.map(r => r.name));

  let created = 0;

  for (const name of ROLE_NAMES) {
    if (existingNames.has(name)) continue;
    await prisma.workerRole.create({ data: { name, active: true } });
    created++;
  }

  console.log(`Created ${created} new roles.`);
  console.log(`Total roles in DB: ${await prisma.workerRole.count()}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
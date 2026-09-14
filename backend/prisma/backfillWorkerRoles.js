const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Assign roles[] to every worker by matching their skills against the taxonomy's default skills.
async function main() {
  console.log("Backfilling worker roles from skills...\n");

  const roles = await prisma.workerRole.findMany({ select: { name: true, skills: true } });
  const profiles = await prisma.workerProfile.findMany({ select: { id: true, skills: true } });

  let updated = 0;
  let skipped = 0;

  for (const profile of profiles) {
    const workerSkills = (profile.skills || []).map(s => s.trim().toLowerCase());

    if (workerSkills.length === 0) {
      skipped++;
      continue;
    }

    const matchedRoles = roles
      .filter(role =>
        (role.skills || []).some(s => workerSkills.includes(s.trim().toLowerCase()))
      )
      .map(role => role.name);

    if (matchedRoles.length === 0) {
      skipped++;
      continue;
    }

    await prisma.workerProfile.update({
      where: { id: profile.id },
      data: { roles: matchedRoles }
    });
    updated++;
  }

  console.log(`Updated ${updated} workers with matched roles, ${skipped} left unchanged.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
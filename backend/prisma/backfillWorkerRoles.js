const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// NOTE: Worker roles are no longer derived from skills — the skills concept was
// removed from the platform (workers pick their own roles in their profile).
// This historical backfill script is now a no-op.
async function main() {
  console.log("Worker roles are set manually in profiles; no backfill needed.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
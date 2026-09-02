const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const workers = await prisma.user.findMany({
    where: { role: "WORKER" },
    take: 15,
    orderBy: { createdAt: "desc" },
    select: {
      email: true,
      workerProfile: {
        select: {
          fullName: true,
          locationText: true,
          skills: true,
          isVerified: true,
          availability: true,
        },
      },
    },
  });

  console.log("=== Sample Worker Login Credentials ===\n");
  console.log("Password for all: Worker@123\n");
  console.log("No. | Email                          | Name                  | City             | Verified | Available");
  console.log("----|--------------------------------|-----------------------|------------------|----------|----------");

  workers.forEach((w, i) => {
    const num = String(i + 1).padStart(2);
    const email = w.email.padEnd(30);
    const name = (w.workerProfile?.fullName || "N/A").padEnd(21);
    const city = (w.workerProfile?.locationText || "N/A").padEnd(16);
    const verified = (w.workerProfile?.isVerified ? "Yes" : "No").padEnd(8);
    const avail = w.workerProfile?.availability || "N/A";
    console.log(`${num}. | ${email} | ${name} | ${city} | ${verified} | ${avail}`);
  });

  console.log("\n=== Count ===");
  const total = await prisma.user.count({ where: { role: "WORKER" } });
  console.log("Total workers in DB:", total);
}

main().then(() => prisma.$disconnect());

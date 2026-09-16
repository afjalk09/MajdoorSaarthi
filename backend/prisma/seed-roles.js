const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ROLE_NAMES = [
  "Plumber",
  "Electrician",
  "CCTV Technician",
  "AC Technician",
  "Carpenter",
  "Mason",
  "Painter",
  "Welder",
  "Roofer",
  "Tile Layer",
  "Flooring Specialist",
  "Gardener",
  "Cleaner",
  "Security Guard",
  "Driver",
  "Delivery Boy",
  "Cook",
  "Baker",
  "Tailor",
  "Beautician",
  "Barber",
  "Mechanic",
  "Machine Operator",
  "Pest Control Technician",
  "Construction Worker",
  "Plasterer",
  "Glass Installer",
  "Locksmith",
  "Cobbler",
  "Printer",
  "Packaging Worker",
  "Upholsterer",
  "Jewellery Maker",
  "Mobile Repair Technician",
  "Event & Tent Setup",
  "Farm Helper",
  "Data Entry Operator",
  "Receptionist",
  "Hotel Staff",
  "Nurse Attendant",
  "Music Teacher",
  "Teacher",
  "Fitness Trainer",
  "Travel Guide",
  "Massage Therapist",
  "Quality Checker",
  "Cleaner Deep Cleaning",
  "App Developer",
];

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
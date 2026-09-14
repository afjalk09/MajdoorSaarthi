const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ROLES = [
  { name: "Plumber", skills: ["plumbing", "pipefitting"] },
  { name: "Electrician", skills: ["electrical", "wiring"] },
  { name: "CCTV Technician", skills: ["cctv installation", "network cabling"] },
  { name: "AC Technician", skills: ["ac repair", "refrigeration", "installation"] },
  { name: "Carpenter", skills: ["carpentry", "woodworking", "furniture making"] },
  { name: "Mason", skills: ["masonry", "bricklaying"] },
  { name: "Painter", skills: ["painting", "wall painting", "wallpapering"] },
  { name: "Welder", skills: ["welding", "metal fabrication", "iron fabrication"] },
  { name: "Roofer", skills: ["roofing", "waterproofing"] },
  { name: "Tile Layer", skills: ["tile laying", "flooring", "marble work", "granite fitting"] },
  { name: "Flooring Specialist", skills: ["flooring", "laminate flooring", "tile laying"] },
  { name: "Gardener", skills: ["landscaping", "gardening"] },
  { name: "Cleaner", skills: ["cleaning", "sanitation", "housekeeping", "pressure washing"] },
  { name: "Security Guard", skills: ["security", "guarding"] },
  { name: "Driver", skills: ["driving", "logistics", "transport"] },
  { name: "Delivery Boy", skills: ["delivery", "courier", "two-wheeler driving"] },
  { name: "Cook", skills: ["cooking", "food preparation", "tiffin service"] },
  { name: "Baker", skills: ["baking", "bakery work"] },
  { name: "Tailor", skills: ["tailoring", "stitching", "uniform making"] },
  { name: "Beautician", skills: ["beauty", "hairdressing", "makeup", "parlour"] },
  { name: "Barber", skills: ["barber", "haircutting", "salon"] },
  { name: "Mechanic", skills: ["mechanic", "automobile repair", "two-wheeler maintenance", "tyre repair"] },
  { name: "Machine Operator", skills: ["machine operation", "heavy equipment", "production line", "plastic molding"] },
  { name: "Pest Control Technician", skills: ["pest control", "fumigation"] },
  { name: "Construction Worker", skills: ["construction", "demolition", "scaffolding", "height work", "building work"] },
  { name: "Plasterer", skills: ["plastering", "wall finishing", "pop work", "ceiling work"] },
  { name: "Glass Installer", skills: ["glass work", "glazing", "upvc installation"] },
  { name: "Locksmith", skills: ["locksmith", "key cutting"] },
  { name: "Cobbler", skills: ["shoe repair", "cobbler work"] },
  { name: "Printer", skills: ["printing", "screen printing", "rubber stamp making", "engraving"] },
  { name: "Packaging Worker", skills: ["packaging", "warehouse work", "loading", "unloading"] },
  { name: "Upholsterer", skills: ["upholstery", "fabric repair", "sofa repair"] },
  { name: "Jewellery Maker", skills: ["jewelry repair", "polishing"] },
  { name: "Mobile Repair Technician", skills: ["mobile repair", "electronics repair"] },
  { name: "Event & Tent Setup", skills: ["tent house setup", "event decoration", "florist"] },
  { name: "Farm Helper", skills: ["agriculture", "farming", "harvesting"] },
  { name: "Data Entry Operator", skills: ["data entry", "typing", "ms office"] },
  { name: "Receptionist", skills: ["reception", "front desk", "customer service"] },
  { name: "Hotel Staff", skills: ["hotel service", "room service", "restaurant service"] },
  { name: "Nurse Attendant", skills: ["patient care", "nursing assistance", "elderly care"] },
  { name: "Music Teacher", skills: ["music", "music teaching"] },
  { name: "Teacher", skills: ["teaching", "tutoring"] },
  { name: "Fitness Trainer", skills: ["fitness training", "gym", "yoga", "personal training"] },
  { name: "Travel Guide", skills: ["travel", "tour guiding"] },
  { name: "Massage Therapist", skills: ["massage", "body massage", "physiotherapy"] },
  { name: "Quality Checker", skills: ["quality check", "inspection", "quality control"] },
  { name: "Cleaner Deep Cleaning", skills: ["deep cleaning", "pickup and drop"] },
  { name: "App Developer", skills: ["app development", "programming", "web development"] },
];

async function main() {
  console.log("Seeding worker role taxonomy...\n");

  const existing = await prisma.workerRole.findMany({ select: { name: true } });
  const existingNames = new Set(existing.map(r => r.name));

  let created = 0;
  let skipped = 0;

  for (const role of ROLES) {
    if (existingNames.has(role.name)) {
      // Update skills if the role already exists
      await prisma.workerRole.update({
        where: { name: role.name },
        data: { skills: role.skills, active: true }
      });
      skipped++;
      continue;
    }
    await prisma.workerRole.create({ data: role });
    created++;
  }

  console.log(`Created ${created} roles, updated ${skipped} existing roles.`);
  console.log(`Total roles in DB: ${await prisma.workerRole.count()}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
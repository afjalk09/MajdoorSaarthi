const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const GENERIC_ROLE_NAMES = new Set([
  "general worker", "worker", "labour", "labor", "labourer", "laborer",
  "helper", "manpower", "staff", "any worker", "workers", "work",
  "man", "men", "labourer needed", "human"
]);

// Keyword map: title keywords -> canonical taxonomy role name (order matters).
const TITLE_KEYWORDS = [
  ["cctv", "CCTV Technician"],
  ["ac ", "AC Technician"], ["air conditioner", "AC Technician"],
  ["plumb", "Plumber"],
  ["electric", "Electrician"], ["electrical", "Electrician"], ["electronic", "Electrician"],
  ["carpent", "Carpenter"], ["furniture", "Carpenter"], ["wood", "Carpenter"],
  ["mason", "Mason"], ["bricklay", "Mason"], ["brick lay", "Mason"],
  ["wall paint", "Painter"], ["paint", "Painter"], ["wallpaper", "Painter"],
  ["weld", "Welder"], ["fabrication", "Welder"], ["iron", "Welder"],
  ["roof", "Roofer"], ["waterproof", "Roofer"], ["terrace", "Roofer"],
  ["tile lay", "Tile Layer"], ["tile", "Tile Layer"], ["floor", "Tile Layer"],
  ["marble", "Tile Layer"], ["granite", "Tile Layer"],
  ["garden", "Gardener"], ["landscap", "Gardener"], ["lawn", "Gardener"],
  ["deep clean", "Cleaner"], ["clean", "Cleaner"], ["sanitat", "Cleaner"],
  ["housekeep", "Cleaner"], ["pressure wash", "Cleaner"],
  ["secur", "Security Guard"], ["guard", "Security Guard"],
  ["delivery", "Delivery Boy"], ["courier", "Delivery Boy"],
  ["driver", "Driver"], ["driving", "Driver"], ["logistics", "Driver"],
  ["cook", "Cook"], ["chef", "Cook"], ["tiffin", "Cook"],
  ["baker", "Baker"], ["bakery", "Baker"],
  ["tailor", "Tailor"], ["stitch", "Tailor"], ["uniform", "Tailor"],
  ["beauti", "Beautician"], ["parlour", "Beautician"], ["makeup", "Beautician"], ["make-up", "Beautician"],
  ["barber", "Barber"], ["salon", "Barber"],
  ["mechanic", "Mechanic"], ["tyre", "Mechanic"], ["tire", "Mechanic"], ["two wheeler", "Mechanic"], ["two-wheeler", "Mechanic"], ["bicycle", "Mechanic"],
  ["machine op", "Machine Operator"], ["mold", "Machine Operator"], ["mould", "Machine Operator"], ["production line", "Machine Operator"],
  ["pest", "Pest Control Technician"], ["fumigat", "Pest Control Technician"],
  ["construction", "Construction Worker"], ["construct", "Construction Worker"], ["build", "Construction Worker"], ["demolit", "Construction Worker"], ["scaffold", "Construction Worker"],
  ["modular kitchen", "Carpenter"], ["kitchen", "Carpenter"],
  ["car wash", "Cleaner"], ["safai", "Cleaner"],
  ["plaster", "Plasterer"], ["pop work", "Plasterer"], ["ceiling", "Plasterer"],
  ["glass", "Glass Installer"], ["glaz", "Glass Installer"], ["upvc", "Glass Installer"],
  ["lock", "Locksmith"],
  ["shoe", "Cobbler"], ["cobbl", "Cobbler"],
  ["print", "Printer"], ["rubber stamp", "Printer"],
  ["packag", "Packaging Worker"], ["warehouse", "Packaging Worker"], ["load", "Packaging Worker"], ["unload", "Packaging Worker"],
  ["upholst", "Upholsterer"], ["sofa", "Upholsterer"],
  ["jewel", "Jewellery Maker"], ["polish", "Jewellery Maker"],
  ["mobile", "Mobile Repair Technician"], ["phone", "Mobile Repair Technician"],
  ["tent", "Event & Tent Setup"], ["event", "Event & Tent Setup"], ["wedding", "Event & Tent Setup"], ["decorat", "Event & Tent Setup"], ["florist", "Event & Tent Setup"],
  ["farm", "Farm Helper"], ["harvest", "Farm Helper"], ["agriculture", "Farm Helper"], ["plant", "Farm Helper"], ["vendor", "Farm Helper"], ["fruit", "Farm Helper"], ["vegetable", "Farm Helper"], ["grocery", "Farm Helper"], ["tea stall", "Farm Helper"],
  ["data entry", "Data Entry Operator"], ["data-entry", "Data Entry Operator"],
  ["reception", "Receptionist"], ["front desk", "Receptionist"],
  ["hotel", "Hotel Staff"], ["restaurant", "Hotel Staff"], ["waiter", "Hotel Staff"], ["food portal", "Hotel Staff"],
  ["nurse", "Nurse Attendant"], ["patient", "Nurse Attendant"], ["care taker", "Nurse Attendant"], ["caretaker", "Nurse Attendant"], ["elderly", "Nurse Attendant"],
  ["music", "Music Teacher"],
  ["teacher", "Teacher"], ["teaching", "Teacher"], ["tutor", "Teacher"],
  ["yoga", "Fitness Trainer"], ["gym", "Fitness Trainer"], ["trainer", "Fitness Trainer"], ["instructor", "Fitness Trainer"], ["coach", "Fitness Trainer"],
  ["travel guide", "Travel Guide"], ["tour", "Travel Guide"],
  ["massage", "Massage Therapist"],
  ["quality", "Quality Checker"], ["checker", "Quality Checker"], ["inspector", "Quality Checker"],
  ["hardware", "Data Entry Operator"], ["salesman", "Receptionist"],
  ["app developer", "App Developer"], ["developer", "App Developer"],
];

function deriveRoleName(title) {
  const t = (title || "").trim().toLowerCase();
  if (!t) return null;
  for (const [keyword, roleName] of TITLE_KEYWORDS) {
    if (t.includes(keyword)) return roleName;
  }
  return null;
}

async function main() {
  console.log("Backfilling generic job role names from job titles...\n");

  const jobs = await prisma.job.findMany({
    where: { jobRoles: { some: {} } },
    include: { jobRoles: true }
  });

  let renamed = 0;
  let merged = 0;
  let skipped = 0;

  for (const job of jobs) {
    const genericRoles = job.jobRoles.filter(r => GENERIC_ROLE_NAMES.has(r.roleName.trim().toLowerCase()));
    if (genericRoles.length === 0) continue;

    const derived = deriveRoleName(job.title);
    if (!derived) {
      console.log(`[skip] ${job.title} -> no role derived from title`);
      skipped++;
      continue;
    }

    let canonical = job.jobRoles.find(r =>
      r.roleName.trim().toLowerCase() === derived.toLowerCase() && !genericRoles.includes(r)
    );

    if (canonical) {
      // Merge generic roles into the existing canonical role.
      const totalCount = genericRoles.reduce((sum, r) => sum + r.count, 0) + canonical.count;
      await prisma.jobRole.update({
        where: { id: canonical.id },
        data: { count: totalCount }
      });
      for (const role of genericRoles) {
        await reassignAndDelete(job.id, role, canonical.id);
      }
      merged++;
    } else {
      // Rename the first generic role to the canonical name, merge the rest into it.
      canonical = genericRoles[0];
      await prisma.jobRole.update({
        where: { id: canonical.id },
        data: { roleName: derived }
      });
      const rest = genericRoles.slice(1);
      if (rest.length > 0) {
        const totalCount = canonical.count + rest.reduce((sum, r) => sum + r.count, 0);
        await prisma.jobRole.update({
          where: { id: canonical.id },
          data: { count: totalCount }
        });
        for (const role of rest) {
          await reassignAndDelete(job.id, role, canonical.id);
        }
      }
      renamed++;
    }

    console.log(`[ok] ${job.title} -> ${derived} (${job.id})`);
  }

  console.log(`\nRenamed/merged ${renamed + merged} jobs, skipped ${skipped}.`);
  console.log("Note: job role filledCounts will be recomputed by the running app; run the worker-role backfill too.");
}

async function reassignAndDelete(jobId, role, targetRoleId) {
  // Re-point applications to the surviving role, then delete the duplicate.
  await prisma.jobApplication.updateMany({
    where: { jobRoleId: role.id },
    data: { jobRoleId: targetRoleId }
  });
  await prisma.jobRole.delete({ where: { id: role.id } });
  merged++;
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
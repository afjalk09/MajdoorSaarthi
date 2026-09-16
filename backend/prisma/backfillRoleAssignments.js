const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Assign a role to every legacy HIRED/COMPLETED application that was created
// without a jobRoleId (e.g. hires via the old "Browse Workers" flow). This makes
// per-role filledCount reflect the real staff, instead of leaving roles stuck at 0/x.
async function main() {
  const apps = await prisma.jobApplication.findMany({
    where: { status: { in: ['HIRED', 'COMPLETED'] }, jobRoleId: null },
    include: { worker: true, job: { include: { jobRoles: true } } }
  });

  const byJob = new Map();
  for (const app of apps) {
    if (!byJob.has(app.jobId)) byJob.set(app.jobId, { job: app.job, list: [] });
    byJob.get(app.jobId).list.push(app);
  }

  let updated = 0;
  const touchedJobs = new Set();

  for (const { job, list } of byJob.values()) {
    const existing = await prisma.jobApplication.groupBy({
      by: ['jobRoleId'],
      where: {
        jobId: job.id,
        status: { in: ['HIRED', 'COMPLETED'] },
        NOT: { jobRoleId: null }
      },
      _count: { jobRoleId: true }
    });

    const used = {};
    existing.forEach(g => { used[g.jobRoleId] = g._count.jobRoleId; });

    for (const app of list) {
      const available = job.jobRoles.filter(r => (used[r.id] || 0) < r.count);
      if (available.length === 0) {
        console.log(`[skip] ${app.id}: no free slot in job ${job.id}`);
        continue;
      }

      const workerRoles = (app.worker?.roles || []).map(r => r.toLowerCase());
      let best = available.find(r =>
        workerRoles.includes((r.roleName || '').toLowerCase())
      );

      if (!best) {
        best = available.reduce((a, b) =>
          (b.count - (used[b.id] || 0)) > (a.count - (used[a.id] || 0)) ? b : a
        );
      }

      await prisma.jobApplication.update({
        where: { id: app.id },
        data: { jobRoleId: best.id }
      });

      used[best.id] = (used[best.id] || 0) + 1;
      updated++;
      touchedJobs.add(job.id);
      console.log(`[ok] ${app.id} -> ${best.roleName} (job ${job.id})`);
    }
  }

  // Recompute stored filledCount for every affected job so dashboards are accurate
  for (const jobId of touchedJobs) {
    const hired = await prisma.jobApplication.findMany({
      where: { jobId, status: { in: ['HIRED', 'COMPLETED'] } },
      select: { jobRoleId: true }
    });

    const perRole = {};
    hired.forEach(a => {
      if (a.jobRoleId) perRole[a.jobRoleId] = (perRole[a.jobRoleId] || 0) + 1;
    });

    const roles = await prisma.jobRole.findMany({ where: { jobId } });
    await Promise.all(roles.map(role =>
      prisma.jobRole.update({
        where: { id: role.id },
        data: { filledCount: perRole[role.id] || 0 }
      })
    ));
  }

  console.log(`Assigned roles to ${updated} legacy application(s); recomputed ${touchedJobs.size} job(s).`);
}

main()
  .catch(err => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
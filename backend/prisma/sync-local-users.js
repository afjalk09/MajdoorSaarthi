require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const sourceUrl = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL;

if (!sourceUrl) {
  console.error('SOURCE_DATABASE_URL (or DATABASE_URL in backend/.env) is required.');
  process.exit(1);
}
if (!targetUrl) {
  console.error('TARGET_DATABASE_URL is required. Set it to the Neon connection string from the Render dashboard, e.g. $env:TARGET_DATABASE_URL="postgres://..."');
  process.exit(1);
}
if (sourceUrl === targetUrl) {
  console.error('Source and target databases must be different.');
  process.exit(1);
}

const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
const target = new PrismaClient({ datasources: { db: { url: targetUrl } } });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry(fn, label) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const retryable = /Can't reach database server|timed out|P1001|P1002|ECONNRESET|ETIMEDOUT/i.test(error.message);
      if (!retryable || attempt === 6) throw error;
      console.log(`Retrying ${label} (${attempt}/6): ${error.message.split('\n')[0]}`);
      await sleep(attempt * 1500);
    }
  }
}

async function main() {
  const users = await source.user.findMany({ orderBy: { createdAt: 'asc' } });
  const targetUsers = await target.user.findMany({ select: { id: true, email: true, phone: true } });
  const byEmail = new Map(targetUsers.map((u) => [u.email, u]));
  const byPhone = new Map(targetUsers.map((u) => [u.phone, u]));
  const idMap = new Map();
  const warnings = [];
  let created = 0;
  let updated = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    try {
      const existing = byEmail.get(user.email);
      const phoneOwner = byPhone.get(user.phone);

      let phone = user.phone;
      if (!existing && phoneOwner) {
        phone = `sync-${user.id}`;
        while (byPhone.has(phone)) phone = `${phone}-x`;
        warnings.push(`${user.email}: source phone ${user.phone} is taken by ${phoneOwner.email} in target - used ${phone}`);
      }

      const data = {
        passwordHash: user.passwordHash,
        role: user.role
      };
      if (!existing) data.phone = phone;
      else if (phoneOwner?.id === existing.id) data.phone = user.phone;

      const saved = await withRetry(() =>
        existing
          ? target.user.update({ where: { id: existing.id }, data })
          : target.user.create({
              data: { id: user.id, email: user.email, createdAt: user.createdAt, ...data }
            }), user.email);

      if (existing && phoneOwner && phoneOwner.id !== existing.id) {
        warnings.push(`${user.email}: kept target phone ${existing.phone} (source phone ${user.phone} is taken)`);
      }

      byEmail.set(saved.email, saved);
      byPhone.set(saved.phone, saved);
      idMap.set(user.id, saved.id);
      if (existing) updated++;
      else created++;
    } catch (error) {
      warnings.push(`${user.email}: ${error.message}`);
    }
    if ((i + 1) % 50 === 0) console.log(`Users processed: ${i + 1}/${users.length}`);
  }

  const workerProfiles = await source.workerProfile.findMany();
  let workersCopied = 0;
  for (let i = 0; i < workerProfiles.length; i++) {
    const profile = workerProfiles[i];
    const userId = idMap.get(profile.userId);
    if (!userId) continue;
    try {
      const { id, userId: sourceUserId, createdAt, updatedAt, ...data } = profile;
      await withRetry(() => target.workerProfile.upsert({
        where: { userId },
        create: { ...data, userId, createdAt, updatedAt },
        update: data
      }), `worker profile ${profile.fullName}`);
      workersCopied++;
    } catch (error) {
      warnings.push(`worker profile ${profile.fullName}: ${error.message}`);
    }
    if ((i + 1) % 50 === 0) console.log(`Worker profiles processed: ${i + 1}/${workerProfiles.length}`);
  }

  const employerProfiles = await source.employerProfile.findMany();
  let employersCopied = 0;
  for (let i = 0; i < employerProfiles.length; i++) {
    const profile = employerProfiles[i];
    const userId = idMap.get(profile.userId);
    if (!userId) continue;
    try {
      const { id, userId: sourceUserId, createdAt, updatedAt, ...data } = profile;
      await withRetry(() => target.employerProfile.upsert({
        where: { userId },
        create: { ...data, userId, createdAt, updatedAt },
        update: data
      }), `employer profile ${profile.displayName}`);
      employersCopied++;
    } catch (error) {
      warnings.push(`employer profile ${profile.displayName}: ${error.message}`);
    }
    if ((i + 1) % 50 === 0) console.log(`Employer profiles processed: ${i + 1}/${employerProfiles.length}`);
  }

  console.log(`Users: ${created} created, ${updated} updated, ${warnings.length} warning(s)`);
  console.log(`Profiles: ${workersCopied} worker, ${employersCopied} employer`);
  if (warnings.length) console.log(warnings.join('\n'));
}

main()
  .then(async () => {
    await source.$disconnect();
    await target.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await source.$disconnect();
    await target.$disconnect();
    process.exit(1);
  });

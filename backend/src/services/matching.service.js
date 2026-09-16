const prisma = require('../lib/prisma');

const normalizeLocation = (location) => (location || '').trim().toLowerCase();

const generateReasons = (worker, job, scores) => {
  const reasons = [];
  if (scores.roleName) {
    reasons.push(`Role match: ${scores.roleName}`);
  } else {
    reasons.push(`General worker — no exact role match`);
  }
  reasons.push(`${worker.experienceYears || 0} years experience`);
  reasons.push(`Reliability: ${worker.reliabilityScore || 0}/100`);

  const avgExpected = ((worker.expectedWageMin || 0) + (worker.expectedWageMax || 0)) / 2;
  reasons.push(`Wage ₹${job.wageAmount} vs expected ₹${Math.round(avgExpected)}`);
  reasons.push(`Location match: ${job.locationText || 'N/A'}`);

  return reasons;
};

// Role match score (0-100): how well the worker's profile roles line up with the
// job's role requirements. 100 when the worker holds one of the required roles.
const roleMatchScore = (worker, job) => {
  const workerRoles = (worker.roles || []).map(r => r.toLowerCase());
  const jobRoleNames = (job.jobRoles || []).map(r => (r.roleName || '').toLowerCase());
  const matched = jobRoleNames.filter(name => workerRoles.includes(name));
  if (matched.length === 0) return { score: 0, roleName: null };
  return { score: 100, roleName: (job.jobRoles || []).find(r =>
    workerRoles.includes((r.roleName || '').toLowerCase())
  ).roleName };
};

exports.findMatches = async (job) => {
  const workers = await prisma.workerProfile.findMany({
    where: {
      isVerified: true,
      availability: 'AVAILABLE'
    }
  });

  const matches = [];

  for (const worker of workers) {
    // Hard filter: location is an exact text match
    const jobLocation = normalizeLocation(job.locationText);
    if (!jobLocation || normalizeLocation(worker.locationText) !== jobLocation) continue;

    const experienceScore = Math.min(((worker.experienceYears || 0) / 10) * 100, 100);

    const reliabilityScore = worker.reliabilityScore || 0;

    const avgExpected = ((worker.expectedWageMin || 0) + (worker.expectedWageMax || 0)) / 2;
    const wageDiff = Math.abs(job.wageAmount - avgExpected);
    const wageScore = avgExpected > 0 ? Math.max(0, 100 - (wageDiff / avgExpected) * 100) : 50;

    const proximityScore = 100;

    const roleMatch = roleMatchScore(worker, job);

    const totalScore = (
      roleMatch.score * 0.30 +
      reliabilityScore * 0.25 +
      experienceScore * 0.15 +
      wageScore * 0.15 +
      proximityScore * 0.15
    );

    matches.push({
      worker_id: worker.id,
      full_name: worker.fullName,
      roles: worker.roles || [],
      experience_years: worker.experienceYears,
      reliability_score: worker.reliabilityScore,
      location_text: worker.locationText,
      role_match: roleMatch.roleName,
      match_score: Math.round(totalScore * 100) / 100,
      match_reasons: generateReasons(worker, job, {
        experienceScore, reliabilityScore, wageScore,
        proximityScore, roleName: roleMatch.roleName, roleScore: roleMatch.score
      })
    });
  }

  matches.sort((a, b) => b.match_score - a.match_score);

  return matches;
};

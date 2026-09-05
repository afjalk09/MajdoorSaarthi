const prisma = require('../lib/prisma');

const normalizeLocation = (location) => (location || '').trim().toLowerCase();

const generateReasons = (worker, job, scores) => {
  const reasons = [];
  const matchedSkills = (job.requiredSkills || []).filter(s => (worker.skills || []).includes(s));
  reasons.push(`${matchedSkills.length} of ${(job.requiredSkills || []).length} skills match (${Math.round(scores.skillScore)}%)`);
  reasons.push(`${worker.experienceYears || 0} years experience`);
  reasons.push(`Reliability: ${worker.reliabilityScore || 0}/100`);

  const avgExpected = ((worker.expectedWageMin || 0) + (worker.expectedWageMax || 0)) / 2;
  reasons.push(`Wage ₹${job.wageAmount} vs expected ₹${Math.round(avgExpected)}`);
  reasons.push(`Location match: ${job.locationText || 'N/A'}`);

  return reasons;
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
    // Hard filter: skills overlap
    const hasMatchingSkills = (job.requiredSkills || []).some(
      skill => (worker.skills || []).includes(skill)
    );
    if (!hasMatchingSkills) continue;

    // Hard filter: location is an exact text match
    const jobLocation = normalizeLocation(job.locationText);
    if (!jobLocation || normalizeLocation(worker.locationText) !== jobLocation) continue;

    // Calculate scores
    const matchedSkills = (job.requiredSkills || []).filter(s => (worker.skills || []).includes(s));
    const skillScore = (matchedSkills.length / (job.requiredSkills || []).length) * 100;

    const experienceScore = Math.min(((worker.experienceYears || 0) / 10) * 100, 100);

    const reliabilityScore = worker.reliabilityScore || 0;

    const avgExpected = ((worker.expectedWageMin || 0) + (worker.expectedWageMax || 0)) / 2;
    const wageDiff = Math.abs(job.wageAmount - avgExpected);
    const wageScore = avgExpected > 0 ? Math.max(0, 100 - (wageDiff / avgExpected) * 100) : 50;

    const proximityScore = 100;

    const totalScore = (
      skillScore * 0.30 +
      experienceScore * 0.15 +
      reliabilityScore * 0.25 +
      wageScore * 0.15 +
      proximityScore * 0.15
    );

    matches.push({
      worker_id: worker.id,
      full_name: worker.fullName,
      skills: worker.skills,
      experience_years: worker.experienceYears,
      reliability_score: worker.reliabilityScore,
      location_text: worker.locationText,
      match_score: Math.round(totalScore * 100) / 100,
      match_reasons: generateReasons(worker, job, {
        skillScore, experienceScore, reliabilityScore, wageScore, proximityScore
      })
    });
  }

  matches.sort((a, b) => b.match_score - a.match_score);

  return matches;
};

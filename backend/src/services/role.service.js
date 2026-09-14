const prisma = require('../lib/prisma');

// All active taxonomy roles with their default skills
const getAllRoles = async () => {
  return prisma.workerRole.findMany({
    where: { active: true },
    orderBy: { name: 'asc' }
  });
};

// Case-insensitive check whether a role name exists in the taxonomy
const isValidRoleName = async (name) => {
  if (!name || !name.trim()) return false;
  const role = await prisma.workerRole.findFirst({
    where: { name: { equals: name.trim(), mode: 'insensitive' }, active: true },
    select: { name: true }
  });
  return !!role;
};

// Taxonomy role names whose default skills overlap the worker's skills
const rolesForSkills = async (skills = []) => {
  const workerSkills = skills.map(s => s.trim().toLowerCase());
  const roles = await prisma.workerRole.findMany({ where: { active: true } });
  return roles
    .filter(role => (role.skills || []).some(s => workerSkills.includes(s.trim().toLowerCase())))
    .map(role => role.name);
};

// Canonical role name for a given (case-insensitive) raw name, if it exists
const canonicalRoleName = (roles, rawName) => {
  const name = (rawName || '').trim();
  if (!name) return null;
  return roles.find(r => r.name.toLowerCase() === name.toLowerCase())?.name || null;
};

// Union of taxonomy default skills for a set of role names
const suggestSkillsForRoles = async (roleNames = []) => {
  const names = roleNames.filter(Boolean).map(n => n.trim());
  if (names.length === 0) return [];
  const roles = await prisma.workerRole.findMany({
    where: {
      name: { in: names },
      active: true
    },
    select: { skills: true }
  });
  return [...new Set(roles.flatMap(r => r.skills || []))];
};

module.exports = {
  getAllRoles,
  isValidRoleName,
  rolesForSkills,
  canonicalRoleName,
  suggestSkillsForRoles
};
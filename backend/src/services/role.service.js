const prisma = require('../lib/prisma');

// All active taxonomy roles
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

// Canonical role name for a given (case-insensitive) raw name, if it exists
const canonicalRoleName = (roles, rawName) => {
  const name = (rawName || '').trim();
  if (!name) return null;
  return roles.find(r => r.name.toLowerCase() === name.toLowerCase())?.name || null;
};

module.exports = {
  getAllRoles,
  isValidRoleName,
  canonicalRoleName
};
const prisma = require('./prisma');
const { ROLE_NAMES } = require('./roleNames');

let rolesReady = null;

const ensureRoles = () => {
  if (!rolesReady) {
    rolesReady = prisma.workerRole
      .createMany({
        data: ROLE_NAMES.map((name) => ({ name, active: true })),
        skipDuplicates: true
      })
      .then(() => true)
      .catch((error) => {
        rolesReady = null;
        throw error;
      });
  }
  return rolesReady;
};

module.exports = { ROLE_NAMES, ensureRoles };

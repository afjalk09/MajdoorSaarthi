const roleService = require('../services/role.service');

exports.getRoles = async (req, res, next) => {
  try {
    const roles = await roleService.getAllRoles();
    res.json({ success: true, data: roles });
  } catch (error) {
    next(error);
  }
};
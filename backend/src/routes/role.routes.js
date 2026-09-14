const express = require('express');
const router = express.Router();
const roleController = require('../controllers/role.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/', authenticate, roleController.getRoles);

module.exports = router;
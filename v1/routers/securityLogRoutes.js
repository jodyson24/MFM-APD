const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');
const { applyScope } = require('../../middlewares/scope');
const { getSessions, getUserActivityLog, getAuditLog } = require('../controllers/securityLogController');

router.use(authenticate, applyScope);

// §8.4 Security Log — sessions + action feed (super admin sees all; mega region admins scoped)
router.get('/sessions', getSessions);
router.get('/activity-log', getUserActivityLog);
router.get('/audit-log', getAuditLog);

module.exports = router;

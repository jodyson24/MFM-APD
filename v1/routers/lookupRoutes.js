const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');
const { applyScope } = require('../../middlewares/scope');
const {
  getDivisions,
  getActivityTypes,
  getStrategicInitiatives,
  getOrgUnitTree,
} = require('../controllers/lookupController');

router.use(authenticate, applyScope);

router.get('/divisions', getDivisions);
router.get('/activity-types', getActivityTypes);
router.get('/strategic-initiatives', getStrategicInitiatives);
router.get('/org-unit-tree', getOrgUnitTree);

module.exports = router;

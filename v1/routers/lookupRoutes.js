const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');
const { applyScope } = require('../../middlewares/scope');
const {
  getDivisions,
  getActivityCategories,
  getActivityTypes,
  getWeeklyMetricTypes,
  getStrategicInitiatives,
  getOrgUnitTree,
} = require('../controllers/lookupController');

router.use(authenticate, applyScope);

router.get('/divisions', getDivisions);
router.get('/activity-categories', getActivityCategories);
router.get('/activity-types', getActivityTypes);
router.get('/weekly-metric-types', getWeeklyMetricTypes);
router.get('/strategic-initiatives', getStrategicInitiatives);
router.get('/org-unit-tree', getOrgUnitTree);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');
const { applyScope } = require('../../middlewares/scope');
const { cacheable } = require('../../middlewares/cache');
const {
  getDivisions,
  getActivityCategories,
  getActivityTypes,
  getWeeklyMetricTypes,
  getStrategicInitiatives,
  getOrgUnitTree,
} = require('../controllers/lookupController');

router.use(authenticate, applyScope);

// Global catalogs: same for every user, so no scope key.
router.get('/divisions', cacheable({ ttl: 3600, ns: 'lookups', scopeKey: false }), getDivisions);
router.get('/activity-categories', cacheable({ ttl: 3600, ns: 'lookups', scopeKey: false }), getActivityCategories);
router.get('/activity-types', cacheable({ ttl: 3600, ns: 'lookups', scopeKey: false }), getActivityTypes);
router.get('/weekly-metric-types', cacheable({ ttl: 3600, ns: 'lookups', scopeKey: false }), getWeeklyMetricTypes);
router.get('/strategic-initiatives', cacheable({ ttl: 3600, ns: 'lookups', scopeKey: false }), getStrategicInitiatives);
router.get('/org-unit-tree', cacheable({ ttl: 300, ns: 'lookups', scopeKey: false }), getOrgUnitTree);

module.exports = router;

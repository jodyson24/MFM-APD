const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');
const { applyScope } = require('../../middlewares/scope');
const { cacheable } = require('../../middlewares/cache');
const { validate } = require('../../middlewares/validation');
const { z } = require('zod');
const {
  submitWeeklyMetric,
  getWeeklyMetrics,
  getWeeklyAggregates,
  getWeeklyMetricTypes,
} = require('../controllers/weeklyMetricController');

const weeklyMetricSchema = z.object({
  orgUnitId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  weeklyMetricTypeId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  weekStartDate: z.string().datetime(),
  value: z.union([z.number(), z.array(z.object({
    divisionId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    count: z.number(),
  }))]),
});

router.use(authenticate, applyScope);

router.post('/', validate(weeklyMetricSchema), submitWeeklyMetric);
router.get('/types', cacheable({ ttl: 3600, ns: 'lookups', scopeKey: false }), getWeeklyMetricTypes);
router.get('/', cacheable({ ttl: 60, ns: 'weekly-metrics' }), getWeeklyMetrics);
router.get('/aggregates', cacheable({ ttl: 60, ns: 'weekly-metrics' }), getWeeklyAggregates);

module.exports = router;
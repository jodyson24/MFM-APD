const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');
const { applyScope } = require('../../middlewares/scope');
const { validate } = require('../../middlewares/validation');
const { z } = require('zod');
const {
  submitWeeklyMetric,
  getWeeklyMetrics,
  getWeeklyAggregates,
} = require('../controllers/weeklyMetricController');

const weeklyMetricSchema = z.object({
  orgUnitId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  metricKey: z.string().min(1),
  weekStartDate: z.string().datetime(),
  value: z.number(),
});

router.use(authenticate, applyScope);

router.post('/', validate(weeklyMetricSchema), submitWeeklyMetric);
router.get('/', getWeeklyMetrics);
router.get('/aggregates', getWeeklyAggregates);

module.exports = router;
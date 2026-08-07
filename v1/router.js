const express = require('express');
const router = express.Router();

const authRoutes = require('./routers/authRoutes');
const userRoutes = require('./routers/userRoutes');
const activityRoutes = require('./routers/activityRoutes');
const orgUnitRoutes = require('./routers/orgUnitRoutes');
const complianceRoutes = require('./routers/complianceRoutes');
const weeklyMetricRoutes = require('./routers/weeklyMetricRoutes');
const analyticsRoutes = require('./routers/analyticsRoutes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/activities', activityRoutes);
router.use('/org-units', orgUnitRoutes);
router.use('/compliance', complianceRoutes);
router.use('/weekly-metrics', weeklyMetricRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
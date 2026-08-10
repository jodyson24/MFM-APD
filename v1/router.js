const express = require('express');
const router = express.Router();

const authRoutes = require('./routers/authRoutes');
const userRoutes = require('./routers/userRoutes');
const activityRoutes = require('./routers/activityRoutes');
const orgUnitRoutes = require('./routers/orgUnitRoutes');
const complianceRoutes = require('./routers/complianceRoutes');
const weeklyMetricRoutes = require('./routers/weeklyMetricRoutes');
const analyticsRoutes = require('./routers/analyticsRoute');
const presentationCycleRoutes = require('./routers/presentationCycleRoutes');
const lookupRoutes = require('./routers/lookupRoutes');
const publicRoutes = require('./routers/publicRoutes');
const exportRoutes = require('./routers/exportRoutes');
const securityLogRoutes = require('./routers/securityLogRoutes');
const uploadRoutes = require('./routers/uploadRoutes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/activities', activityRoutes);
router.use('/org-units', orgUnitRoutes);
router.use('/compliance', complianceRoutes);
router.use('/weekly-metrics', weeklyMetricRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/presentation-cycles', presentationCycleRoutes);
router.use('/lookups', lookupRoutes);
router.use('/public', publicRoutes);
router.use('/export', exportRoutes);
router.use('/security', securityLogRoutes);
router.use('/uploads', uploadRoutes);

module.exports = router;

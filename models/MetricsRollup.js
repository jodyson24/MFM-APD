const mongoose = require('mongoose');

const metricsRollupSchema = new mongoose.Schema({
  orgUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrgUnit', required: true },
  activityTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ActivityType', required: true },
  divisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', default: null },
  periodLabel: { type: String, required: true },
  metricKey: { type: String, required: true },
  metricValue: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

metricsRollupSchema.index({ orgUnitId: 1, activityTypeId: 1, periodLabel: 1 });

module.exports = mongoose.model('MetricsRollup', metricsRollupSchema);
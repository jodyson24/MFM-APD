const mongoose = require('mongoose');

const weeklyMetricSchema = new mongoose.Schema({
  orgUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrgUnit', required: true },
  metricKey: { type: String, required: true, trim: true },
  weekStartDate: { type: Date, required: true },
  value: { type: Number, required: true },
  submittedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  submittedAt: { type: Date, default: Date.now },
});

weeklyMetricSchema.index({ orgUnitId: 1, metricKey: 1, weekStartDate: 1 });

module.exports = mongoose.model('WeeklyMetric', weeklyMetricSchema);
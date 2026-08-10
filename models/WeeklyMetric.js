const mongoose = require('mongoose');

const weeklyMetricSchema = new mongoose.Schema({
  orgUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrgUnit', required: true },
  weeklyMetricTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WeeklyMetricType',
    required: true,
  }, // replaces the old free-form metricKey string (ACTIVITY_MODEL.md §7)
  weekStartDate: { type: Date, required: true, index: true },
  // Value shape depends on the metric type: either a plain number or a breakdown
  // array like { divisionId, count } for weekly_attendance_by_division.
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  submittedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  submittedAt: { type: Date, default: Date.now },
});

weeklyMetricSchema.index({ orgUnitId: 1, weeklyMetricTypeId: 1, weekStartDate: 1 });

module.exports = mongoose.model('WeeklyMetric', weeklyMetricSchema);
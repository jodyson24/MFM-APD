const mongoose = require('mongoose');

const complianceStatusSchema = new mongoose.Schema({
  orgUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrgUnit', required: true },
  divisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', default: null },
  activityCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ActivityCategory', required: true },
  periodLabel: { type: String, required: true },
  requiredCount: { type: Number, default: null },
  actualCount: { type: Number, default: 0 },
  // §10 three-way distinction: completed / explained-not-held / silence (no follow-up)
  notHeldCount: { type: Number, default: 0 },
  missingFollowUpCount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['ok', 'shortfall', 'not_applicable'],
    default: 'not_applicable',
  },
  lastEvaluatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

complianceStatusSchema.index({ orgUnitId: 1, divisionId: 1, activityCategoryId: 1, periodLabel: 1 }, { unique: true });

module.exports = mongoose.model('ComplianceStatus', complianceStatusSchema);

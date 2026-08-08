const mongoose = require('mongoose');

const complianceStatusSchema = new mongoose.Schema({
  orgUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrgUnit', required: true },
  divisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', default: null },
  activityTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ActivityType', required: true },
  periodLabel: { type: String, required: true },
  requiredCount: { type: Number, default: null },
  actualCount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['ok', 'shortfall', 'not_applicable'],
    default: 'not_applicable',
  },
  lastEvaluatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

complianceStatusSchema.index({ orgUnitId: 1, divisionId: 1, activityTypeId: 1, periodLabel: 1 }, { unique: true });

module.exports = mongoose.model('ComplianceStatus', complianceStatusSchema);

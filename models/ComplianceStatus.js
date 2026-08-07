const mongoose = require('mongoose');

const complianceRuleSchema = new mongoose.Schema({
  orgLevel: {
    type: String,
    enum: ['mega_region', 'region', 'zone', 'branch'],
    required: true,
  },
  divisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', default: null }, // null = applies regardless of division
  activityTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ActivityType', required: true },
  requiredCountPerPeriod: { type: Number, default: null }, // null = informational only
  periodType: {
    type: String,
    enum: ['monthly', 'bi-monthly', 'quarterly', 'half-year'],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ComplianceRule', complianceRuleSchema);
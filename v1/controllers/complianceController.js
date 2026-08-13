const ComplianceRule = require('../../models/ComplianceRule');
const ComplianceStatus = require('../../models/ComplianceStatus');
const ActivityType = require('../../models/ActivityType');
const OrgUnit = require('../../models/OrgUnit');
const { isSuperAdmin, isManagementUser } = require('../../lib/permissions');
const { applyScope } = require('../../middlewares/scope');

// Get all compliance rules (scope-limited)
exports.getComplianceRules = async (req, res, next) => {
  try {
    // Only management users can see all rules
    if (!isManagementUser(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const rules = await ComplianceRule.find()
      .populate('divisionId', 'name code')
      .populate('activityCategoryId', 'name code tier');
    res.json(rules);
  } catch (error) {
    next(error);
  }
};

// Create a compliance rule (super admin only)
exports.createComplianceRule = async (req, res, next) => {
  try {
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ message: 'Only super admin can manage rules' });
    }
    const { orgLevel, divisionId, activityCategoryId, requiredCountPerPeriod, periodType } = req.body;
    const rule = new ComplianceRule({
      orgLevel,
      divisionId: divisionId || null,
      activityCategoryId,
      requiredCountPerPeriod,
      periodType,
    });
    await rule.save();
    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
};

// Update compliance rule (super admin only)
exports.updateComplianceRule = async (req, res, next) => {
  try {
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ message: 'Only super admin can manage rules' });
    }
    const rule = await ComplianceRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ message: 'Rule not found' });
    }
    const { orgLevel, divisionId, activityCategoryId, requiredCountPerPeriod, periodType } = req.body;
    if (orgLevel) rule.orgLevel = orgLevel;
    if (divisionId !== undefined) rule.divisionId = divisionId || null;
    if (activityCategoryId) rule.activityCategoryId = activityCategoryId;
    if (requiredCountPerPeriod !== undefined) rule.requiredCountPerPeriod = requiredCountPerPeriod;
    if (periodType) rule.periodType = periodType;
    await rule.save();
    res.json(rule);
  } catch (error) {
    next(error);
  }
};

// Delete compliance rule (super admin only)
exports.deleteComplianceRule = async (req, res, next) => {
  try {
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ message: 'Only super admin can manage rules' });
    }
    const rule = await ComplianceRule.findByIdAndDelete(req.params.id);
    if (!rule) {
      return res.status(404).json({ message: 'Rule not found' });
    }
    res.json({ message: 'Rule deleted' });
  } catch (error) {
    next(error);
  }
};

// Get compliance status for the current user's scope (with optional filters)
exports.getComplianceStatus = async (req, res, next) => {
  try {
    // Determine which org units the user can see
    let orgUnitIds = req.scope.orgUnitIds;
    if (req.user.isSuperAdmin) {
      // Super admin can see all; we'll fetch all org unit IDs
      const allUnits = await OrgUnit.find().select('_id').lean();
      orgUnitIds = allUnits.map(u => u._id);
    }

    const filter = { orgUnitId: { $in: orgUnitIds } };
    if (req.query.activityCategoryId) filter.activityCategoryId = req.query.activityCategoryId;
    if (req.query.divisionId) filter.divisionId = req.query.divisionId;
    if (req.query.periodLabel) filter.periodLabel = req.query.periodLabel;
    // default to latest period? we'll get all

    const statuses = await ComplianceStatus.find(filter)
      .populate('orgUnitId', 'name type')
      .populate('divisionId', 'name code')
      .populate('activityCategoryId', 'name code tier')
      .sort({ lastEvaluatedAt: -1 });

    // Also compute aggregated shortfall count per org unit for display
    const summary = {};
    for (const s of statuses) {
      const key = s.orgUnitId._id.toString();
      if (!summary[key]) {
        summary[key] = { orgUnit: s.orgUnitId, total: 0, shortfalls: 0, details: [] };
      }
      summary[key].total++;
      if (s.status === 'shortfall') summary[key].shortfalls++;
      summary[key].details.push(s);
    }

    res.json({
      statuses,
      summary: Object.values(summary),
    });
  } catch (error) {
    next(error);
  }
};

// Trigger compliance check manually (admin only)
exports.triggerComplianceCheck = async (req, res, next) => {
  try {
    if (!isManagementUser(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { runComplianceCheck } = require('../../services/complianceJob');
    await runComplianceCheck();
    res.json({ message: 'Compliance check triggered' });
  } catch (error) {
    next(error);
  }
};
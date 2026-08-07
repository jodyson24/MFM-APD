const cron = require('node-cron');
const mongoose = require('mongoose');
const OrgUnit = require('../models/OrgUnit');
const Activity = require('../models/Activity');
const ComplianceRule = require('../models/ComplianceRule');
const ComplianceStatus = require('../models/ComplianceStatus');
const PresentationCycle = require('../models/PresentationCycle');
const logger = require('../utils/logger');

/**
 * Compute the current period label and date range based on PresentationCycle.
 * For half-year compliance, we use the current open cycle (based on today's date).
 */
function getCurrentPeriod() {
  // Find the presentation cycle that covers today
  const today = new Date();
  const cycle = PresentationCycle.findOne({
    periodStart: { $lte: today },
    periodEnd: { $gte: today },
  }).sort({ periodStart: -1 }).lean(); // get most recent if multiple

  if (!cycle) {
    // Fallback: use current half-year manually
    const year = today.getFullYear();
    const month = today.getMonth();
    const half = month < 6 ? 'H1' : 'H2';
    const periodStart = new Date(year, month < 6 ? 0 : 6, 1);
    const periodEnd = new Date(year, month < 6 ? 5 : 11, 30);
    return { label: `${year}-${half}`, periodStart, periodEnd };
  }

  return {
    label: cycle.label,
    periodStart: cycle.periodStart,
    periodEnd: cycle.periodEnd,
  };
}

/**
 * Evaluate compliance for a single rule and all org units at that level.
 */
async function evaluateRule(rule) {
  const { orgLevel, divisionId, activityTypeId, requiredCountPerPeriod, periodType } = rule;
  if (requiredCountPerPeriod === null || requiredCountPerPeriod === undefined) {
    // Informational only – skip
    return;
  }

  const { label, periodStart, periodEnd } = getCurrentPeriod();
  if (!label) return; // no period defined

  // Get all org units at this level
  const orgUnits = await OrgUnit.find({ type: orgLevel }).select('_id').lean();

  for (const orgUnit of orgUnits) {
    // Count completed activities for this org unit, activityType, and optional division
    const filter = {
      orgUnitId: orgUnit._id,
      activityTypeId: activityTypeId,
      status: 'completed',
      'report.submittedAt': { $gte: periodStart, $lte: periodEnd },
    };
    if (divisionId) {
      filter.divisions = divisionId;
    }

    const actualCount = await Activity.countDocuments(filter);
    const status = actualCount >= requiredCountPerPeriod ? 'ok' : 'shortfall';

    // Upsert ComplianceStatus
    await ComplianceStatus.findOneAndUpdate(
      {
        orgUnitId: orgUnit._id,
        divisionId: divisionId || null,
        activityTypeId: activityTypeId,
        periodLabel: label,
      },
      {
        orgUnitId: orgUnit._id,
        divisionId: divisionId || null,
        activityTypeId: activityTypeId,
        periodLabel: label,
        requiredCount: requiredCountPerPeriod,
        actualCount: actualCount,
        status: status,
        lastEvaluatedAt: new Date(),
      },
      { upsert: true, new: true }
    );
  }
}

/**
 * Run full compliance check for all active rules.
 */
async function runComplianceCheck() {
  logger.info('Starting compliance check...');
  try {
    const rules = await ComplianceRule.find().lean();
    for (const rule of rules) {
      await evaluateRule(rule);
    }
    logger.info('Compliance check completed.');
  } catch (error) {
    logger.error(`Compliance check failed: ${error.message}`);
  }
}

// Schedule: run daily at 2:00 AM
cron.schedule('0 2 * * *', () => {
  logger.info('Running scheduled compliance check');
  runComplianceCheck();
});

// Also allow manual trigger via API (we'll export function)
module.exports = { runComplianceCheck };
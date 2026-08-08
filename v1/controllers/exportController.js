const Activity = require('../../models/Activity');
const OrgUnit = require('../../models/OrgUnit');
const PresentationCycle = require('../../models/PresentationCycle');
const ComplianceStatus = require('../../models/ComplianceStatus');
const WeeklyMetric = require('../../models/WeeklyMetric');
const ActivityType = require('../../models/ActivityType');

// The JSON contract (§13) — stable, versioned. Never inline internal shapes here.
async function buildOrgNode(unit, periodStart, periodEnd) {
  const descendantIds = await collectDescendants(unit._id);
  const allIds = [unit._id, ...descendantIds.map((d) => d._id)];

  const activities = await Activity.find({
    orgUnitId: { $in: allIds },
    status: 'completed',
    'report.submittedAt': { $gte: periodStart, $lte: periodEnd },
  }).lean();

  // Activity totals by type code
  const typeCodes = await ActivityType.find().select('_id code').lean();
  const codeByTypeId = new Map(typeCodes.map((t) => [t._id.toString(), t.code]));
  const activityTotals = {};
  const metricsSummary = {};
  for (const a of activities) {
    const code = codeByTypeId.get(a.activityTypeId.toString()) || 'unknown';
    activityTotals[code] = (activityTotals[code] || 0) + 1;
    const m = a.report?.metrics || {};
    for (const [key, value] of Object.entries(m)) {
      if (typeof value === 'number') {
        metricsSummary[key] = (metricsSummary[key] || 0) + value;
      }
    }
  }

  // Compliance snapshot for this unit only (its own level)
  const compliance = await ComplianceStatus.find({
    orgUnitId: unit._id,
    periodLabel: periodLabelForExport(periodStart),
  }).lean();
  const complianceSummary = compliance.reduce(
    (acc, c) => {
      acc.required += c.requiredCount || 0;
      acc.met += c.status === 'ok' ? (c.requiredCount || 0) : 0;
      acc.shortfall += c.status === 'shortfall' ? 1 : 0;
      return acc;
    },
    { required: 0, met: 0, shortfall: 0 }
  );

  const children = await OrgUnit.find({ parentId: unit._id }).lean();
  const regions = [];
  for (const child of children) {
    regions.push(await buildOrgNode(child, periodStart, periodEnd));
  }

  return {
    name: unit.name,
    activity_totals: activityTotals,
    metrics_summary: metricsSummary,
    compliance: complianceSummary,
    regions,
  };
}

async function collectDescendants(rootId) {
  const result = await OrgUnit.aggregate([
    { $match: { _id: rootId } },
    {
      $graphLookup: {
        from: 'orgunits',
        startWith: '$_id',
        connectFromField: '_id',
        connectToField: 'parentId',
        as: 'descendants',
      },
    },
    { $unwind: '$descendants' },
    { $replaceRoot: { newRoot: '$descendants' } },
  ]);
  return result;
}

function periodLabelForExport(periodStart) {
  const d = new Date(periodStart);
  return `${d.getFullYear()}-${d.getMonth() < 6 ? 'H1' : 'H2'}`;
}

// GET /export/presentation/:cycleId
exports.exportPresentation = async (req, res, next) => {
  try {
    const cycle = await PresentationCycle.findById(req.params.cycleId).lean();
    if (!cycle) {
      return res.status(404).json({ message: 'Presentation cycle not found' });
    }
    const { periodStart, periodEnd } = cycle;

    // Require admin-level visibility for the full export
    if (!req.user.isSuperAdmin && req.user.role !== 'mega_region_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const megaRegions = await OrgUnit.find({ type: 'mega_region' }).lean();
    const orgSummary = [];
    for (const mr of megaRegions) {
      orgSummary.push(await buildOrgNode(mr, periodStart, periodEnd));
    }

    // Weekly metrics summary (e.g. church growth)
    const weeklyMetrics = await WeeklyMetric.find({
      weekStartDate: { $gte: periodStart, $lte: periodEnd },
    }).lean();
    const weekly = {};
    for (const wm of weeklyMetrics) {
      if (!weekly[wm.metricKey]) weekly[wm.metricKey] = { start: periodStart, end: periodEnd, total: 0, count: 0 };
      weekly[wm.metricKey].total += wm.value;
      weekly[wm.metricKey].count += 1;
    }

    res.json({
      schema_version: 1,
      cycle: {
        label: cycle.label,
        period_start: cycle.periodStart,
        period_end: cycle.periodEnd,
        presentation_date: cycle.presentationDate,
      },
      org_summary: { mega_regions: orgSummary },
      division_breakdown: {}, // enriched by a future division-scoped aggregation
      weekly_metrics_summary: weekly,
      highlights: [],
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

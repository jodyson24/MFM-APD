const Activity = require('../../models/Activity');
const OrgUnit = require('../../models/OrgUnit');
const PresentationCycle = require('../../models/PresentationCycle');
const ComplianceStatus = require('../../models/ComplianceStatus');
const WeeklyMetric = require('../../models/WeeklyMetric');
const ActivityType = require('../../models/ActivityType');
const ActivityCategory = require('../../models/ActivityCategory');
const { isManagementUser } = require('../../lib/permissions');

// The JSON contract (§13) — stable, versioned. Never inline internal shapes here.
// categoryByTypeId: { activityTypeId -> { code, name } } resolved once per export.
async function buildOrgNode(unit, periodStart, periodEnd, categoryByTypeId) {
  const descendantIds = await collectDescendants(unit._id);
  const allIds = [unit._id, ...descendantIds.map((d) => d._id)];

  const activities = await Activity.find({
    orgUnitId: { $in: allIds },
    status: 'completed',
    'report.submittedAt': { $gte: periodStart, $lte: periodEnd },
  }).lean();

  // Activity totals by type code + by category (activity_category_breakdown per §13)
  const typeCodes = await ActivityType.find().select('_id code').lean();
  const codeByTypeId = new Map(typeCodes.map((t) => [t._id.toString(), t.code]));
  const activityTotals = {};
  const activityCategoryBreakdown = {};
  const metricsSummary = {};
  for (const a of activities) {
    const typeId = a.activityTypeId.toString();
    const code = codeByTypeId.get(typeId) || 'unknown';
    activityTotals[code] = (activityTotals[code] || 0) + 1;

    const category = categoryByTypeId.get(typeId);
    if (category) {
      const key = category.code || category.name;
      activityCategoryBreakdown[key] = (activityCategoryBreakdown[key] || 0) + 1;
    }

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
    regions.push(await buildOrgNode(child, periodStart, periodEnd, categoryByTypeId));
  }

  return {
    name: unit.name,
    activity_totals: activityTotals,
    activity_category_breakdown: activityCategoryBreakdown,
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
    if (!isManagementUser(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const megaRegions = await OrgUnit.find({ type: 'mega_region' }).lean();

    // Resolve activityType -> activityCategory once, shared across every org node.
    const types = await ActivityType.find().select('activityCategoryId').populate('activityCategoryId', 'code name').lean();
    const categoryByTypeId = new Map();
    for (const t of types) {
      if (t.activityCategoryId) {
        categoryByTypeId.set(t._id.toString(), t.activityCategoryId);
      }
    }

    const orgSummary = [];
    for (const mr of megaRegions) {
      orgSummary.push(await buildOrgNode(mr, periodStart, periodEnd, categoryByTypeId));
    }

    // Combine per-node category breakdowns into one global object for the contract.
    const activityCategoryBreakdown = {};
    const collect = (node) => {
      for (const [key, count] of Object.entries(node.activity_category_breakdown || {})) {
        activityCategoryBreakdown[key] = (activityCategoryBreakdown[key] || 0) + count;
      }
      (node.regions || []).forEach(collect);
    };
    orgSummary.forEach(collect);

    // Weekly metrics summary (e.g. church growth), keyed by weekly metric type code
    const weeklyMetrics = await WeeklyMetric.find({
      weekStartDate: { $gte: periodStart, $lte: periodEnd },
    }).lean();
    const weeklyMetricTypes = await require('../../models/WeeklyMetricType').find().select('_id code name').lean();
    const codeByWeeklyMetricTypeId = new Map(weeklyMetricTypes.map((t) => [t._id.toString(), t.code]));
    const weekly = {};
    for (const wm of weeklyMetrics) {
      const code = codeByWeeklyMetricTypeId.get(wm.weeklyMetricTypeId.toString()) || 'unknown';
      if (!weekly[code]) weekly[code] = { start: periodStart, end: periodEnd, total: 0, count: 0 };
      if (typeof wm.value === 'number') {
        weekly[code].total += wm.value;
      }
      weekly[code].count += 1;
    }

    // §13 division_breakdown: per-division activity counts + souls won, crossing
    // the hierarchy (an activity tagged to a division counts once for that division).
    const Division = require('../../models/Division');
    const divisions = await Division.find().select('_id code name').lean();
    const divisionByCode = new Map(divisions.map((d) => [d.code, d]));
    const divisionBreakdown = {};
    const periodActivities = await Activity.find({
      status: 'completed',
      'report.submittedAt': { $gte: periodStart, $lte: periodEnd },
    })
      .populate('orgUnitId', 'name type')
      .populate('divisions', 'code name')
      .populate('activityTypeId', 'code')
      .lean();
    for (const a of periodActivities) {
      const souls = a.report?.metrics?.soulsWon || 0;
      const divisionsUsed = (a.divisions || []).filter((d) => d && d.code);
      if (divisionsUsed.length === 0) {
        const bucket = (divisionBreakdown.general ||= { count: 0, soulsWon: 0, typeCodes: {} });
        bucket.count += 1;
        bucket.soulsWon += souls;
        const tc = a.activityTypeId?.code;
        if (tc) bucket.typeCodes[tc] = (bucket.typeCodes[tc] || 0) + 1;
      } else {
        for (const d of divisionsUsed) {
          const bucket = (divisionBreakdown[d.code] ||= { count: 0, soulsWon: 0, typeCodes: {} });
          bucket.count += 1;
          bucket.soulsWon += souls;
          const tc = a.activityTypeId?.code;
          if (tc) bucket.typeCodes[tc] = (bucket.typeCodes[tc] || 0) + 1;
        }
      }
    }

    // §13 highlights: top reports by souls won (or latest if no souls metric),
    // with the mandatory pictorial-evidence image reference for the deck.
    const highlights = periodActivities
      .filter((a) => a.orgUnitId)
      .map((a) => ({
        title: a.title,
        orgUnit: a.orgUnitId.name,
        orgType: a.orgUnitId.type,
        scheduledDate: a.scheduledDate,
        activityTypeCode: a.activityTypeId?.code || null,
        soulsWon: typeof a.report?.metrics?.soulsWon === 'number' ? a.report.metrics.soulsWon : null,
        media: (a.report?.media || []).find((m) => m.mediaType === 'image'),
      }))
      .sort((x, y) => (y.soulsWon || 0) - (x.soulsWon || 0))
      .slice(0, 5);

    res.json({
      schema_version: 1,
      cycle: {
        label: cycle.label,
        period_start: cycle.periodStart,
        period_end: cycle.periodEnd,
        presentation_date: cycle.presentationDate,
      },
      org_summary: { mega_regions: orgSummary },
      division_breakdown: {
        activity_category_breakdown: activityCategoryBreakdown,
        divisions: divisionBreakdown,
      },
      weekly_metrics_summary: weekly,
      highlights,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

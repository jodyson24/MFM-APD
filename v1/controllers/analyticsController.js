const MetricsRollup = require('../../models/MetricsRollup');
const OrgUnit = require('../../models/OrgUnit');
const ActivityType = require('../../models/ActivityType');
const Division = require('../../models/Division');

/**
 * Get analytics for the user's scope.
 * Options:
 * - periodLabel: specific period (e.g., "2025-H1")
 * - orgUnitId: specific org unit (must be within scope)
 * - activityTypeId: filter
 * - divisionId: filter
 */
exports.getAnalytics = async (req, res, next) => {
  try {
    let orgUnitIds = req.scope.orgUnitIds;
    if (req.user.isSuperAdmin) {
      const allUnits = await OrgUnit.find().select('_id').lean();
      orgUnitIds = allUnits.map(u => u._id);
    }

    const filter = { orgUnitId: { $in: orgUnitIds } };
    if (req.query.orgUnitId) {
      if (!orgUnitIds.includes(req.query.orgUnitId)) {
        return res.status(403).json({ message: 'Access denied to this org unit' });
      }
      filter.orgUnitId = req.query.orgUnitId;
    }
    if (req.query.activityTypeId) filter.activityTypeId = req.query.activityTypeId;
    if (req.query.divisionId) filter.divisionId = req.query.divisionId;
    if (req.query.periodLabel) filter.periodLabel = req.query.periodLabel;

    const rollups = await MetricsRollup.find(filter)
      .populate('orgUnitId', 'name type')
      .populate('activityTypeId', 'name code')
      .populate('divisionId', 'name code');

    res.json(rollups);
  } catch (error) {
    next(error);
  }
};

/**
 * Compute growth: compare two periods (e.g., this half vs last half).
 * Returns percentage change for each metricKey, grouped by orgUnit, activityType, division.
 */
exports.getGrowth = async (req, res, next) => {
  try {
    const { orgUnitId, activityTypeId, divisionId, period1, period2 } = req.query;

    if (!period1 || !period2) {
      return res.status(400).json({ message: 'period1 and period2 required' });
    }

    // Validate scope
    let allowedIds = req.scope.orgUnitIds;
    if (req.user.isSuperAdmin) {
      const allUnits = await OrgUnit.find().select('_id').lean();
      allowedIds = allUnits.map(u => u._id);
    }
    if (orgUnitId && !allowedIds.includes(orgUnitId)) {
      return res.status(403).json({ message: 'Access denied to this org unit' });
    }

    const match = {
      periodLabel: { $in: [period1, period2] },
    };
    if (orgUnitId) match.orgUnitId = orgUnitId;
    if (activityTypeId) match.activityTypeId = activityTypeId;
    if (divisionId) match.divisionId = divisionId;

    const results = await MetricsRollup.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            orgUnitId: '$orgUnitId',
            activityTypeId: '$activityTypeId',
            divisionId: { $ifNull: ['$divisionId', null] },
            metricKey: '$metricKey',
            periodLabel: '$periodLabel',
          },
          totalValue: { $sum: '$metricValue' },
        },
      },
      {
        $group: {
          _id: {
            orgUnitId: '$_id.orgUnitId',
            activityTypeId: '$_id.activityTypeId',
            divisionId: '$_id.divisionId',
            metricKey: '$_id.metricKey',
          },
          periods: {
            $push: {
              periodLabel: '$_id.periodLabel',
              totalValue: '$totalValue',
            },
          },
        },
      },
      {
        $project: {
          orgUnitId: '$_id.orgUnitId',
          activityTypeId: '$_id.activityTypeId',
          divisionId: '$_id.divisionId',
          metricKey: '$_id.metricKey',
          period1: {
            $arrayElemAt: [
              '$periods',
              { $indexOfArray: ['$periods.periodLabel', period1] },
            ],
          },
          period2: {
            $arrayElemAt: [
              '$periods',
              { $indexOfArray: ['$periods.periodLabel', period2] },
            ],
          },
        },
      },
      {
        $project: {
          orgUnitId: 1,
          activityTypeId: 1,
          divisionId: 1,
          metricKey: 1,
          value1: '$period1.totalValue',
          value2: '$period2.totalValue',
          growth: {
            $cond: [
              { $or: [{ $eq: ['$period1.totalValue', 0] }, { $eq: ['$period1.totalValue', null] }] },
              null,
              {
                $multiply: [
                  { $divide: [
                    { $subtract: ['$period2.totalValue', '$period1.totalValue'] },
                    '$period1.totalValue',
                  ] },
                  100,
                ],
              },
            ],
          },
        },
      },
      // Lookup names
      {
        $lookup: {
          from: 'orgunits',
          localField: 'orgUnitId',
          foreignField: '_id',
          as: 'orgUnit',
        },
      },
      { $unwind: '$orgUnit' },
      {
        $lookup: {
          from: 'activitytypes',
          localField: 'activityTypeId',
          foreignField: '_id',
          as: 'activityType',
        },
      },
      { $unwind: '$activityType' },
      {
        $lookup: {
          from: 'divisions',
          localField: 'divisionId',
          foreignField: '_id',
          as: 'division',
        },
      },
      { $unwind: { path: '$division', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          orgUnit: { name: 1, type: 1 },
          activityType: { name: 1, code: 1 },
          division: { name: 1, code: 1 },
          metricKey: 1,
          value1: { $ifNull: ['$value1', 0] },
          value2: { $ifNull: ['$value2', 0] },
          growth: '$growth',
        },
      },
    ]);

    res.json(results);
  } catch (error) {
    next(error);
  }
};
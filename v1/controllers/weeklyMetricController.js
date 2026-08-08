const WeeklyMetric = require('../../models/WeeklyMetric');
const OrgUnit = require('../../models/OrgUnit');

// Submit a weekly metric (for church growth etc.)
exports.submitWeeklyMetric = async (req, res, next) => {
  try {
    const { orgUnitId, metricKey, weekStartDate, value } = req.body;

    if (!req.user.isSuperAdmin && !req.scope.orgUnitIds.includes(orgUnitId)) {
      return res.status(403).json({ message: 'Cannot submit metric outside your scope' });
    }

    // Validate that weekStartDate is a Monday (or we can set it)
    // We'll just store as given, but we might want to normalize.

    const metric = new WeeklyMetric({
      orgUnitId,
      metricKey,
      weekStartDate: new Date(weekStartDate),
      value,
      submittedByUserId: req.user._id,
    });

    await metric.save();
    res.status(201).json(metric);
  } catch (error) {
    next(error);
  }
};

// Get weekly metrics for the user's scope
exports.getWeeklyMetrics = async (req, res, next) => {
  try {
    let orgUnitIds = req.scope.orgUnitIds;
    if (req.user.isSuperAdmin) {
      const allUnits = await OrgUnit.find().select('_id').lean();
      orgUnitIds = allUnits.map(u => u._id);
    }

    const filter = { orgUnitId: { $in: orgUnitIds } };
    if (req.query.metricKey) filter.metricKey = req.query.metricKey;
    if (req.query.from) filter.weekStartDate = { $gte: new Date(req.query.from) };
    if (req.query.to) filter.weekStartDate = { ...filter.weekStartDate, $lte: new Date(req.query.to) };

    const metrics = await WeeklyMetric.find(filter)
      .populate('orgUnitId', 'name type')
      .populate('submittedByUserId', 'name')
      .sort({ weekStartDate: -1 });

    res.json(metrics);
  } catch (error) {
    next(error);
  }
};

// Get aggregated weekly metrics (e.g., sum per org unit, metricKey)
exports.getWeeklyAggregates = async (req, res, next) => {
  try {
    let orgUnitIds = req.scope.orgUnitIds;
    if (req.user.isSuperAdmin) {
      const allUnits = await OrgUnit.find().select('_id').lean();
      orgUnitIds = allUnits.map(u => u._id);
    }

    const pipeline = [
      { $match: { orgUnitId: { $in: orgUnitIds } } },
      {
        $group: {
          _id: {
            orgUnitId: '$orgUnitId',
            metricKey: '$metricKey',
          },
          totalValue: { $sum: '$value' },
          count: { $sum: 1 },
          avgValue: { $avg: '$value' },
          latestDate: { $max: '$weekStartDate' },
        },
      },
      {
        $lookup: {
          from: 'orgunits',
          localField: '_id.orgUnitId',
          foreignField: '_id',
          as: 'orgUnit',
        },
      },
      { $unwind: '$orgUnit' },
      { $project: { '_id': 0, orgUnit: { name: 1, type: 1 }, metricKey: '$_id.metricKey', totalValue: 1, count: 1, avgValue: 1, latestDate: 1 } },
    ];

    const results = await WeeklyMetric.aggregate(pipeline);
    res.json(results);
  } catch (error) {
    next(error);
  }
};
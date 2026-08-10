const WeeklyMetric = require('../../models/WeeklyMetric');
const WeeklyMetricType = require('../../models/WeeklyMetricType');
const OrgUnit = require('../../models/OrgUnit');

// Submit a weekly metric (for church growth etc.)
exports.submitWeeklyMetric = async (req, res, next) => {
  try {
    const { orgUnitId, weeklyMetricTypeId, weekStartDate, value } = req.body;

    if (!req.user.isSuperAdmin && !req.scope.orgUnitIds.includes(orgUnitId)) {
      return res.status(403).json({ message: 'Cannot submit metric outside your scope' });
    }

    // Value may be a number or a breakdown array (e.g. weekly_attendance_by_division)
    const metric = new WeeklyMetric({
      orgUnitId,
      weeklyMetricTypeId,
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
    if (req.query.weeklyMetricTypeId) filter.weeklyMetricTypeId = req.query.weeklyMetricTypeId;
    if (req.query.from) filter.weekStartDate = { $gte: new Date(req.query.from) };
    if (req.query.to) filter.weekStartDate = { ...filter.weekStartDate, $lte: new Date(req.query.to) };

    const metrics = await WeeklyMetric.find(filter)
      .populate('orgUnitId', 'name type')
      .populate('weeklyMetricTypeId', 'code name')
      .populate('submittedByUserId', 'name')
      .sort({ weekStartDate: -1 });

    res.json(metrics);
  } catch (error) {
    next(error);
  }
};

// Get aggregated weekly metrics (e.g., sum per org unit, weeklyMetricType)
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
            weeklyMetricTypeId: '$weeklyMetricTypeId',
          },
          // Sum only numeric values; breakdown arrays (e.g. division attendance)
          // are excluded from the scalar total.
          totalValue: {
            $sum: {
              $cond: [{ $eq: [{ $type: '$value' }, 'number'] }, { $ifNull: ['$value', 0] }, 0],
            },
          },
          count: { $sum: 1 },
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
      {
        $lookup: {
          from: 'weeklymetrictypes',
          localField: '_id.weeklyMetricTypeId',
          foreignField: '_id',
          as: 'metricType',
        },
      },
      { $unwind: '$metricType' },
      {
        $project: {
          '_id': 0,
          orgUnit: { name: 1, type: 1 },
          weeklyMetricType: { code: '$metricType.code', name: '$metricType.name' },
          totalValue: 1,
          count: 1,
          latestDate: 1,
        },
      },
    ];

    const results = await WeeklyMetric.aggregate(pipeline);
    res.json(results);
  } catch (error) {
    next(error);
  }
};

// Weekly metric type catalog for the forms
exports.getWeeklyMetricTypes = async (req, res, next) => {
  try {
    const types = await WeeklyMetricType.find({ isActive: true }).sort({ code: 1 });
    res.json(types);
  } catch (error) {
    next(error);
  }
};
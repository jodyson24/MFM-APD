const Activity = require('../../models/Activity');
const { applyScope } = require('../../middlewares/scope');

exports.createActivity = async (req, res, next) => {
  try {
    const { orgUnitId, activityTypeId, divisions, strategicInitiativeId, title, description, scheduledDate, scheduledEndDate } = req.body;

    // Ensure user can create activity for this org unit
    if (!req.user.isSuperAdmin && !req.scope.orgUnitIds.includes(orgUnitId)) {
      return res.status(403).json({ message: 'Cannot create activity outside your scope' });
    }

    const activity = new Activity({
      orgUnitId,
      activityTypeId,
      divisions,
      strategicInitiativeId,
      title,
      description,
      scheduledDate,
      scheduledEndDate,
      createdByUserId: req.user._id,
      status: 'scheduled',
    });

    await activity.save();
    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
};

exports.getActivities = async (req, res, next) => {
  try {
    const filter = {};
    if (!req.user.isSuperAdmin) {
      filter.orgUnitId = { $in: req.scope.orgUnitIds };
    }
    // Optional query filters
    if (req.query.activityTypeId) filter.activityTypeId = req.query.activityTypeId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.division) filter.divisions = req.query.division;

    const activities = await Activity.find(filter)
      .populate('orgUnitId', 'name type')
      .populate('activityTypeId', 'name code')
      .populate('divisions', 'name code')
      .sort({ scheduledDate: -1 });
    res.json(activities);
  } catch (error) {
    next(error);
  }
};

exports.getActivity = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('orgUnitId', 'name type')
      .populate('activityTypeId', 'name code')
      .populate('divisions', 'name code');
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }
    // Check scope
    if (!req.user.isSuperAdmin && !req.scope.orgUnitIds.includes(activity.orgUnitId._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(activity);
  } catch (error) {
    next(error);
  }
};

exports.updateActivity = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }
    if (!req.user.isSuperAdmin && !req.scope.orgUnitIds.includes(activity.orgUnitId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only allow updates if still scheduled
    if (activity.status !== 'scheduled') {
      return res.status(400).json({ message: 'Cannot update activity after it has been completed or reported' });
    }

    const { title, description, scheduledDate, scheduledEndDate, divisions, strategicInitiativeId } = req.body;
    activity.title = title || activity.title;
    activity.description = description;
    activity.scheduledDate = scheduledDate || activity.scheduledDate;
    activity.scheduledEndDate = scheduledEndDate;
    if (divisions) activity.divisions = divisions;
    if (strategicInitiativeId !== undefined) activity.strategicInitiativeId = strategicInitiativeId;

    await activity.save();
    res.json(activity);
  } catch (error) {
    next(error);
  }
};

exports.submitFollowUp = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }
    if (!req.user.isSuperAdmin && !req.scope.orgUnitIds.includes(activity.orgUnitId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Prevent double submission
    if (activity.report && activity.report.submittedAt) {
      return res.status(400).json({ message: 'Follow-up already submitted' });
    }

    const { wasHeld, narrativeReport, metrics, media, notHeldReason } = req.body;

    // Build report object
    const report = {
      wasHeld,
      markedByUserId: req.user._id,
      markedAt: new Date(),
      submittedAt: new Date(),
    };

    if (wasHeld) {
      report.narrativeReport = narrativeReport;
      report.metrics = metrics;
      report.media = media;
      activity.status = 'completed';
    } else {
      report.notHeldReason = notHeldReason;
      activity.status = 'not_held';
    }

    activity.report = report;
    await activity.save();

    res.json({ message: 'Follow-up submitted successfully', activity });
  } catch (error) {
    next(error);
  }
};
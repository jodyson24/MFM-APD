const Activity = require('../../models/Activity');
const { applyScope } = require('../../middlewares/scope');
const { logAction } = require('../../services/auditService');
const { notifyResources } = require('../../lib/realtime');

exports.createActivity = async (req, res, next) => {
  try {
    const { orgUnitId, activityTypeId, divisions, strategicInitiativeId, title, description, scheduledDate, scheduledEndDate, actualDate, media } = req.body;

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
      actualDate: actualDate || null,
      media: media || [],
      createdByUserId: req.user._id,
      status: 'scheduled',
    });

    await activity.save();

    logAction({
      userId: req.user._id,
      action: 'create_activity',
      entity: 'Activity',
      entityId: activity._id,
      ipAddress: req.ip,
      meta: { activityTypeId, orgUnitId },
    });

    notifyResources(['activities', 'analytics', 'compliance']);
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
    // Drill-down: activities at one specific org unit (must be inside the scope)
    if (req.query.unitId) {
      if (!req.user.isSuperAdmin && !req.scope.orgUnitIds.includes(req.query.unitId)) {
        return res.status(403).json({ message: 'Access denied for this org unit' });
      }
      filter.orgUnitId = req.query.unitId;
    }

    const activities = await Activity.find(filter)
      .populate('orgUnitId', 'name type')
      .populate({
        path: 'activityTypeId',
        select: 'name code extraFields activityCategoryId',
        populate: { path: 'activityCategoryId', select: 'code name tier' },
      })
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
      .populate('activityTypeId', 'name code extraFields activityCategoryId applicableDivisionHint')
      .populate('divisions', 'name code');
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }
    // Check scope
    if (!req.user.isSuperAdmin && !req.scope.orgUnitIds.includes(activity.orgUnitId._id.toString())) {
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

    const { title, description, scheduledDate, scheduledEndDate, actualDate, divisions, strategicInitiativeId, media } = req.body;
    activity.title = title || activity.title;
    activity.description = description;
    activity.scheduledDate = scheduledDate || activity.scheduledDate;
    activity.scheduledEndDate = scheduledEndDate;
    if (actualDate !== undefined) activity.actualDate = actualDate || null;
    if (divisions) activity.divisions = divisions;
    if (strategicInitiativeId !== undefined) activity.strategicInitiativeId = strategicInitiativeId;
    if (media !== undefined) activity.media = media;

    await activity.save();

    logAction({
      userId: req.user._id,
      action: 'update_activity',
      entity: 'Activity',
      entityId: activity._id,
      ipAddress: req.ip,
    });

    notifyResources(['activities', 'analytics', 'compliance']);
    res.json(activity);
  } catch (error) {
    next(error);
  }
};

// Cancel a scheduled activity (§10 Step 6) — records the reason and marks cancelled
exports.cancelActivity = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }
    if (!req.user.isSuperAdmin && !req.scope.orgUnitIds.includes(activity.orgUnitId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (activity.status !== 'scheduled') {
      return res.status(400).json({ message: 'Only scheduled activities can be cancelled' });
    }

    const reason = (req.validatedBody && req.validatedBody.reason) || 'Cancelled';

    activity.status = 'cancelled';
    activity.report = {
      wasHeld: false,
      notHeldReason: reason,
      markedByUserId: req.user._id,
      markedAt: new Date(),
      submittedAt: new Date(),
    };
    await activity.save();

    logAction({
      userId: req.user._id,
      action: 'cancel_activity',
      entity: 'Activity',
      entityId: activity._id,
      ipAddress: req.ip,
      meta: { reason },
    });

    notifyResources(['activities', 'analytics', 'compliance']);
    res.json({ message: 'Activity cancelled', activity });
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

    const followUp = req.parsedFollowUp;
    if (!followUp) {
      return res.status(422).json({ message: 'Follow-up body could not be parsed' });
    }

    const { wasHeld, narrativeReport, metrics, media, notHeldReason, rescheduledDate } = followUp;

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

    // §10 Step 5 (No branch): an optional rescheduled date auto-creates a linked
    // new Activity so the unit isn't penalised twice for one missed event.
    let rescheduledActivity = null;
    if (!wasHeld && rescheduledDate) {
      rescheduledActivity = await Activity.create({
        orgUnitId: activity.orgUnitId,
        activityTypeId: activity.activityTypeId,
        divisions: activity.divisions || [],
        strategicInitiativeId: activity.strategicInitiativeId || null,
        title: activity.title,
        description: activity.description,
        scheduledDate: new Date(rescheduledDate),
        scheduledEndDate: activity.scheduledEndDate || null,
        createdByUserId: req.user._id,
        status: 'scheduled',
        rescheduledFromActivityId: activity._id,
      });
    }

    logAction({
      userId: req.user._id,
      action: wasHeld ? 'file_report' : 'mark_not_held',
      entity: 'Activity',
      entityId: activity._id,
      ipAddress: req.ip,
      meta: { wasHeld, rescheduled: !!rescheduledDate },
    });

    notifyResources(['activities', 'analytics', 'compliance']);
    res.json({
      message: 'Follow-up submitted successfully',
      activity,
      rescheduledActivity,
    });
  } catch (error) {
    next(error);
  }
};
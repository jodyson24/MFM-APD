const SessionLog = require('../../models/SessionLog');
const UserActivityLog = require('../../models/UserActivityLog');
const AuditLog = require('../../models/AuditLog');

// Session log (login/logout/duration) — super admin sees all, mega region admins scoped
exports.getSessions = async (req, res, next) => {
  try {
    const filter = {};
    if (!req.user.isSuperAdmin) {
      // Restrict to users in this admin's scope
      const scopeUsers = await orgUnitUserIds(req);
      filter.userId = { $in: scopeUsers };
    }
    if (req.query.userId) filter.userId = req.query.userId;

    const sessions = await SessionLog.find(filter)
      .populate('userId', 'name email role')
      .sort({ loginAt: -1 })
      .limit(parseInt(req.query.limit || 100, 10));
    res.json(sessions);
  } catch (error) {
    next(error);
  }
};

// User action feed
exports.getUserActivityLog = async (req, res, next) => {
  try {
    const filter = {};
    if (!req.user.isSuperAdmin) {
      const scopeUsers = await orgUnitUserIds(req);
      filter.userId = { $in: scopeUsers };
    }
    if (req.query.userId) filter.userId = req.query.userId;

    const logs = await UserActivityLog.find(filter)
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 })
      .limit(parseInt(req.query.limit || 100, 10));
    res.json(logs);
  } catch (error) {
    next(error);
  }
};

// AuditLog (§5) — system-level write audit; Super Admin only
exports.getAuditLog = async (req, res, next) => {
  try {
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const filter = {};
    if (req.query.entity) filter.entity = req.query.entity;
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.action) filter.action = req.query.action;

    const logs = await AuditLog.find(filter)
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 })
      .limit(parseInt(req.query.limit || 100, 10));
    res.json(logs);
  } catch (error) {
    next(error);
  }
};

async function orgUnitUserIds(req) {
  const { default: User } = require('../../models/User');
  const scoped = await User.find({ orgUnitId: { $in: req.scope.orgUnitIds } }).select('_id').lean();
  return scoped.map((u) => u._id);
}

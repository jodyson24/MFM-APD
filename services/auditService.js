const AuditLog = require('../models/AuditLog');
const UserActivityLog = require('../models/UserActivityLog');

/**
 * Record an action in both the AuditLog (§5) and the UserActivityLog action feed (§8.4).
 * Fire-and-forget: failures are logged but never block the request.
 */
exports.logAction = async ({ userId, sessionId, action, entity, entityId, ipAddress, meta = {} }) => {
  try {
    const timestamp = new Date();
    await Promise.allSettled([
      AuditLog.create({ userId, action, entity, entityId, timestamp, meta }),
      UserActivityLog.create({ userId, sessionId, action, entity, entityId, ipAddress, timestamp }),
    ]);
  } catch (err) {
    console.error('audit log write failed', err.message);
  }
};

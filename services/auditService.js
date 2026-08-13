const logger = require('../utils/logger');
const AuditLog = require('../models/AuditLog');
const UserActivityLog = require('../models/UserActivityLog');

/**
 * Record an action in both the AuditLog (§5) and the UserActivityLog action feed (§8.4).
 * Fire-and-forget: failures are logged but never block the request.
 */
exports.logAction = async ({ userId, sessionId, action, entity, entityId, ipAddress, requestId, meta = {} }) => {
  try {
    const timestamp = new Date();

    logger.info({
      message: 'Action recorded',
      requestId,
      userId,
      sessionId,
      action,
      entity,
      entityId,
      ipAddress,
      meta,
    });

    await Promise.allSettled([
      AuditLog.create({ userId, action, entity, entityId, requestId, timestamp, meta: { ...meta, requestId } }),
      UserActivityLog.create({ userId, sessionId, action, entity, entityId, ipAddress, requestId, timestamp, meta: { ...meta, requestId } }),
    ]);
  } catch (err) {
    logger.error({
      message: 'audit log write failed',
      requestId,
      error: err.message,
      stack: err.stack,
    });
  }
};

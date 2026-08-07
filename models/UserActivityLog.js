const mongoose = require('mongoose');

const userActivityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'SessionLog' },
  action: { type: String, required: true },
  entity: { type: String },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('UserActivityLog', userActivityLogSchema);
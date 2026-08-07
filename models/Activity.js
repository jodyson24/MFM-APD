const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  orgUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrgUnit', required: true },
  activityTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ActivityType', required: true },
  divisions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Division' }], // optional, zero-to-many
  strategicInitiativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'StrategicInitiative', default: null },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  scheduledDate: { type: Date, required: true },
  scheduledEndDate: { type: Date },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'not_held', 'cancelled', 'postponed'],
    default: 'scheduled',
  },
  rescheduledFromActivityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', default: null },
  createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  report: {
    wasHeld: { type: Boolean },
    markedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    markedAt: { type: Date },
    // Yes branch
    narrativeReport: { type: String },
    metrics: { type: mongoose.Schema.Types.Mixed }, // free-shape, validated per activityType
    media: [{
      mediaType: { type: String, enum: ['image', 'video'] },
      url: { type: String },
      caption: { type: String },
    }],
    // No branch
    notHeldReason: { type: String },
    submittedAt: { type: Date },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes
activitySchema.index({ orgUnitId: 1, scheduledDate: -1 });
activitySchema.index({ orgUnitId: 1, activityTypeId: 1, status: 1 });
activitySchema.index({ divisions: 1 });

module.exports = mongoose.model('Activity', activitySchema);
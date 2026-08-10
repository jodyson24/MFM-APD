const mongoose = require('mongoose');

const activityCategorySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  tier: {
    type: String,
    enum: ['core', 'programmatic'],
    required: true,
  }, // CORE = compliance-critical buckets, PROGRAMMATIC = reporting/analytics only
  programAreaIds: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StrategicInitiative' }],
    default: [],
  }, // usually 1, sometimes 2-3 (see ACTIVITY_MODEL.md §3)
  requiredFrequencyByLevel: {
    megaRegion: { type: Number, default: null }, // null = not level-differentiated / informational only
    region: { type: Number, default: null },
    zone: { type: Number, default: null },
    branch: { type: Number, default: null },
  }, // frequency matrix, ACTIVITY_MODEL.md §6
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ActivityCategory', activityCategorySchema);
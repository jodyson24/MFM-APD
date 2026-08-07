const mongoose = require('mongoose');

const activityTypeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  applicableLevels: {
    type: [String],
    enum: ['mega_region', 'region', 'zone', 'branch'],
    default: ['mega_region', 'region', 'zone', 'branch'],
  },
  requiredFrequencyByLevel: {
    megaRegion: { type: Number, default: null }, // null = not defined
    region: { type: Number, default: null },
    zone: { type: Number, default: null },
    branch: { type: Number, default: null },
  },
  aliases: { type: [String], default: [] },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ActivityType', activityTypeSchema);
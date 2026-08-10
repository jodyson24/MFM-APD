const mongoose = require('mongoose');

const activityTypeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  activityCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ActivityCategory',
    required: true,
  }, // cascades program area via the category (ACTIVITY_MODEL.md §1/§8)
  applicableLevels: {
    type: [String],
    enum: ['mega_region', 'region', 'zone', 'branch'],
    default: ['mega_region', 'region', 'zone', 'branch'],
  },
  // Optional hint for the UI's default division suggestion — NOT an enforced restriction
  // (divisions remain loosely tagged, ACTIVITY_MODEL.md §2)
  applicableDivisionHint: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Division' }],
    default: [],
  },
  aliases: { type: [String], default: [] },
  // Type-specific fields layered on top of the §4 baseline schema (validated dynamically, §9)
  extraFields: [
    {
      key: { type: String, required: true, trim: true },
      label: { type: String, required: true, trim: true },
      dataType: {
        type: String,
        enum: ['string', 'number', 'enum', 'array', 'object'],
        required: true,
      },
      enumOptions: { type: [String], default: [] }, // populated when dataType === 'enum'
      required: { type: Boolean, default: false },
    },
  ],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

activityTypeSchema.index({ activityCategoryId: 1 });

module.exports = mongoose.model('ActivityType', activityTypeSchema);
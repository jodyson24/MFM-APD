const mongoose = require('mongoose');

const orgUnitSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['mega_region', 'region', 'zone', 'branch'],
    required: true,
  },
  name: { type: String, required: true, trim: true },
  location: { type: String, trim: true, default: '' }, // town/area/address for regions, zones and branches
  isHeadquarters: { type: Boolean, default: false }, // single Mega Regional HQ (the app is built for it)
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrgUnit', default: null }, // null for mega_region
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

orgUnitSchema.index({ type: 1, name: 1 });
orgUnitSchema.index({ parentId: 1 });

module.exports = mongoose.model('OrgUnit', orgUnitSchema);
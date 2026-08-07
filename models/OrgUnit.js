const mongoose = require('mongoose');

const orgUnitSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['mega_region', 'region', 'zone', 'branch'],
    required: true,
  },
  name: { type: String, required: true, trim: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrgUnit', default: null }, // null for mega_region
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('OrgUnit', orgUnitSchema);
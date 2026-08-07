const mongoose = require('mongoose');

const presentationCycleSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true }, // e.g., "H2 2025"
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  presentationDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['upcoming', 'past'],
    default: 'upcoming',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PresentationCycle', presentationCycleSchema);
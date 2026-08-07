const mongoose = require('mongoose');

const strategicInitiativeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  title: { type: String, required: true, trim: true },
  subtitle: { type: String, trim: true },
  objectives: { type: String, trim: true },
  outcomes: { type: String, trim: true },
  keyTasks: { type: [String], default: [] },
  additionalKeyTasks2025: { type: [String], default: [] },
  targets: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('StrategicInitiative', strategicInitiativeSchema);
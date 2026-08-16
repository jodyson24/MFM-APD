const PresentationCycle = require('../../models/PresentationCycle');
const { notifyResources } = require('../../lib/realtime');

// List cycles
exports.getCycles = async (req, res, next) => {
  try {
    const cycles = await PresentationCycle.find().sort({ presentationDate: 1 });
    res.json(cycles);
  } catch (error) {
    next(error);
  }
};

// Next upcoming cycle
exports.getNextCycle = async (req, res, next) => {
  try {
    const now = new Date();
    const cycle = await PresentationCycle.findOne({
      presentationDate: { $gte: now },
    }).sort({ presentationDate: 1 });
    if (!cycle) {
      return res.status(404).json({ message: 'No upcoming presentation cycle' });
    }
    res.json(cycle);
  } catch (error) {
    next(error);
  }
};

// Current open cycle (covers today's date) - used for compliance periods
exports.getCurrentCycle = async (req, res, next) => {
  try {
    const today = new Date();
    const cycle = await PresentationCycle.findOne({
      periodStart: { $lte: today },
      periodEnd: { $gte: today },
    }).sort({ periodStart: -1 });
    if (!cycle) {
      return res.status(404).json({ message: 'No cycle covers the current date' });
    }
    res.json(cycle);
  } catch (error) {
    next(error);
  }
};

// Create cycle (super admin / mega region admin)
exports.createCycle = async (req, res, next) => {
  try {
    const { label, periodStart, periodEnd, presentationDate } = req.body;
    const cycle = new PresentationCycle({
      label,
      periodStart,
      periodEnd,
      presentationDate,
      status: presentationDate > new Date() ? 'upcoming' : 'past',
    });
    await cycle.save();
    notifyResources(['cycles', 'analytics']);
    res.status(201).json(cycle);
  } catch (error) {
    next(error);
  }
};

// Update cycle
exports.updateCycle = async (req, res, next) => {
  try {
    const cycle = await PresentationCycle.findById(req.params.id);
    if (!cycle) {
      return res.status(404).json({ message: 'Cycle not found' });
    }
    const { label, periodStart, periodEnd, presentationDate } = req.body;
    if (label) cycle.label = label;
    if (periodStart) cycle.periodStart = periodStart;
    if (periodEnd) cycle.periodEnd = periodEnd;
    if (presentationDate) {
      cycle.presentationDate = presentationDate;
      cycle.status = presentationDate > new Date() ? 'upcoming' : 'past';
    }
    await cycle.save();
    notifyResources(['cycles', 'analytics']);
    res.json(cycle);
  } catch (error) {
    next(error);
  }
};

// Delete cycle
exports.deleteCycle = async (req, res, next) => {
  try {
    const cycle = await PresentationCycle.findByIdAndDelete(req.params.id);
    if (!cycle) {
      return res.status(404).json({ message: 'Cycle not found' });
    }
    notifyResources(['cycles', 'analytics']);
    res.json({ message: 'Cycle deleted' });
  } catch (error) {
    next(error);
  }
};

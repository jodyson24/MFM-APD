const OrgUnit = require('../../models/OrgUnit');

exports.getOrgUnits = async (req, res, next) => {
  try {
    let filter = {};
    if (!req.user.isSuperAdmin) {
      filter._id = { $in: req.scope.orgUnitIds };
    }
    const units = await OrgUnit.find(filter).populate('parentId', 'name type');
    res.json(units);
  } catch (error) {
    next(error);
  }
};

// Get tree for frontend (nested)
exports.getOrgUnitTree = async (req, res, next) => {
  try {
    // For simplicity, return all units and let frontend build tree
    const units = await OrgUnit.find().lean();
    res.json(units);
  } catch (error) {
    next(error);
  }
};
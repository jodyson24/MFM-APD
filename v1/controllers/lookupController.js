const Division = require('../../models/Division');
const ActivityType = require('../../models/ActivityType');
const StrategicInitiative = require('../../models/StrategicInitiative');
const OrgUnit = require('../../models/OrgUnit');

// Active divisions
exports.getDivisions = async (req, res, next) => {
  try {
    const divisions = await Division.find({ isActive: true }).sort({ code: 1 });
    res.json(divisions);
  } catch (error) {
    next(error);
  }
};

// Active activity types
exports.getActivityTypes = async (req, res, next) => {
  try {
    const types = await ActivityType.find({ isActive: true }).sort({ code: 1 });
    res.json(types);
  } catch (error) {
    next(error);
  }
};

// Strategic initiatives catalogue (source-of-truth vocabulary, §4.2)
exports.getStrategicInitiatives = async (req, res, next) => {
  try {
    const initiatives = await StrategicInitiative.find().sort({ code: 1 });
    res.json(initiatives);
  } catch (error) {
    next(error);
  }
};

// Full org unit tree (scope-aware)
exports.getOrgUnitTree = async (req, res, next) => {
  try {
    let units;
    if (req.user.isSuperAdmin) {
      units = await OrgUnit.find().lean();
    } else {
      units = await OrgUnit.find({ _id: { $in: req.scope.orgUnitIds } }).lean();
    }

    const byId = {};
    units.forEach((u) => { byId[u._id.toString()] = { ...u, children: [] }; });

    const roots = [];
    units.forEach((u) => {
      const node = byId[u._id.toString()];
      const parentKey = u.parentId ? u.parentId.toString() : null;
      if (parentKey && byId[parentKey]) {
        byId[parentKey].children.push(node);
      } else {
        roots.push(node);
      }
    });
    res.json(roots);
  } catch (error) {
    next(error);
  }
};

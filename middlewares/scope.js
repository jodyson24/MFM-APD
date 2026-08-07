const mongoose = require('mongoose');
const OrgUnit = require('../models/OrgUnit');

/**
 * Middleware that attaches a scope condition to req.scope based on user's orgUnitId.
 * For users with roles that have visibility down the tree, we compute all descendant IDs.
 * For branch-level users, scope is just their own orgUnitId.
 */
exports.applyScope = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthenticated' });

    // Super admin sees everything
    if (user.isSuperAdmin) {
      req.scope = { all: true };
      return next();
    }

    const orgUnit = await OrgUnit.findById(user.orgUnitId);
    if (!orgUnit) {
      return res.status(400).json({ message: 'User has no valid org unit' });
    }

    // Determine visibility based on user's own unit type and role
    const { type, _id } = orgUnit;
    let allowedIds = [];

    if (type === 'mega_region' || user.role === 'mega_region_admin') {
      // See everything under this mega region
      const descendants = await getDescendantIds(_id);
      allowedIds = [_id, ...descendants];
    } else if (type === 'region' || user.role === 'region_admin') {
      const descendants = await getDescendantIds(_id);
      allowedIds = [_id, ...descendants];
    } else if (type === 'zone' || user.role === 'zone_admin') {
      const descendants = await getDescendantIds(_id);
      allowedIds = [_id, ...descendants];
    } else if (type === 'branch' || user.role === 'branch_admin' || user.role === 'pastor' || user.role === 'it_official') {
      allowedIds = [_id];
    } else {
      // Fallback: only own unit
      allowedIds = [_id];
    }

    req.scope = { orgUnitIds: allowedIds };
    next();
  } catch (error) {
    next(error);
  }
};

// Helper to get all descendant OrgUnit IDs using $graphLookup
async function getDescendantIds(rootId) {
  const result = await OrgUnit.aggregate([
    {
      $match: { _id: rootId }
    },
    {
      $graphLookup: {
        from: 'orgunits',
        startWith: '$_id',
        connectFromField: '_id',
        connectToField: 'parentId',
        as: 'descendants',
        depthField: 'depth',
      }
    },
    {
      $project: {
        ids: { $concatArrays: ['$_id', '$descendants._id'] }
      }
    }
  ]);
  if (result.length === 0) return [rootId];
  return result[0].ids.map(id => new mongoose.Types.ObjectId(id));
}
const mongoose = require('mongoose');
const OrgUnit = require('../models/OrgUnit');

/**
 * Middleware that attaches a scope condition to req.scope based on user's orgUnitId.
 * req.scope.orgUnitIds is an array of STRING ids the user may see (their own unit
 * plus all descendants, or everything when super admin).
 */
exports.applyScope = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthenticated' });

    // Super admin sees everything
    if (user.isSuperAdmin) {
      req.scope = { all: true, orgUnitIds: [] };
      return next();
    }

    const orgUnitId = user.orgUnitId?._id || user.orgUnitId;
    if (!orgUnitId) {
      return res.status(400).json({ message: 'User has no valid org unit' });
    }

    const orgUnit = await OrgUnit.findById(orgUnitId);
    if (!orgUnit) {
      return res.status(400).json({ message: 'User has no valid org unit' });
    }

    // Determine visibility based on user's own unit type and role
    const { type, _id } = orgUnit;
    let allowedIds = [_id];

    if (type === 'mega_region' || user.role === 'mega_region_admin') {
      // See everything under this mega region
      allowedIds = [_id, ...(await getDescendantIds(_id))];
    } else if (type === 'region' || user.role === 'region_admin') {
      allowedIds = [_id, ...(await getDescendantIds(_id))];
    } else if (type === 'zone' || user.role === 'zone_admin') {
      allowedIds = [_id, ...(await getDescendantIds(_id))];
    }
    // branch/pastor/it_official: own unit only (allowedIds stays [_id])

    // Normalize to strings so controllers can safely use .includes() with body/param values
    req.scope = { orgUnitIds: allowedIds.map((id) => id.toString()) };
    next();
  } catch (error) {
    next(error);
  }
};

// Helper to get all descendant OrgUnit IDs using $graphLookup
async function getDescendantIds(rootId) {
  const result = await OrgUnit.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(rootId) }
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
  if (result.length === 0) return [];
  return result[0].ids;
}

const mongoose = require('mongoose');
const OrgUnit = require('../../models/OrgUnit');
const { logAction } = require('../../services/auditService');
const { isSuperAdmin, canManageOrgUnits } = require('../../lib/permissions');
const { notifyResources } = require('../../lib/realtime');

// Hierarchy rule: what parent type(s) are allowed for each unit type.
// mega_region -> none (null); region -> mega_region; zone -> region OR mega_region; branch -> zone.
function requiredParentType(type) {
  const map = {
    mega_region: null,
    region: 'mega_region',
    zone: ['region', 'mega_region'],
    branch: 'zone',
  };
  return map[type];
}

// Super admin manages everything; any management user may only reach units
// inside their scope.
function canManage(req, unitId) {
  if (!canManageOrgUnits(req.user)) return false;
  if (isSuperAdmin(req.user)) return true;
  return req.scope.orgUnitIds.includes(unitId.toString());
}

// Enforce the single-HQ invariant: only one mega region may be flagged isHeadquarters.
async function clearOtherHeadquarters(keepId) {
  await OrgUnit.updateMany(
    { isHeadquarters: true, _id: { $ne: keepId } },
    { $set: { isHeadquarters: false } }
  );
}

// Validate that `parentId` is acceptable for a unit of `type`.
// Returns { ok: true } or { ok: false, message }.
async function assertParentForType(type, parentId, selfId = null) {
  const allowedParentTypes = requiredParentType(type);

  if (allowedParentTypes === null) {
    if (parentId && String(parentId) !== 'null') {
      return { ok: false, message: 'A mega region cannot have a parent.' };
    }
    return { ok: true };
  }

  if (!parentId) {
    const types = Array.isArray(allowedParentTypes) ? allowedParentTypes.join(' or ') : allowedParentTypes;
    return { ok: false, message: `A ${type} must be placed under a ${types}.` };
  }

  if (selfId && String(parentId) === String(selfId)) {
    return { ok: false, message: 'A unit cannot be its own parent.' };
  }

  const parent = await OrgUnit.findById(parentId);
  if (!parent) {
    return { ok: false, message: 'Parent org unit not found.' };
  }

  const parentTypes = Array.isArray(allowedParentTypes) ? allowedParentTypes : [allowedParentTypes];
  if (!parentTypes.includes(parent.type)) {
    const types = parentTypes.join(' or ');
    return { ok: false, message: `A ${type} must be under a ${types}, not a ${parent.type}.` };
  }
  return { ok: true };
}

// View all org units within the user's scope (super admin sees everything)
exports.getOrgUnits = async (req, res, next) => {
  try {
    const filter = {};
    if (!req.user.isSuperAdmin) {
      filter._id = { $in: req.scope.orgUnitIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }
    const units = await OrgUnit.find(filter)
      .populate('parentId', 'name type location')
      .sort({ type: 1, name: 1 });
    res.json(units);
  } catch (error) {
    next(error);
  }
};

// View a single org unit
exports.getOrgUnit = async (req, res, next) => {
  try {
    const unit = await OrgUnit.findById(req.params.id)
      .populate('parentId', 'name type location');
    if (!unit) {
      return res.status(404).json({ message: 'Org unit not found' });
    }
    if (!canManage(req, unit._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(unit);
  } catch (error) {
    next(error);
  }
};

// Create a region / zone / branch / mega region
exports.createOrgUnit = async (req, res, next) => {
  try {
    if (!canManageOrgUnits(req.user)) {
      return res.status(403).json({ message: 'Insufficient permissions to manage org units' });
    }

    const { type, name, location, parentId, isHeadquarters } = req.body;

    // Only a super admin can create a NEW mega region (nothing to scope it to)
    if (type === 'mega_region' && !isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Only a super admin can create a new mega region' });
    }

    // Management users may only create units inside their own scope
    if (parentId && !isSuperAdmin(req.user) && !req.scope.orgUnitIds.includes(parentId)) {
      return res.status(403).json({ message: 'Cannot create a unit outside your scope' });
    }

    const hierarchy = await assertParentForType(type, parentId || null);
    if (!hierarchy.ok) {
      return res.status(400).json({ message: hierarchy.message });
    }

    if (isHeadquarters) {
      if (type !== 'mega_region') {
        return res.status(400).json({ message: 'Only a mega region can be the headquarters.' });
      }
      // Demote any existing HQ before promoting the new one
      await OrgUnit.updateMany({ isHeadquarters: true }, { $set: { isHeadquarters: false } });
    }

    const unit = await OrgUnit.create({
      type,
      name,
      location: location || '',
      isHeadquarters: !!isHeadquarters,
      parentId: parentId || null,
    });

    logAction({
      userId: req.user._id,
      action: 'create_org_unit',
      entity: 'OrgUnit',
      entityId: unit._id,
      ipAddress: req.ip,
      meta: { type, name },
    });

    notifyResources(['orgunits']);
    res.status(201).json(unit);
  } catch (error) {
    next(error);
  }
};

// Update a region / zone / branch / mega region
exports.updateOrgUnit = async (req, res, next) => {
  try {
    const unit = await OrgUnit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({ message: 'Org unit not found' });
    }
    if (!canManage(req, unit._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { type, name, location, parentId, isHeadquarters } = req.body;

    const nextType = type || unit.type;
    const nextParent = parentId !== undefined ? parentId : unit.parentId;

    const hierarchy = await assertParentForType(nextType, nextParent || null, unit._id);
    if (!hierarchy.ok) {
      return res.status(400).json({ message: hierarchy.message });
    }

    // Prevent re-parenting under one of its own descendants (would break the tree).
    if (nextParent && String(nextParent) !== String(unit.parentId || '')) {
      const descendants = await getDescendantIds(unit._id);
      if (descendants.some((id) => String(id) === String(nextParent))) {
        return res.status(400).json({ message: 'Cannot move a unit under one of its own children.' });
      }
    }

    if (name) unit.name = name;
    if (location !== undefined) unit.location = location || '';
    if (type) unit.type = type;
    if (parentId !== undefined) unit.parentId = parentId || null;
    if (isHeadquarters !== undefined) {
      unit.isHeadquarters = !!isHeadquarters;
      if (unit.isHeadquarters) {
        if (unit.type !== 'mega_region') {
          return res.status(400).json({ message: 'Only a mega region can be the headquarters.' });
        }
        await clearOtherHeadquarters(unit._id);
      }
    }
    unit.updatedAt = new Date();
    await unit.save();

    logAction({
      userId: req.user._id,
      action: 'update_org_unit',
      entity: 'OrgUnit',
      entityId: unit._id,
      ipAddress: req.ip,
      meta: { type: unit.type, name: unit.name },
    });

    notifyResources(['orgunits']);
    res.json(unit);
  } catch (error) {
    next(error);
  }
};

// Delete a region / zone / branch / mega region (super admin only)
exports.deleteOrgUnit = async (req, res, next) => {
  try {
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ message: 'Only a super admin can delete org units' });
    }

    const unit = await OrgUnit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({ message: 'Org unit not found' });
    }

    if (unit.isHeadquarters) {
      return res.status(400).json({ message: 'The headquarters mega region cannot be deleted.' });
    }

    const children = await OrgUnit.countDocuments({ parentId: unit._id });
    if (children > 0) {
      return res.status(400).json({
        message: `This unit still has ${children} nested ${children === 1 ? 'unit' : 'units'}. Delete those first.`,
      });
    }

    await OrgUnit.findByIdAndDelete(unit._id);

    logAction({
      userId: req.user._id,
      action: 'delete_org_unit',
      entity: 'OrgUnit',
      entityId: unit._id,
      ipAddress: req.ip,
      meta: { type: unit.type, name: unit.name },
    });

    notifyResources(['orgunits']);
    res.json({ message: 'Org unit deleted' });
  } catch (error) {
    next(error);
  }
};

// Get tree for frontend (nested)
exports.getOrgUnitTree = async (req, res, next) => {
  try {
    const units = await OrgUnit.find().lean();
    res.json(units);
  } catch (error) {
    next(error);
  }
};

async function getDescendantIds(rootId) {
  const result = await OrgUnit.aggregate([
    { $match: { _id: rootId } },
    {
      $graphLookup: {
        from: 'orgunits',
        startWith: '$_id',
        connectFromField: '_id',
        connectToField: 'parentId',
        as: 'descendants',
      },
    },
    { $unwind: '$descendants' },
    { $replaceRoot: { newRoot: '$descendants' } },
  ]);
  return result.map((d) => d._id);
}
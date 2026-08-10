const Activity = require('../../models/Activity');
const OrgUnit = require('../../models/OrgUnit');
const PresentationCycle = require('../../models/PresentationCycle');

// Whitelist of fields the public surface may return — dates & names ONLY (§7.3).
// Never include reports, metrics, media, users, or internal notes.
const PUBLIC_FIELDS = {
  title: 1,
  scheduledDate: 1,
  scheduledEndDate: 1,
  orgUnitId: 1,
  status: 1,
};

// Only dates-and-names; hide any internal sub-document.
const PUBLIC_FILTER = {
  status: { $in: ['scheduled', 'completed'] },
  title: { $ne: null },
};

async function buildTree(units, activitiesByUnit) {
  const byId = {};
  units.forEach((u) => {
    byId[u._id.toString()] = {
      id: u._id.toString(),
      type: u.type,
      name: u.name,
      location: u.location || null,
      isHeadquarters: !!u.isHeadquarters,
      programmes: (activitiesByUnit.get(u._id.toString()) || []).map((a) => ({
        id: a._id.toString(),
        title: a.title,
        scheduledDate: a.scheduledDate,
        scheduledEndDate: a.scheduledEndDate || null,
        status: a.status,
      })),
      children: [],
    };
  });

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
  return roots;
}

// GET /public/dashboard — top-level view: mega regions + global presentation countdown
exports.getPublicDashboard = async (req, res, next) => {
  try {
    const megaRegions = await OrgUnit.find({ type: 'mega_region' }).lean();

    const activities = await Activity.find(
      { orgUnitId: { $in: megaRegions.map((m) => m._id) }, ...PUBLIC_FILTER },
      PUBLIC_FIELDS
    ).lean();

    const byUnit = new Map();
    activities.forEach((a) => {
      const key = a.orgUnitId.toString();
      if (!byUnit.has(key)) byUnit.set(key, []);
      byUnit.get(key).push(a);
    });

    const programmes = megaRegions.map((m) => ({
      id: m._id.toString(),
      name: m.name,
      location: m.location || null,
      isHeadquarters: !!m.isHeadquarters,
      programmes: (byUnit.get(m._id.toString()) || []).map((a) => ({
        id: a._id.toString(),
        title: a.title,
        scheduledDate: a.scheduledDate,
        scheduledEndDate: a.scheduledEndDate || null,
        status: a.status,
      })),
    }));

    const headquarters = megaRegions.find((m) => m.isHeadquarters) || null;

    const now = new Date();
    const nextCycle = await PresentationCycle.findOne({
      presentationDate: { $gte: now },
    }).sort({ presentationDate: 1 }).lean();

    res.json({
      headquarters: headquarters
        ? { id: headquarters._id.toString(), name: headquarters.name, location: headquarters.location }
        : null,
      programmes,
      nextPresentationDate: nextCycle ? nextCycle.presentationDate : null,
      nextPresentationLabel: nextCycle ? nextCycle.label : null,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

// GET /public/tree — drill-down by Region → Zone → Branch (names + dates only)
exports.getPublicTree = async (req, res, next) => {
  try {
    const units = await OrgUnit.find().lean();
    const activities = await Activity.find(PUBLIC_FILTER, PUBLIC_FIELDS).lean();

    const byUnit = new Map();
    activities.forEach((a) => {
      const key = a.orgUnitId.toString();
      if (!byUnit.has(key)) byUnit.set(key, []);
      byUnit.get(key).push(a);
    });

    const tree = await buildTree(units, byUnit);
    res.json(tree);
  } catch (error) {
    next(error);
  }
};

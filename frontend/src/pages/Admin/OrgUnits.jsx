import React, { useState, useMemo, useCallback } from 'react';
import api from '../../api/client.js';
import { useAuth, useAppData, useToast } from '../../context/index.js';
import { ORG_TYPES } from '../../utils/constants.js';
import { isSuperAdmin, canManageOrgUnits } from '../../utils/permissions.js';
import { Card, PageHeader, Button, Loading, EmptyState, Modal } from '../../components/ui/index.js';
import {
  PlusIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  PencilIcon,
  TrashIcon,
  HomeModernIcon,
  MapIcon,
  FlagIcon,
  Squares2X2Icon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

// Parent-type required per unit type (mirrors the backend hierarchy rule)
const PARENT_TYPE = {
  mega_region: null,
  region: 'mega_region',
  zone: ['region', 'mega_region'],
  branch: 'zone',
};

// Child type produced by each unit type (reverse of PARENT_TYPE)
const CHILD_TYPE = {
  mega_region: 'region',
  region: 'zone',
  zone: 'branch',
  branch: null,
};

const TYPE_META = {
  mega_region: {
    icon: BuildingOffice2Icon,
    label: 'Mega Region',
    plural: 'Mega Regions',
    tile: 'bg-purple-100 text-purple-700',
    strip: 'bg-gradient-to-r from-purple-600 to-purple-400',
    dot: 'bg-purple-500',
  },
  region: {
    icon: MapIcon,
    label: 'Region',
    plural: 'Regions',
    tile: 'bg-blue-100 text-blue-700',
    strip: 'bg-gradient-to-r from-blue-600 to-blue-400',
    dot: 'bg-blue-500',
  },
  zone: {
    icon: Squares2X2Icon,
    label: 'Zone',
    plural: 'Zones',
    tile: 'bg-amber-100 text-amber-700',
    strip: 'bg-gradient-to-r from-amber-500 to-amber-400',
    dot: 'bg-amber-500',
  },
  branch: {
    icon: FlagIcon,
    label: 'Branch',
    plural: 'Branches',
    tile: 'bg-emerald-100 text-emerald-700',
    strip: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
    dot: 'bg-emerald-500',
  },
};

const COUNT_LABELS = {
  megaRegions: 'Mega Regions',
  regions: 'Regions',
  zones: 'Zones',
  branches: 'Branches',
};

// Display order when separating children by type
const TYPE_ORDER = { region: 0, zone: 1, branch: 2 };

const UnitActions = ({ unit, canManage, canDelete, onEdit, onDelete }) =>
  canManage ? (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => onEdit(unit)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
      >
        <PencilIcon className="h-3.5 w-3.5" />
        Edit
      </button>
      {canDelete && !unit.isHeadquarters && (
        <button
          type="button"
          onClick={() => onDelete(unit)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
        >
          <TrashIcon className="h-3.5 w-3.5" />
          Delete
        </button>
      )}
    </div>
  ) : null;

// Group a unit's direct children by type so regions, zones and branches are
// displayed as separate labelled sections instead of one mixed grid.
const ChildGroups = ({ children, depth, canManage, canDelete, onEdit, onDelete }) => {
  if (!children?.length) return null;

  const groups = useMemo(() => {
    const byType = {};
    children.forEach((c) => {
      (byType[c.type] = byType[c.type] || []).push(c);
    });
    return Object.entries(byType)
      .sort(([a], [b]) => (TYPE_ORDER[a] ?? 9) - (TYPE_ORDER[b] ?? 9))
      .map(([type, items]) => ({ type, items }));
  }, [children]);

  return (
    <div className="space-y-5">
      {groups.map(({ type, items }) => {
        const meta = TYPE_META[type] || TYPE_META.branch;
        return (
          <div key={type}>
            <div className="mb-3 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink-500">{meta.plural}</h4>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-ink-500 ring-1 ring-ink-200">
                {items.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              {items.map((c) => (
                <UnitCard
                  key={c._id}
                  unit={c}
                  depth={depth + 1}
                  canManage={canManage}
                  canDelete={canDelete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// A collapsible card for one org unit. Root mega regions render as large solid
// cards; nested units render as smaller panels. Children are always separated
// into per-type labelled groups.
const UnitCard = ({ unit, depth = 0, canManage, canDelete, onEdit, onDelete }) => {
  const meta = TYPE_META[unit.type] || TYPE_META.branch;
  const Icon = meta.icon;
  const isRoot = depth === 0;
  const hasChildren = unit.children?.length > 0;
  const [expanded, setExpanded] = useState(isRoot);

  const directChildLabel = CHILD_TYPE[unit.type]
    ? `${unit.children?.length || 0} ${unit.children?.length === 1 ? TYPE_META[CHILD_TYPE[unit.type]].label.toLowerCase() : TYPE_META[CHILD_TYPE[unit.type]].plural.toLowerCase()}`
    : '';

  const toggle = () => hasChildren && setExpanded((v) => !v);

  const ChevronButton = (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={expanded}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 transition ${
        expanded
          ? 'bg-brand-50 text-brand-600 ring-brand-200'
          : 'text-ink-500 ring-ink-200 hover:bg-ink-100'
      }`}
    >
      <ChevronDownIcon
        className={`h-5 w-5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
      />
    </button>
  );

  if (isRoot) {
    return (
      <div className="card h-full overflow-hidden shadow-elevated">
        <div className={`h-1.5 w-full ${meta.strip}`} />
        <div className="flex items-start gap-3.5 p-5">
          <button
            type="button"
            onClick={toggle}
            className="flex min-w-0 flex-1 items-start gap-3.5 text-left"
          >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm ${meta.tile}`}>
              <Icon className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="badge bg-ink-100 text-ink-700">{meta.label}</span>
                {unit.isHeadquarters && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                    <HomeModernIcon className="h-3.5 w-3.5" />
                    HQ
                  </span>
                )}
              </span>
              <span className="mt-1 block truncate text-lg font-bold text-ink-900">{unit.name}</span>
              <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
                {unit.location ? (
                  <>
                    <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{unit.location}</span>
                  </>
                ) : (
                  'No location set'
                )}
              </span>
            </span>
          </button>
          {hasChildren && ChevronButton}
          <UnitActions unit={unit} canManage={canManage} canDelete={canDelete} onEdit={onEdit} onDelete={onDelete} />
        </div>

        {expanded && (
          <div className="animate-in border-t border-ink-100 bg-ink-50/40 px-5 pb-5">
            {hasChildren ? (
              <div className="pt-4">
                <ChildGroups
                  children={unit.children}
                  depth={depth}
                  canManage={canManage}
                  canDelete={canDelete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            ) : (
              <p className="pt-4 text-sm text-ink-400">No child units under this mega region yet.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden rounded-xl bg-white ring-1 ring-ink-100">
      <div className={`h-1 w-full ${meta.strip}`} />
      <div className="flex items-start gap-2.5 p-3.5">
        <button
          type="button"
          onClick={toggle}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.tile}`}>
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink-900">{unit.name}</span>
            <span className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-500">
              {unit.location ? (
                <>
                  <MapPinIcon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{unit.location}</span>
                </>
              ) : (
                'No location set'
              )}
            </span>
          </span>
          <span className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {unit.isHeadquarters && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                <HomeModernIcon className="h-3 w-3" />
                HQ
              </span>
            )}
            {hasChildren && (
              <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-bold text-ink-600">
                {directChildLabel}
              </span>
            )}
          </span>
        </button>
        {hasChildren && ChevronButton}
        <UnitActions unit={unit} canManage={canManage} canDelete={canDelete} onEdit={onEdit} onDelete={onDelete} />
      </div>

      {expanded && hasChildren && (
        <div className="animate-in border-t border-ink-100 bg-ink-50/40 p-3.5">
          <ChildGroups
            children={unit.children}
            depth={depth}
            canManage={canManage}
            canDelete={canDelete}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  );
};

const OrgUnits = () => {
  const { user } = useAuth();
  const { orgUnits: units, loading, addOrgUnit, updateOrgUnit, removeOrgUnit } = useAppData();
  const { showToast } = useToast();
  const canManage = canManageOrgUnits(user);
  const canDelete = isSuperAdmin(user);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // unit being edited (or null = create)
  const [form, setForm] = useState({ name: '', location: '', type: 'branch', parentId: '', isHeadquarters: false });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Build a flat map for quick lookup and parent-child relationships
  const unitMap = useMemo(() => {
    const map = new Map();
    units.forEach((u) => map.set(u._id, { ...u, children: [] }));
    units.forEach((u) => {
      const parentKey = u.parentId?._id || u.parentId;
      if (parentKey && map.has(parentKey)) {
        map.get(parentKey).children.push(map.get(u._id));
      }
    });
    return map;
  }, [units]);

  // Flatten tree to an array of root nodes in display order
  const tree = useMemo(() => {
    const roots = [];
    unitMap.forEach((u) => {
      const parentKey = u.parentId?._id || u.parentId;
      if (!parentKey || !unitMap.has(parentKey)) roots.push(u);
    });
    const sortRec = (nodes) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach((n) => sortRec(n.children));
      return nodes;
    };
    return sortRec(roots);
  }, [unitMap]);

  const headquarters = units.find((u) => u.isHeadquarters);

  const lists = useMemo(() => {
    const byType = (type) =>
      units
        .filter((u) => u.type === type)
        .sort((a, b) => a.name.localeCompare(b.name));
    return {
      megaRegions: byType('mega_region'),
      regions: byType('region'),
      zones: byType('zone'),
      branches: byType('branch'),
    };
  }, [units]);

  // Parent options filtered by the selected type's required parent type
  const parentOptions = useMemo(() => {
    const parentTypes = PARENT_TYPE[form.type];
    if (!parentTypes) return [];
    const allowedParentTypes = Array.isArray(parentTypes) ? parentTypes : [parentTypes];
    return units
      .filter((u) => allowedParentTypes.includes(u.type))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [units, form.type]);

  const parentLabel = useMemo(() => {
    const parentTypes = PARENT_TYPE[form.type];
    if (!parentTypes) return '';
    const allowedParentTypes = Array.isArray(parentTypes) ? parentTypes : [parentTypes];
    return allowedParentTypes.map((type) => ORG_TYPES[type]).join(' or ');
  }, [form.type]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', location: '', type: 'branch', parentId: '', isHeadquarters: false });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (unit) => {
    setEditing(unit);
    setForm({
      name: unit.name,
      location: unit.location || '',
      type: unit.type,
      parentId: unit.parentId?._id || unit.parentId || '',
      isHeadquarters: !!unit.isHeadquarters,
    });
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) return setFormError('Name is required.');
    const parentTypes = PARENT_TYPE[form.type];
    const allowedParentTypes = Array.isArray(parentTypes) ? parentTypes : [parentTypes];
    if (parentTypes && !form.parentId) {
      return setFormError(`Select the parent ${allowedParentTypes.map((type) => ORG_TYPES[type]).join(' or ')} for this ${form.type}.`);
    }
    const payload = {
      name: form.name.trim(),
      location: form.location.trim(),
      type: form.type,
      parentId: parentTypes ? form.parentId : null,
      isHeadquarters: form.isHeadquarters,
    };
    setSaving(true);
    try {
      if (editing) {
        const { data: updatedUnit } = await api.put(`/org-units/${editing._id}`, payload);
        updateOrgUnit(updatedUnit);
        setModalOpen(false);
        showToast({ type: 'success', title: 'Org unit updated', message: `"${updatedUnit.name}" was saved successfully.` });
      } else {
        const { data: createdUnit } = await api.post('/org-units', payload);
        addOrgUnit(createdUnit);
        setModalOpen(false);
        showToast({ type: 'success', title: 'Org unit created', message: `"${createdUnit.name}" was added${parentLabel ? ` under ${parentLabel}` : ''}.` });
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to save org unit', message: err.response?.data?.message || 'Something went wrong. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/org-units/${deleteTarget._id}`);
      removeOrgUnit(deleteTarget._id);
      showToast({ type: 'success', title: 'Org unit deleted', message: `"${deleteTarget.name}" was removed.` });
      setDeleteTarget(null);
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to delete org unit', message: err.response?.data?.message || 'Something went wrong. Please try again.' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Loading full label="Loading org units…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Org Structure"
        subtitle="Manage the regions, zones and branches of the mega regional headquarters."
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              Add Unit
            </Button>
          )
        }
      />

      {/* Headquarters banner — the mega region this application serves */}
      {headquarters && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100/60 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <HomeModernIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
              Mega Regional Headquarters
            </p>
            <p className="text-base font-semibold text-ink-900">
              {headquarters.name}
              {headquarters.location && (
                <span className="font-normal text-ink-500"> — {headquarters.location}</span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-ink-500">
              This is the hub the application is built for. Everything in the dashboard is scoped to it.
            </p>
          </div>
        </div>
      )}

      {/* Summary counts */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Object.entries(lists).map(([key, list]) => (
          <Card key={key} className="items-center p-5 text-center">
            <p className="text-3xl font-bold text-brand-700">{list.length}</p>
            <p className="mt-1 text-sm font-medium capitalize text-ink-500">
              {COUNT_LABELS[key]}
            </p>
          </Card>
        ))}
      </div>

      <Card padded={false}>
        {units.length === 0 ? (
          <EmptyState
            icon={BuildingOffice2Icon}
            title="No org units yet"
            description="Add the HQ mega region and its regions, zones and branches."
            action={
              canManage && (
                <Button onClick={openCreate}>
                  <PlusIcon className="h-4 w-4" />
                  Add Unit
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-4 p-5">
            {tree.map((unit) => (
              <UnitCard
                key={unit._id}
                unit={unit}
                canManage={canManage}
                canDelete={canDelete}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Add / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? `Edit ${ORG_TYPES[editing.type] || editing.type}` : 'Add Org Unit'}
        subtitle={
          editing
            ? `Update the details of "${editing.name}".`
            : `A ${form.type === 'mega_region' ? 'mega region has no parent' : `${form.type} must sit under a parent ${parentLabel || 'unit'}`}; give it a name and location.`
        }
        icon={editing ? PencilIcon : BuildingOffice2Icon}
        size="md"
      >
        <form id="org-unit-form" onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Unit Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value, parentId: '' }))}
              className="input"
            >
              <option value="mega_region">Mega Region</option>
              <option value="region">Region</option>
              <option value="zone">Zone</option>
              <option value="branch">Branch</option>
            </select>
          </div>
          <div>
            <label className="field-label">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="input"
              placeholder="e.g. Kubwa Zone"
            />
          </div>
          <div>
            <label className="field-label">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="input"
              placeholder="Town / area, e.g. Kubwa, Abuja"
            />
          </div>
          {PARENT_TYPE[form.type] ? (
            <div>
              <label className="field-label">Parent {parentLabel}</label>
              <select
                value={form.parentId}
                onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                className="input"
              >
                <option value="">Select…</option>
                {parentOptions.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                    {p.location ? ` · ${p.location}` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-end pb-1">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-ink-700">
                <input
                  type="checkbox"
                  checked={form.isHeadquarters}
                  onChange={(e) => setForm((f) => ({ ...f, isHeadquarters: e.target.checked }))}
                  className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                />
                Mark as Mega Regional HQ
              </label>
            </div>
          )}

          {formError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}
        </form>

        <div className="mt-6 flex justify-end gap-3 border-t border-ink-100 pt-4">
          <Button type="button" variant="secondary" onClick={closeModal}>
            Cancel
          </Button>
          <Button type="submit" form="org-unit-form" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Unit'}
          </Button>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Delete Org Unit"
        subtitle={deleteTarget ? `${ORG_TYPES[deleteTarget.type] || deleteTarget.type} · ${deleteTarget.name}` : 'Confirm deletion'}
        icon={TrashIcon}
        size="sm"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={confirmDelete}
              disabled={deleting}
              className="gap-1.5"
            >
              <TrashIcon className="h-4 w-4" />
              {deleting ? 'Deleting…' : 'Delete Unit'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-ink-600">
            This will permanently remove{' '}
            <strong>{deleteTarget?.name}</strong>
            {deleteTarget?.type && ` (${ORG_TYPES[deleteTarget.type] || deleteTarget.type})`} from the
            org structure. This action cannot be undone.
          </p>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Warning: any child units nested under this unit must be removed first.
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrgUnits;

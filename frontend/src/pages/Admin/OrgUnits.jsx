import React, { useState, useMemo, useCallback } from 'react';
import api from '../../api/client.js';
import { useAuth, useAppData } from '../../context/index.js';
import { ORG_TYPES } from '../../utils/constants.js';
import { isSuperAdmin, canManageOrgUnits } from '../../utils/permissions.js';
import { Card, PageHeader, Button, Loading, EmptyState } from '../../components/ui/index.js';
import {
  PlusIcon,
  XMarkIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  HomeModernIcon,
  MapIcon,
  FlagIcon,
  Squares2X2Icon,
  ChevronDownIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  verticalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

const TYPE_TONE = {
  mega_region: 'bg-purple-100 text-purple-700',
  region: 'bg-blue-100 text-blue-700',
  zone: 'bg-amber-100 text-amber-800',
  branch: 'bg-emerald-100 text-emerald-700',
};

const TYPE_META = {
  mega_region: {
    icon: BuildingOffice2Icon,
    label: 'Mega Region',
    tile: 'bg-purple-100 text-purple-700',
    strip: 'bg-gradient-to-r from-purple-600 to-purple-400',
    dot: 'bg-purple-500',
  },
  region: {
    icon: MapIcon,
    label: 'Region',
    tile: 'bg-blue-100 text-blue-700',
    strip: 'bg-gradient-to-r from-blue-600 to-blue-400',
    dot: 'bg-blue-500',
  },
  zone: {
    icon: Squares2X2Icon,
    label: 'Zone',
    tile: 'bg-amber-100 text-amber-700',
    strip: 'bg-gradient-to-r from-amber-500 to-amber-400',
    dot: 'bg-amber-500',
  },
  branch: {
    icon: FlagIcon,
    label: 'Branch',
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

// A collapsible card for one org unit. Root mega regions render as large solid
// cards; nested units render as smaller panels that expand to reveal deeper levels.
const UnitCard = ({ unit, depth = 0, canManage, canDelete, onEdit, onDelete }) => {
  const meta = TYPE_META[unit.type] || TYPE_META.branch;
  const Icon = meta.icon;
  const isRoot = depth === 0;
  const hasChildren = unit.children?.length > 0;
  const [expanded, setExpanded] = useState(isRoot);

  const childCounts = useMemo(() => {
    const counts = {};
    const walk = (nodes) =>
      nodes.forEach((n) => {
        counts[n.type] = (counts[n.type] || 0) + 1;
        if (n.children?.length) walk(n.children);
      });
    walk(unit.children || []);
    return counts;
  }, [unit]);

  const directChildLabel = CHILD_TYPE[unit.type]
    ? `${unit.children?.length || 0} ${ORG_TYPES[CHILD_TYPE[unit.type]]}${
        unit.children?.length !== 1 ? 's' : ''
      }`
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
                <span className={`badge ${TYPE_TONE[unit.type]}`}>{meta.label}</span>
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
            <div className="flex flex-wrap gap-2 pt-4">
              {['region', 'zone', 'branch'].map(
                (t) =>
                  childCounts[t] > 0 && (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-600 ring-1 ring-ink-200"
                    >
                      <span className={`h-2 w-2 rounded-full ${TYPE_META[t].dot}`} />
                      {childCounts[t]} {ORG_TYPES[t]}
                      {childCounts[t] !== 1 ? 's' : ''}
                    </span>
                  )
              )}
            </div>
            {hasChildren ? (
              <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2">
                {unit.children.map((c) => (
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
            ) : (
              <p className="mt-4 text-sm text-ink-400">No child units under this mega region yet.</p>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {unit.children.map((c) => (
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
      )}
    </div>
  );
};

const SortableUnitCard = ({ unit, canManage, canDelete, onEdit, onDelete, units, onMove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: unit._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex items-center gap-2 p-2 rounded-lg hover:bg-ink-50 transition"
        aria-label={`Drag to reorder ${unit.name}`}
      >
        <ArrowsUpDownIcon className="h-5 w-5 text-ink-300" />
      </div>
      <UnitCard
        unit={unit}
        canManage={canManage}
        canDelete={canDelete}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
};

const OrgUnits = () => {
  const { user } = useAuth();
  const { orgUnits: units, loading, addOrgUnit, updateOrgUnit, removeOrgUnit } = useAppData();
  const canManage = canManageOrgUnits(user);
  const canDelete = isSuperAdmin(user);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // unit being edited (or null = create)
  const [form, setForm] = useState({ name: '', location: '', type: 'branch', parentId: '', isHeadquarters: false });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  // Drag-and-drop handlers
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onMove(active.id, over.id);
    }
  }, []);

  const handleMove = useCallback(async (activeId, overId) => {
    const activeUnit = units.find((u) => u._id === activeId);
    const overUnit = units.find((u) => u._id === overId);
    if (!activeUnit || !overUnit) return;

    // Only allow moving within the same parent (same level)
    const activeParentId = activeUnit.parentId?._id || activeUnit.parentId;
    const overParentId = overUnit.parentId?._id || overUnit.parentId;

    if (activeParentId !== overParentId) {
      setError('Units can only be reordered within the same parent. Use Edit to change parent.');
      return;
    }

    try {
      // Find the index of active and over units in their parent's children array
      const parent = unitMap.get(activeParentId);
      const children = parent?.children || [];
      const oldIndex = children.findIndex((c) => c._id === activeId);
      const newIndex = children.findIndex((c) => c._id === overId);

      if (oldIndex === -1 || newIndex === -1) return;

      // Reorder locally first for immediate UI feedback
      const newChildren = Array.from(children);
      const [moved] = newChildren.splice(oldIndex, 1);
      newChildren.splice(newIndex, 0, moved);

      // Update the unit's position via API (we'll send the new parent and rely on server to order by name)
      // For true drag-drop ordering, we'd need a sortOrder field. For now, just update parentId.
      await api.put(`/org-units/${activeId}`, { ...activeUnit, parentId: activeParentId });
      setMessage('Unit reordered successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reorder unit');
    }
  }, [units, unitMap]);

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

  const Alert = ({ tone = 'info', children }) => (
    <div
      className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm ${
        tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      {tone === 'success' ? (
        <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
      ) : (
        <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
      )}
      <span>{children}</span>
    </div>
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', location: '', type: 'branch', parentId: '', isHeadquarters: false });
    setError('');
    setShowForm(true);
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
    setError('');
    setShowForm(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!form.name.trim()) return setError('Name is required.');
    const parentTypes = PARENT_TYPE[form.type];
    const allowedParentTypes = Array.isArray(parentTypes) ? parentTypes : [parentTypes];
    if (parentTypes && !form.parentId) {
      const parentLabel = allowedParentTypes.map((type) => ORG_TYPES[type]).join(' or ');
      return setError(`Select the parent ${parentLabel} for this ${form.type}.`);
    }
    const payload = {
      name: form.name.trim(),
      location: form.location.trim(),
      type: form.type,
      parentId: parentTypes ? form.parentId : null,
      isHeadquarters: form.isHeadquarters,
    };
    try {
      if (editing) {
        const { data: updatedUnit } = await api.put(`/org-units/${editing._id}`, payload);
        updateOrgUnit(updatedUnit);
        setMessage('Org unit updated.');
      } else {
        const { data: createdUnit } = await api.post('/org-units', payload);
        addOrgUnit(createdUnit);
        setMessage('Org unit created.');
      }
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save org unit');
    }
  };

  const onDelete = async (unit) => {
    if (!window.confirm(`Delete ${unit.type} "${unit.name}"? Nested units must be removed first.`)) return;
    try {
      await api.delete(`/org-units/${unit._id}`);
      removeOrgUnit(unit._id);
      setMessage('Org unit deleted.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete org unit');
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
            <Button onClick={() => (showForm ? setShowForm(false) : openCreate())} variant={showForm ? 'secondary' : 'primary'}>
              {showForm ? (
                <>
                  <XMarkIcon className="h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <PlusIcon className="h-4 w-4" />
                  Add Region / Zone / Branch
                </>
              )}
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

      {message && <Alert tone="success">{message}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

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

      {showForm && (
        <Card className="animate-in">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <BuildingOffice2Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-900">
                {editing ? `Edit ${ORG_TYPES[editing.type] || editing.type}` : 'Add Org Unit'}
              </h2>
              <p className="text-xs text-ink-500">
                A {form.type === 'mega_region' ? 'mega region has no parent' : `${form.type} must sit under its parent type`}; give it a name and location.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <label className="field-label">
                  Parent{' '}
                  {(Array.isArray(PARENT_TYPE[form.type])
                    ? PARENT_TYPE[form.type].map((type) => ORG_TYPES[type]).join(' or ')
                    : ORG_TYPES[PARENT_TYPE[form.type]])}
                </label>
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
            <div className="flex justify-end gap-3 sm:col-span-2">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit">{editing ? 'Save Changes' : 'Create Unit'}</Button>
            </div>
          </form>
        </Card>
      )}

      <Card padded={false}>
        {units.length === 0 ? (
          <EmptyState
            icon={BuildingOffice2Icon}
            title="No org units yet"
            description="Add the HQ mega region and its regions, zones and branches."
          />
        ) : (
          <DndContext
            collisionDetection={closestCenter}
            sensors={useSensors(
              useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
              useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
            )}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={tree.map((u) => u._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {tree.map((unit) => (
                  <SortableUnitCard
                    key={unit._id}
                    unit={unit}
                    canManage={canManage}
                    canDelete={canDelete}
                    onEdit={openEdit}
                    onDelete={onDelete}
                    units={units}
                    onMove={handleMove}
                  />
                ))}
              </div>
              <DragOverlay>
                {({ active }) => {
                  if (!active) return null;
                  const unit = units.find((u) => u._id === active.id);
                  if (!unit) return null;
                  return (
                    <div className="card p-4 shadow-xl w-72 ring-2 ring-brand-500">
                      <div className="flex items-center gap-2">
                        <ArrowsUpDownIcon className="h-5 w-5 text-brand-600" />
                        <span className="text-sm font-semibold text-ink-900">{unit?.name}</span>
                      </div>
                    </div>
                  );
                }}
              </DragOverlay>
            </SortableContext>
          </DndContext>
        )}
      </Card>
    </div>
  );
};

export default OrgUnits;
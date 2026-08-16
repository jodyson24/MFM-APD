import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client.js';
import ActivityCard from '../../components/common/ActivityCard.jsx';
import { useRealtime } from '../../hooks/useRealtime.js';
import {
  Card,
  PageHeader,
  Loading,
  EmptyState,
  Button,
  StatCard,
  Badge,
} from '../../components/ui/index.js';
import { useAuth, useAppData } from '../../context/index.js';
import {
  PlusIcon,
  CalendarDaysIcon,
  LightBulbIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  Squares2X2Icon,
  UserCircleIcon,
  BookOpenIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

const STATUS_OPTIONS = ['scheduled', 'completed', 'not_held', 'cancelled', 'postponed'];
const LEVEL_LABELS = { mega_region: 'Mega Region', region: 'Region', zone: 'Zone', branch: 'Branch' };
const FREQ_LABELS = { megaRegion: 'Mega Region', region: 'Region', zone: 'Zone', branch: 'Branch' };
const UNIT_TYPE_LABELS = { mega_region: 'Mega Region', region: 'Region', zone: 'Zone', branch: 'Branch' };

const TABS = [
  { key: 'overview', label: 'Overview', icon: Squares2X2Icon },
  { key: 'mine', label: 'My Activity', icon: UserCircleIcon },
  { key: 'catalog', label: 'Categories & Types', icon: BookOpenIcon },
];

const formatLevels = (levels) => {
  if (!levels || !levels.length) return 'All levels';
  const all = Object.keys(LEVEL_LABELS);
  const sorted = [...levels].sort((a, b) => all.indexOf(a) - all.indexOf(b));
  return sorted.length === all.length
    ? 'All levels'
    : sorted.map((l) => LEVEL_LABELS[l] || l).join(', ');
};

const Activities = () => {
  const { user } = useAuth();
  const { orgUnits } = useAppData();
  const [tab, setTab] = useState('overview');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [filters, setFilters] = useState({ status: '', category: '', division: '' });

  const myUnitId =
    user?.orgUnitId?._id || (typeof user?.orgUnitId === 'string' ? user.orgUnitId : '') || '';
  const [selectedUnitId, setSelectedUnitId] = useState(myUnitId);
  const [mineActivities, setMineActivities] = useState([]);
  const [mineLoading, setMineLoading] = useState(false);

  const loadAll = useCallback(() => {
    Promise.all([
      api.get('/activities'),
      api.get('/lookups/activity-categories').catch(() => ({ data: [] })),
      api.get('/lookups/activity-types').catch(() => ({ data: [] })),
      api.get('/lookups/divisions').catch(() => ({ data: [] })),
    ])
      .then(([actRes, catRes, typeRes, divRes]) => {
        setActivities(actRes.data);
        setCategories(catRes.data);
        setTypes(typeRes.data);
        setDivisions(divRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const loadMine = useCallback(() => {
    if (tab !== 'mine' || !selectedUnitId) return;
    setMineLoading(true);
    api
      .get('/activities', { params: { unitId: selectedUnitId } })
      .then((res) => setMineActivities(res.data))
      .catch(() => setMineActivities([]))
      .finally(() => setMineLoading(false));
  }, [tab, selectedUnitId]);

  useEffect(() => {
    if (!selectedUnitId && myUnitId) setSelectedUnitId(myUnitId);
  }, [selectedUnitId, myUnitId]);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  // Live refresh when activities or lookup catalogs change elsewhere.
  useRealtime(['activities', 'lookups'], () => {
    loadAll();
    loadMine();
  });

  const now = new Date();
  const needsFollowUp = (a) => a.status === 'scheduled' && new Date(a.scheduledDate) < now;

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (filters.status && a.status !== filters.status) return false;
      if (filters.category && a.activityTypeId?.activityCategoryId?._id !== filters.category)
        return false;
      if (filters.division && !(a.divisions || []).some((d) => (d._id || d) === filters.division))
        return false;
      return true;
    });
  }, [activities, filters]);

  const stats = useMemo(() => {
    return {
      total: activities.length,
      scheduled: activities.filter((a) => a.status === 'scheduled').length,
      needsFollowUp: activities.filter(needsFollowUp).length,
      completed: activities.filter((a) => a.status === 'completed').length,
    };
  }, [activities]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    for (const a of activities) {
      const cat = a.activityTypeId?.activityCategoryId;
      const key = cat?._id || 'uncategorised';
      if (!map[key]) {
        map[key] = { count: 0, name: cat?.name || 'Uncategorised', code: cat?.code, tier: cat?.tier };
      }
      map[key].count += 1;
    }
    return Object.values(map).sort((x, y) => y.count - x.count);
  }, [activities]);

  const catalog = useMemo(() => {
    const byCat = new Map();
    for (const t of types) {
      const catId = t.activityCategoryId?._id || 'uncategorised';
      if (!byCat.has(catId)) byCat.set(catId, []);
      byCat.get(catId).push(t);
    }
    return categories
      .map((c) => ({ ...c, types: byCat.get(c._id) || [] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, types]);

  const unitGroups = useMemo(() => {
    const groups = {};
    for (const u of orgUnits) {
      if (!groups[u.type]) groups[u.type] = [];
      groups[u.type].push(u);
    }
    return Object.keys(groups)
      .sort()
      .map((type) => ({ type, units: groups[type] }));
  }, [orgUnits]);

  const selectedUnit = orgUnits.find((u) => u._id === selectedUnitId) || null;

  const selectCls = 'input cursor-pointer';

  const renderFilters = () => (
    <Card>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="field-label">Status</label>
          <select
            className={selectCls}
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="capitalize">
                {(s || '').replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Category</label>
          <select
            className={selectCls}
            value={filters.category}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Division</label>
          <select
            className={selectCls}
            value={filters.division}
            onChange={(e) => setFilters((f) => ({ ...f, division: e.target.value }))}
          >
            <option value="">All divisions</option>
            {divisions.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {(filters.status || filters.category || filters.division) && (
        <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
          <p className="text-xs text-ink-500">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} ·{' '}
            {filtered.filter(needsFollowUp).length} need follow-up
          </p>
          <button
            onClick={() => setFilters({ status: '', category: '', division: '' })}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            Clear filters
          </button>
        </div>
      )}
    </Card>
  );

  const renderActivityGrid = (items, emptyTitle, emptyDescription) => (
    items.length === 0 ? (
      <Card>
        <EmptyState icon={CalendarDaysIcon} title={emptyTitle} description={emptyDescription} />
      </Card>
    ) : (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((a) => (
          <ActivityCard key={a._id} activity={a} />
        ))}
      </div>
    )
  );

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Activities" value={stats.total} hint="Across your scope" icon={Squares2X2Icon} tone="brand" />
        <StatCard label="Scheduled" value={stats.scheduled} hint="Upcoming and current" icon={CalendarDaysIcon} tone="blue" />
        <StatCard label="Need Follow-Up" value={stats.needsFollowUp} hint="Date passed, not reported" icon={ClipboardDocumentCheckIcon} tone="amber" />
        <StatCard label="Completed" value={stats.completed} hint="Held and reported" icon={CheckCircleIcon} tone="green" />
      </div>

      {renderFilters()}

      {categoryBreakdown.length > 0 && (
        <Card>
          <div className="mb-3">
            <h2 className="text-base font-semibold text-ink-900">By Category</h2>
            <p className="text-xs text-ink-500">Activities grouped by their compliance category.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {categoryBreakdown.map((c) => (
              <div
                key={c.code || c.name}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ring-1 ${
                  c.tier === 'core'
                    ? 'bg-emerald-50/60 text-emerald-800 ring-emerald-100'
                    : 'bg-ink-50 text-ink-700 ring-ink-100'
                }`}
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs font-bold">{c.count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {loading ? (
        <Loading label="Loading activities…" />
      ) : (
        renderActivityGrid(
          filtered,
          'No activities found',
          filters.status || filters.category || filters.division
            ? 'Try adjusting or clearing your filters.'
            : 'Schedule the first activity to get started.'
        )
      )}

      {filtered.some(needsFollowUp) && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <LightBulbIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
          <p>
            Activities whose date has passed show a <strong>File Follow-Up</strong> button. Confirm
            whether each was held (Yes/No) so compliance stays accurate.
          </p>
        </div>
      )}
    </div>
  );

  const renderMine = () => (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <label className="field-label">View activities for</label>
            <select
              className={selectCls}
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
            >
              {unitGroups.map((g) => (
                <optgroup key={g.type} label={UNIT_TYPE_LABELS[g.type] || g.type}>
                  {g.units.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u._id === myUnitId ? `★ ${u.name} (my unit)` : u.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {selectedUnit && (
            <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600 ring-1 ring-ink-100">
              <MapPinIcon className="h-4 w-4 text-brand-600" />
              <span className="font-medium">{selectedUnit.name}</span>
              <Badge tone="gray">{UNIT_TYPE_LABELS[selectedUnit.type] || selectedUnit.type}</Badge>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-500">
          My Activity shows the activities at the unit you belong to, plus any unit under your
          scope so you can see what your regions, zones and branches are carrying out.
        </p>
      </Card>

      {mineLoading ? (
        <Loading label="Loading unit activities…" />
      ) : (
        renderActivityGrid(
          mineActivities,
          'No activities here yet',
          'Schedule the first activity for this unit to get started.'
        )
      )}
    </div>
  );

  const renderCatalog = () => (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
            <BookOpenIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink-900">Activity Taxonomy</h2>
            <p className="text-xs text-ink-500">
              The 14 categories and every activity type under them — pick the category that best
              matches what you are doing, then choose the specific type.
            </p>
          </div>
        </div>
      </Card>

      {catalog.map((c) => (
        <Card key={c._id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-ink-900">{c.name}</h2>
                <Badge tone={c.tier === 'core' ? 'green' : 'gray'}>
                  {c.tier === 'core' ? 'CORE' : 'PROGRAMMATIC'}
                </Badge>
                <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  {c.types.length} type{c.types.length !== 1 ? 's' : ''}
                </span>
              </div>
              {c.description && <p className="mt-1 text-sm text-ink-500">{c.description}</p>}
              {c.programAreaIds?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.programAreaIds.map((pa) => (
                    <span
                      key={pa._id}
                      className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-100"
                    >
                      {pa.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {(() => {
              const freq = c.requiredFrequencyByLevel || {};
              const parts = ['megaRegion', 'region', 'zone', 'branch'].filter(
                (k) => freq[k] != null
              );
              return parts.length > 0 ? (
                <div className="shrink-0 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600 ring-1 ring-ink-100">
                  <span className="font-semibold uppercase tracking-wide text-ink-400">
                    Frequency
                  </span>
                  <ul className="mt-1 space-y-0.5">
                    {parts.map((k) => (
                      <li key={k}>
                        {FREQ_LABELS[k] || k}: {freq[k]}/half-year
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null;
            })()}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {c.types.map((t) => (
              <div
                key={t._id}
                className="rounded-lg border border-ink-100 bg-ink-50/40 p-3 transition hover:border-brand-200 hover:bg-white"
              >
                <p className="text-sm font-semibold text-ink-800">{t.name}</p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                  {formatLevels(t.applicableLevels)}
                </p>
                {t.extraFields?.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.extraFields.map((f) => (
                      <span
                        key={f.key}
                        className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-500 ring-1 ring-ink-100"
                      >
                        {f.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[10px] text-ink-400">No additional fields</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}

      {catalog.length === 0 && (
        <Card>
          <EmptyState
            icon={BookOpenIcon}
            title="Catalog not available"
            description="The activity categories and types could not be loaded."
          />
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activities"
        subtitle="Track, schedule, and follow up on ministry activities."
        actions={
          <Link to="/admin/activities/new">
            <Button className="gap-1.5">
              <PlusIcon className="h-4 w-4" />
              Schedule Activity
            </Button>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-1 rounded-xl border border-ink-100 bg-ink-50/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? 'bg-white text-ink-900 shadow-sm ring-1 ring-ink-100'
                : 'text-ink-500 hover:text-ink-800'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && renderOverview()}
      {tab === 'mine' && renderMine()}
      {tab === 'catalog' && renderCatalog()}
    </div>
  );
};

export default Activities;

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client.js';
import ActivityCard from '../../components/common/ActivityCard.jsx';
import {
  Card,
  PageHeader,
  Loading,
  EmptyState,
  Button,
} from '../../components/ui/index.js';
import {
  PlusIcon,
  CalendarDaysIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';

const STATUS_OPTIONS = ['scheduled', 'completed', 'not_held', 'cancelled', 'postponed'];
const TYPE_OPTIONS = ['crusade', 'jesus_march', 'eei', 'groups_outreach'];
const DIVISION_OPTIONS = ['groups', 'gmov', 'women_foundation', 'teenage', 'youth', 'children'];

const Activities = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', activityType: '', division: '' });

  useEffect(() => {
    api
      .get('/activities')
      .then((res) => setActivities(res.data))
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (filters.status && a.status !== filters.status) return false;
      if (filters.activityType && (a.activityTypeId?.code || a.activityTypeId) !== filters.activityType)
        return false;
      if (filters.division && !(a.divisions || []).some((d) => (d.code || d) === filters.division))
        return false;
      return true;
    });
  }, [activities, filters]);

  const now = new Date();
  const needsFollowUp = (a) => a.status === 'scheduled' && new Date(a.scheduledDate) < now;
  const followUpCount = filtered.filter(needsFollowUp).length;

  const selectCls =
    'input cursor-pointer';

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

      {/* Filters */}
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
            <label className="field-label">Type</label>
            <select
              className={selectCls}
              value={filters.activityType}
              onChange={(e) => setFilters((f) => ({ ...f, activityType: e.target.value }))}
            >
              <option value="">All types</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
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
              {DIVISION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
        {(filters.status || filters.activityType || filters.division) && (
          <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
            <p className="text-xs text-ink-500">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} · {followUpCount} need
              follow-up
            </p>
            <button
              onClick={() => setFilters({ status: '', activityType: '', division: '' })}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Clear filters
            </button>
          </div>
        )}
      </Card>

      {/* Results */}
      {loading ? (
        <Loading label="Loading activities…" />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarDaysIcon}
            title="No activities found"
            description={
              (filters.status || filters.activityType || filters.division)
                ? 'Try adjusting or clearing your filters.'
                : 'Schedule the first activity to get started.'
            }
            action={
              !(filters.status || filters.activityType || filters.division) && (
                <Link to="/admin/activities/new">
                  <Button>Schedule an activity</Button>
                </Link>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <ActivityCard key={a._id} activity={a} />
          ))}
        </div>
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
};

export default Activities;

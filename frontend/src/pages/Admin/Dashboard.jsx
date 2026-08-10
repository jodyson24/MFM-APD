import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client.js';
import { useAuth } from '../../context/index.js';
import Countdown from '../../components/common/countdown.jsx';
import ShortfallPanel from '../../components/common/ShortfallPanel.jsx';
import {
  Card,
  StatCard,
  Loading,
  EmptyState,
  Button,
} from '../../components/ui/index.js';
import {
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  PlusIcon,
  HomeModernIcon,
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user } = useAuth();
  const [nextPresentation, setNextPresentation] = useState(null);
  const [activities, setActivities] = useState([]);
  const [headquarters, setHeadquarters] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/presentation-cycles/next').catch(() => null),
      api.get('/activities').catch(() => ({ data: [] })),
      api.get('/org-units').catch(() => ({ data: [] })),
    ])
      .then(([cycleRes, actRes, orgRes]) => {
        setNextPresentation(cycleRes?.data?.presentationDate || null);
        setActivities(actRes.data || []);
        const orgs = orgRes.data || [];
        const hq = orgs.find((o) => o.isHeadquarters) || null;
        setHeadquarters(
          hq ? { name: hq.name, location: hq.location } : null
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const pending = activities.filter(
    (a) => a.status === 'scheduled' && new Date(a.scheduledDate) < now
  );
  const byStatus = activities.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const completed = byStatus.completed || 0;
  const total = activities.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (loading) return <Loading full label="Loading dashboard…" />;

  const firstName = (user?.name || 'there').split(' ')[0];
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand-600">{todayLabel}</p>
          <h1 className="page-title mt-1">Welcome back, {firstName}</h1>
          <p className="page-subtitle">
            Here&apos;s what&apos;s happening across your scope today.
          </p>
        </div>
        <Link to="/admin/activities/new">
          <Button className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Schedule Activity
          </Button>
        </Link>
      </div>

      {headquarters && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <HomeModernIcon className="h-4 w-4 shrink-0 text-brand-600" />
          <span className="font-semibold">{headquarters.name}</span>
          {headquarters.location && (
            <span className="text-brand-600">· {headquarters.location}</span>
          )}
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
            Headquarters
          </span>
        </div>
      )}

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Activities"
          value={total}
          hint={`${byStatus.scheduled || 0} scheduled · ${completed} completed`}
          icon={ClipboardDocumentListIcon}
          tone="brand"
        />
        <StatCard
          label="Completion Rate"
          value={`${completionRate}%`}
          hint="of scheduled activities completed"
          icon={CheckCircleIcon}
          tone="green"
        />
        <StatCard
          label="Pending Follow-Up"
          value={pending.length}
          hint={pending.length ? 'need your report' : 'all caught up'}
          icon={ExclamationTriangleIcon}
          tone={pending.length ? 'amber' : 'green'}
        />
        <StatCard
          label="Next Presentation"
          value={nextPresentation ? new Date(nextPresentation).toLocaleDateString() : '—'}
          hint={nextPresentation ? 'bi-annual presentation date' : 'not yet scheduled'}
          icon={CalendarDaysIcon}
          tone="amber"
        />
      </div>

      {/* Next presentation countdown + compliance */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink-900">Next Bi-Annual Presentation</h2>
              <p className="text-sm text-ink-500">
                {nextPresentation
                  ? new Date(nextPresentation).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'No upcoming presentation date set.'}
              </p>
            </div>
          </div>
          {nextPresentation ? (
            <div className="mt-6 flex justify-center sm:justify-end">
              <Countdown targetDate={nextPresentation} />
            </div>
          ) : (
            <EmptyState
              title="No presentation scheduled"
              description="Set the next bi-annual presentation date to see a live countdown here."
            />
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-900">Compliance</h2>
            <Link
              to="/admin/compliance"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              View
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4">
            <ShortfallPanel />
          </div>
        </Card>
      </div>

      {/* Pending follow-up alerts */}
      {pending.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <div className="flex items-center gap-2.5">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold text-amber-900">
              Pending Follow-Up ({pending.length}) — activities whose date has passed
            </h2>
          </div>
          <ul className="mt-3 divide-y divide-amber-100">
            {pending.map((a) => (
              <li key={a._id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-amber-900">{a.title}</p>
                  <p className="text-xs text-amber-700">
                    {new Date(a.scheduledDate).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  to={`/admin/activities/${a._id}/follow-up`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600"
                >
                  File Follow-Up
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Recent activities */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink-900">Recent Activities</h2>
            <p className="text-sm text-ink-500">Your latest scheduled and reported activities.</p>
          </div>
          <Link
            to="/admin/activities"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            View all
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
          </Link>
        </div>

        {activities.length === 0 ? (
          <EmptyState
            icon={CalendarDaysIcon}
            title="No activities yet"
            description="Schedule your first activity to start tracking progress."
            action={
              <Link to="/admin/activities/new">
                <Button>Schedule your first activity</Button>
              </Link>
            }
          />
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activities.slice(0, 9).map((a) => (
              <div key={a._id} className="card card-hover p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to={`/admin/activities/${a._id}`}
                    className="min-w-0 truncate text-sm font-semibold text-ink-900 transition hover:text-brand-700"
                  >
                    {a.title}
                  </Link>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                      a.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : a.status === 'scheduled'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-ink-100 text-ink-600'
                    }`}
                  >
                    {(a.status || '').replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-ink-500">
                  {a.activityTypeId?.name || 'Activity'} · {a.orgUnitId?.name || '—'}
                </p>
                <p className="mt-2 text-xs font-medium text-ink-600">
                  {new Date(a.scheduledDate).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;

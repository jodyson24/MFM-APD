import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client.js';
import { Card, Button, Loading, Badge, EmptyState } from '../../components/ui/index.js';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  MapPinIcon,
  TagIcon,
  UsersIcon,
  FlagIcon,
  PencilIcon,
  ClipboardDocumentCheckIcon,
  PhotoIcon,
  FilmIcon,
  DocumentTextIcon,
  UserCircleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const MediaGrid = ({ items = [], emptyText = 'No media attached.' }) => {
  if (!items.length) {
    return <p className="text-sm text-ink-400">{emptyText}</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((m, i) =>
        m.mediaType === 'video' ? (
          <video
            key={i}
            src={m.url}
            controls
            preload="metadata"
            className="h-36 w-full rounded-lg bg-ink-950 object-cover ring-1 ring-ink-100"
          />
        ) : (
          <a
            key={i}
            href={m.url}
            target="_blank"
            rel="noreferrer"
            className="group relative block h-36 overflow-hidden rounded-lg ring-1 ring-ink-100"
            title={m.caption || 'Open image'}
          >
            <img
              src={m.url}
              alt={m.caption || `evidence-${i + 1}`}
              className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
            />
            {m.caption && (
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink-950/80 to-transparent px-2 pb-1.5 pt-5 text-[11px] font-medium text-white">
                {m.caption}
              </span>
            )}
          </a>
        )
      )}
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-2.5">
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink-100 text-ink-500">
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <p className="text-sm font-medium text-ink-800">{value}</p>
    </div>
  </div>
);

const ActivityDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    api
      .get(`/activities/${id}`)
      .then((res) => setActivity(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load this activity.'))
      .finally(() => setLoading(false));
  }, [id]);

  const onCancel = async () => {
    setCancelling(true);
    setError('');
    try {
      const res = await api.post(`/activities/${id}/cancel`, { reason: cancelReason.trim() || 'Cancelled' });
      setActivity(res.data?.activity || null);
      setShowCancel(false);
      setCancelReason('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel activity');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <Loading full label="Loading activity…" />;

  if (error || !activity) {
    return (
      <Card>
        <EmptyState
          icon={DocumentTextIcon}
          title="Activity not found"
          description={error || 'This activity may have been removed.'}
          action={<Button onClick={() => navigate('/admin/activities')}>Back to Activities</Button>}
        />
      </Card>
    );
  }

  const a = activity;
  const isPast = new Date(a.scheduledDate) < new Date();
  const needsFollowUp = a.status === 'scheduled' && isPast;
  const completed = a.status === 'completed';
  const notHeld = a.status === 'not_held';
  const report = a.report || {};

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button
        onClick={() => navigate('/admin/activities')}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition hover:text-brand-700"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Activities
      </button>

      {/* Header */}
      <Card className="p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge status={a.status} />
              <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
                {a.activityTypeId?.name || 'Activity'}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink-900">{a.title}</h1>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-500">
              <MapPinIcon className="h-4 w-4" />
              {a.orgUnitId?.name || '—'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {a.status === 'scheduled' && (
              <Button variant="secondary" onClick={() => navigate(`/admin/activities/${a._id}/edit`)} className="gap-1.5">
                <PencilIcon className="h-4 w-4" />
                Edit
              </Button>
            )}
            {a.status === 'scheduled' && (
              <Button
                variant="danger"
                onClick={() => setShowCancel((v) => !v)}
                className="gap-1.5"
              >
                <XCircleIcon className="h-4 w-4" />
                Cancel
              </Button>
            )}
            {(needsFollowUp || completed) && (
              <Button onClick={() => navigate(`/admin/activities/${a._id}/follow-up`)} className="gap-1.5">
                <ClipboardDocumentCheckIcon className="h-4 w-4" />
                {completed ? 'Update Report' : 'File Follow-Up'}
              </Button>
            )}
          </div>
        </div>

        {showCancel && a.status === 'scheduled' && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50/60 p-4 ring-1 ring-red-100">
            <p className="text-sm font-semibold text-red-800">Cancel this activity</p>
            <p className="mt-0.5 text-xs text-red-700">
              This marks the activity as cancelled and records the reason. It cannot be undone.
            </p>
            <textarea
              rows="2"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation (optional)"
              className="input mt-3 resize-y"
            />
            <div className="mt-3 flex justify-end gap-2.5">
              <Button variant="secondary" onClick={() => setShowCancel(false)}>
                Keep It
              </Button>
              <Button variant="danger" onClick={onCancel} disabled={cancelling}>
                {cancelling ? 'Cancelling…' : 'Yes, Cancel Activity'}
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-ink-100 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow
            icon={CalendarDaysIcon}
            label="Scheduled"
            value={new Date(a.scheduledDate).toLocaleString(undefined, {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          />
          {a.scheduledEndDate && (
            <InfoRow
              icon={ClockIcon}
              label="End"
              value={new Date(a.scheduledEndDate).toLocaleString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            />
          )}
          <InfoRow
            icon={TagIcon}
            label="Type"
            value={a.activityTypeId?.name || '—'}
          />
          <InfoRow
            icon={UsersIcon}
            label="Divisions"
            value={
              (a.divisions || []).length ? a.divisions.map((d) => d.name || d).join(', ') : '—'
            }
          />
          <InfoRow
            icon={FlagIcon}
            label="Strategic Initiative"
            value={a.strategicInitiativeId?.title || '—'}
          />
          {a.createdByUserId && (
            <InfoRow
              icon={UserCircleIcon}
              label="Created by"
              value={a.createdByUserId.name || '—'}
            />
          )}
        </div>

        {a.description && (
          <div className="mt-6 rounded-lg bg-ink-50/70 p-4 ring-1 ring-ink-100">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              Description
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{a.description}</p>
          </div>
        )}
      </Card>

      {/* Media attached at schedule/edit time */}
      <Card>
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
            <PhotoIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink-900">Pictorial Evidence</h2>
            <p className="text-xs text-ink-500">
              {a.media?.length
                ? `${a.media.length} item(s) attached — available for the presentation deck.`
                : 'No media attached to this activity yet.'}
            </p>
          </div>
        </div>
        <MediaGrid items={a.media || []} emptyText="No media attached yet. Edit this activity to add some, or attach photos in the follow-up report." />
      </Card>

      {/* Follow-up report */}
      <Card>
        <div className="mb-4 flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              completed ? 'bg-emerald-100 text-emerald-600' : notHeld ? 'bg-red-100 text-red-600' : 'bg-ink-100 text-ink-500'
            }`}
          >
            {completed ? (
              <CheckCircleIcon className="h-5 w-5" />
            ) : (
              <ClipboardDocumentCheckIcon className="h-5 w-5" />
            )}
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink-900">Follow-Up Report</h2>
            <p className="text-xs text-ink-500">
              {completed
                ? `Marked held on ${report.submittedAt ? new Date(report.submittedAt).toLocaleDateString() : '—'}`
                : notHeld
                  ? 'Reported as not held.'
                  : 'No follow-up report yet.'}
            </p>
          </div>
        </div>

        {!completed && !notHeld && (
          <div className="rounded-lg bg-amber-50 p-5 text-sm ring-1 ring-amber-100">
            {needsFollowUp ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-medium text-amber-800">
                  This activity's date has passed — file the follow-up report to close it out.
                </span>
                <Button onClick={() => navigate(`/admin/activities/${a._id}/follow-up`)}>
                  File Follow-Up Report
                </Button>
              </div>
            ) : (
              <p className="text-amber-700">
                Scheduled for{' '}
                {new Date(a.scheduledDate).toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
                . A follow-up report can be filed once the date has passed.
              </p>
            )}
          </div>
        )}

        {completed && (
          <div className="space-y-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                Narrative Report
              </p>
              {report.narrativeReport ? (
                <p className="mt-1 whitespace-pre-wrap rounded-lg bg-ink-50/70 p-4 text-sm text-ink-700 ring-1 ring-ink-100">
                  {report.narrativeReport}
                </p>
              ) : (
                <p className="mt-1 text-sm text-ink-400">No narrative provided.</p>
              )}
            </div>

            {report.metrics && Object.keys(report.metrics).length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                  Metrics
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {Object.entries(report.metrics).map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-emerald-50/60 p-3 ring-1 ring-emerald-100">
                      <p className="truncate text-xs font-medium capitalize text-ink-500">
                        {k.replace(/_/g, ' ')}
                      </p>
                      <p className="mt-1 text-xl font-bold text-emerald-700">{String(v)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.media?.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                  <FilmIcon className="h-4 w-4" />
                  Report Media ({report.media.length})
                </p>
                <MediaGrid items={report.media} />
              </div>
            )}

            {report.markedByUserId && (
              <div className="flex items-center gap-2 border-t border-ink-100 pt-4 text-xs text-ink-500">
                <UserCircleIcon className="h-4 w-4" />
                Reported by {report.markedByUserId.name || '—'}
                {report.submittedAt &&
                  ` · ${new Date(report.submittedAt).toLocaleString()}`}
              </div>
            )}
          </div>
        )}

        {notHeld && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              Reason Not Held
            </p>
            {report.notHeldReason ? (
              <p className="mt-1 whitespace-pre-wrap rounded-lg bg-red-50/70 p-4 text-sm text-red-700 ring-1 ring-red-100">
                {report.notHeldReason}
              </p>
            ) : (
              <p className="mt-1 text-sm text-ink-400">No reason provided.</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ActivityDetail;

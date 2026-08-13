import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import { useAuth } from '../../context/index.js';
import { Card, PageHeader, Loading, EmptyState, Badge, Modal } from '../../components/ui/index.js';
import {
  ShieldCheckIcon,
  ComputerDesktopIcon,
  ClockIcon,
  FingerPrintIcon,
  ServerStackIcon,
  GlobeAltIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

const PAGE_SIZE = 10;

const Pagination = ({ page, totalItems, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-ink-100 px-5 py-3 text-sm">
      <span className="text-ink-500">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-secondary inline-flex items-center gap-1"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Previous
        </button>
        <button
          type="button"
          className="btn-secondary inline-flex items-center gap-1"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

const DetailRow = ({ label, value, mono = false }) => (
  <div className="flex items-start justify-between gap-6 border-b border-ink-100 py-2.5 last:border-0">
    <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</span>
    <span className={`text-right text-sm font-medium text-ink-800 ${mono ? 'font-mono text-xs' : ''}`}>
      {value || '—'}
    </span>
  </div>
);

const SessionDetails = ({ s }) => (
  <div className="space-y-0">
    <DetailRow label="User" value={s.userId?.name || s.email || s.userId || 'Anonymous attempt'} />
    <DetailRow label="Email" value={s.email} />
    <DetailRow
      label="Result"
      value={<Badge tone={s.loginResult === 'success' ? 'green' : 'red'}>{s.loginResult || '—'}</Badge>}
    />
    <DetailRow label="Sign-in" value={fmt(s.loginAt)} />
    <DetailRow label="Logout" value={fmt(s.logoutAt)} />
    <DetailRow label="Duration" value={s.durationSeconds != null ? `${s.durationSeconds}s` : '—'} />
    <DetailRow label="IP Address" value={s.ipAddress} mono />
    <DetailRow
      label="Location"
      value={[s.approxLocation?.city, s.approxLocation?.region, s.approxLocation?.country]
        .filter(Boolean)
        .join(', ')}
    />
    <DetailRow
      label="Device"
      value={[s.device?.os, s.device?.browser, s.device?.deviceType].filter(Boolean).join(' · ')}
    />
    <DetailRow label="User Agent" value={s.device?.userAgent} mono />
    <DetailRow label="Fingerprint" value={s.device?.fingerprintHash} mono />
  </div>
);

const AuditDetails = ({ a }) => (
  <div className="space-y-0">
    <DetailRow label="User" value={a.userId?.name || a.userId || '—'} />
    <DetailRow label="Action" value={a.action} />
    <DetailRow label="Entity" value={a.entity} />
    <DetailRow label="Entity ID" value={String(a.entityId || '')} mono />
    <DetailRow label="Timestamp" value={fmt(a.timestamp)} />
    <DetailRow label="IP Address" value={a.ipAddress} mono />
    {a.meta && Object.keys(a.meta).length > 0 && (
      <div className="mt-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Metadata</span>
        <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-ink-900 p-3 font-mono text-xs text-emerald-300">
          {JSON.stringify(a.meta, null, 2)}
        </pre>
      </div>
    )}
  </div>
);

const ActivityDetails = ({ act }) => (
  <div className="space-y-0">
    <DetailRow label="User" value={act.userId?.name || act.userId || '—'} />
    <DetailRow label="Action" value={act.action} />
    <DetailRow label="Entity" value={act.entity || '—'} />
    <DetailRow label="Entity ID" value={String(act.entityId || '')} mono />
    <DetailRow label="Session" value={act.sessionId} mono />
    <DetailRow label="Timestamp" value={fmt(act.timestamp)} />
    <DetailRow label="IP Address" value={act.ipAddress} mono />
  </div>
);

const SecurityLog = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activeTableTab, setActiveTableTab] = useState('sessions');

  useEffect(() => {
    if (!user?.isSuperAdmin) return;
    Promise.all([
      api.get('/security/sessions').catch(() => ({ data: [] })),
      api.get('/security/activity-log').catch(() => ({ data: [] })),
      api.get('/security/audit-log').catch(() => ({ data: [] })),
    ])
      .then(([s, a, au]) => {
        setSessions(s.data || []);
        setActivityLog(a.data || []);
        setAuditLog(au.data || []);
        setSessionsPage(1);
        setActivityPage(1);
        setAuditPage(1);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user?.isSuperAdmin) {
    return (
      <Card>
        <EmptyState
          icon={ShieldCheckIcon}
          title="Super Admins only"
          description="This dashboard is visible to Super Admins only."
        />
      </Card>
    );
  }

  if (loading) return <Loading full label="Loading security log…" />;

  const paginatedSessions = sessions.slice(
    (sessionsPage - 1) * PAGE_SIZE,
    sessionsPage * PAGE_SIZE,
  );
  const paginatedAuditLog = auditLog.slice((auditPage - 1) * PAGE_SIZE, auditPage * PAGE_SIZE);
  const paginatedActivityLog = activityLog.slice(
    (activityPage - 1) * PAGE_SIZE,
    activityPage * PAGE_SIZE,
  );

  const rowClass =
    'cursor-pointer transition hover:bg-brand-50/50';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Log"
        subtitle="Audit trail of sign-ins and user actions. Click any row for full details."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <ComputerDesktopIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-3xl font-bold text-ink-900">{sessions.length}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Login sessions
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <ClockIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-3xl font-bold text-ink-900">{activityLog.length}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Recorded actions
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <ShieldCheckIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-3xl font-bold text-ink-900">{auditLog.length}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Audit events
            </p>
          </div>
        </Card>
      </div>

      <Card padded={false}>
        <div className="space-y-4 p-5">
          <div className="tab-list">
            <button
              type="button"
              className={`tab-button ${activeTableTab === 'sessions' ? 'tab-button-active' : ''}`}
              onClick={() => setActiveTableTab('sessions')}
            >
              Login Sessions
            </button>
            <button
              type="button"
              className={`tab-button ${activeTableTab === 'audit' ? 'tab-button-active' : ''}`}
              onClick={() => setActiveTableTab('audit')}
            >
              Audit Log
            </button>
            <button
              type="button"
              className={`tab-button ${activeTableTab === 'activity' ? 'tab-button-active' : ''}`}
              onClick={() => setActiveTableTab('activity')}
            >
              User Action Feed
            </button>
          </div>

          {activeTableTab === 'sessions' && (
            <div>
              <div className="mb-3">
                <h2 className="text-base font-semibold text-ink-900">Login Sessions</h2>
                <p className="text-sm text-ink-500">Every successful and failed sign-in attempt.</p>
              </div>
              {sessions.length === 0 ? (
                <EmptyState title="No sessions recorded" description="Sign-ins will be tracked here." />
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Login</th>
                        <th>Logout</th>
                        <th>Duration</th>
                        <th>Result</th>
                        <th>IP</th>
                        <th>Device</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSessions.map((s) => (
                        <tr key={s._id} onClick={() => setSelectedSession(s)} className={rowClass}>
                          <td className="font-medium text-ink-900">
                            {s.userId?.name || s.email || s.userId || '—'}
                          </td>
                          <td>{fmt(s.loginAt)}</td>
                          <td>{fmt(s.logoutAt)}</td>
                          <td>
                            {s.durationSeconds != null ? (
                              <span className="badge bg-ink-100 text-ink-600">
                                {s.durationSeconds}s
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            <Badge tone={s.loginResult === 'success' ? 'green' : 'red'}>
                              {s.loginResult || '—'}
                            </Badge>
                          </td>
                          <td className="font-mono text-xs">{s.ipAddress || '—'}</td>
                          <td className="max-w-[220px] truncate text-xs text-ink-500">
                            {s.device?.userAgent ? s.device.userAgent.slice(0, 60) : '—'}
                            {s.device?.fingerprintHash && (
                              <span className="block font-mono text-[10px] text-ink-400">
                                {s.device.fingerprintHash}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination
                    page={sessionsPage}
                    totalItems={sessions.length}
                    onPageChange={setSessionsPage}
                  />
                </div>
              )}
            </div>
          )}

          {activeTableTab === 'audit' && (
            <div>
              <div className="mb-3">
                <h2 className="text-base font-semibold text-ink-900">Audit Log</h2>
                <p className="text-sm text-ink-500">
                  System-level write audit (§5) — every create/edit/cancel/security event with metadata.
                </p>
              </div>
              {auditLog.length === 0 ? (
                <EmptyState title="No audit events" description="System writes will appear here." />
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Action</th>
                        <th>Entity</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAuditLog.map((l) => (
                        <tr key={l._id} onClick={() => setSelectedAudit(l)} className={rowClass}>
                          <td className="font-medium text-ink-900">{l.userId?.name || l.userId}</td>
                          <td>
                            <span className="badge bg-purple-100 text-purple-700">{l.action}</span>
                          </td>
                          <td>{l.entity || '—'}</td>
                          <td>{fmt(l.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination page={auditPage} totalItems={auditLog.length} onPageChange={setAuditPage} />
                </div>
              )}
            </div>
          )}

          {activeTableTab === 'activity' && (
            <div>
              <div className="mb-3">
                <h2 className="text-base font-semibold text-ink-900">User Action Feed</h2>
                <p className="text-sm text-ink-500">Chronological trail of changes made in the system.</p>
              </div>
              {activityLog.length === 0 ? (
                <EmptyState title="No actions recorded" description="User actions will appear here." />
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Action</th>
                        <th>Entity</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedActivityLog.map((l) => (
                        <tr key={l._id} onClick={() => setSelectedActivity(l)} className={rowClass}>
                          <td className="font-medium text-ink-900">{l.userId?.name || l.userId}</td>
                          <td>
                            <span className="badge bg-brand-100 text-brand-700">{l.action}</span>
                          </td>
                          <td>{l.entity || '—'}</td>
                          <td>{fmt(l.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination
                    page={activityPage}
                    totalItems={activityLog.length}
                    onPageChange={setActivityPage}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Details modals */}
      <Modal
        open={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title="Login Session Details"
        subtitle={selectedSession ? fmt(selectedSession.loginAt) : ''}
        icon={FingerPrintIcon}
        size="lg"
      >
        {selectedSession && <SessionDetails s={selectedSession} />}
      </Modal>

      <Modal
        open={!!selectedAudit}
        onClose={() => setSelectedAudit(null)}
        title="Audit Event Details"
        subtitle={selectedAudit ? fmt(selectedAudit.timestamp) : ''}
        icon={ServerStackIcon}
        size="lg"
      >
        {selectedAudit && <AuditDetails a={selectedAudit} />}
      </Modal>

      <Modal
        open={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
        title="User Action Details"
        subtitle={selectedActivity ? fmt(selectedActivity.timestamp) : ''}
        icon={GlobeAltIcon}
        size="lg"
      >
        {selectedActivity && <ActivityDetails act={selectedActivity} />}
      </Modal>
    </div>
  );
};

export default SecurityLog;

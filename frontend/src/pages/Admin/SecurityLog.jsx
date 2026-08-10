import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import { useAuth } from '../../context/index.js';
import { Card, PageHeader, Loading, EmptyState } from '../../components/ui/index.js';
import {
  ShieldCheckIcon,
  ComputerDesktopIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const SecurityLog = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Log"
        subtitle="Audit trail of sign-ins and user actions."
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
        <div className="px-5 pt-5">
          <h2 className="text-base font-semibold text-ink-900">Login Sessions</h2>
          <p className="text-sm text-ink-500">Every successful and failed sign-in attempt.</p>
        </div>
        {sessions.length === 0 ? (
          <EmptyState title="No sessions recorded" description="Sign-ins will be tracked here." />
        ) : (
          <div className="table-wrap mt-4">
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
                {sessions.map((s) => (
                  <tr key={s._id}>
                    <td className="font-medium text-ink-900">{s.userId?.name || s.userId}</td>
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
                      <span
                        className={`badge ${
                          s.loginResult === 'success'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {s.loginResult}
                      </span>
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
          </div>
        )}
      </Card>

      <Card padded={false}>
        <div className="px-5 pt-5">
          <h2 className="text-base font-semibold text-ink-900">Audit Log</h2>
          <p className="text-sm text-ink-500">
            System-level write audit (§5) — every create/edit/cancel/security event with metadata.
          </p>
        </div>
        {auditLog.length === 0 ? (
          <EmptyState title="No audit events" description="System writes will appear here." />
        ) : (
          <div className="table-wrap mt-4">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Entity ID</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((l) => (
                  <tr key={l._id}>
                    <td className="font-medium text-ink-900">{l.userId?.name || l.userId}</td>
                    <td>
                      <span className="badge bg-purple-100 text-purple-700">{l.action}</span>
                    </td>
                    <td>{l.entity || '—'}</td>
                    <td className="max-w-[160px] truncate font-mono text-xs text-ink-500">
                      {l.entityId || '—'}
                    </td>
                    <td>{fmt(l.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card padded={false}>
        <div className="px-5 pt-5">
          <h2 className="text-base font-semibold text-ink-900">User Action Feed</h2>
          <p className="text-sm text-ink-500">Chronological trail of changes made in the system.</p>
        </div>
        {activityLog.length === 0 ? (
          <EmptyState title="No actions recorded" description="User actions will appear here." />
        ) : (
          <div className="table-wrap mt-4">
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
                {activityLog.map((l) => (
                  <tr key={l._id}>
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
          </div>
        )}
      </Card>
    </div>
  );
};

export default SecurityLog;

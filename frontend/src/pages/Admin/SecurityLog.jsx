import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context';

const SecurityLog = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.isSuperAdmin) return;
    Promise.all([
      api.get('/security/sessions').catch(() => ({ data: [] })),
      api.get('/security/activity-log').catch(() => ({ data: [] })),
    ])
      .then(([s, a]) => {
        setSessions(s.data || []);
        setActivityLog(a.data || []);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user?.isSuperAdmin) {
    return <div className="text-white">This dashboard is visible to Super Admins only.</div>;
  }

  if (loading) return <div className="text-white">Loading security log...</div>;

  const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Security Log</h1>

      <div className="bg-white rounded-lg shadow p-4 text-gray-800">
        <h2 className="font-semibold mb-3">Login Sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-500">No sessions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Login</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Logout</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Duration (s)</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Result</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">IP</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map((s) => (
                  <tr key={s._id}>
                    <td className="px-3 py-2 text-sm">{s.userId?.name || s.userId}</td>
                    <td className="px-3 py-2 text-sm">{fmt(s.loginAt)}</td>
                    <td className="px-3 py-2 text-sm">{fmt(s.logoutAt)}</td>
                    <td className="px-3 py-2 text-sm">{s.durationSeconds ?? 0}</td>
                    <td className="px-3 py-2 text-sm">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.loginResult === 'success'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {s.loginResult}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm">{s.ipAddress || '—'}</td>
                    <td className="px-3 py-2 text-sm text-xs text-gray-600">
                      {s.device?.userAgent ? s.device.userAgent.slice(0, 60) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4 text-gray-800">
        <h2 className="font-semibold mb-3">User Action Feed</h2>
        {activityLog.length === 0 ? (
          <p className="text-sm text-gray-500">No actions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Entity</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activityLog.map((l) => (
                  <tr key={l._id}>
                    <td className="px-3 py-2 text-sm">{l.userId?.name || l.userId}</td>
                    <td className="px-3 py-2 text-sm">{l.action}</td>
                    <td className="px-3 py-2 text-sm">{l.entity || '—'}</td>
                    <td className="px-3 py-2 text-sm">{fmt(l.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityLog;

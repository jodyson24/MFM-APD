import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context';

const Compliance = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canManage = user?.isSuperAdmin || user?.role === 'mega_region_admin';

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/compliance/status').catch(() => ({ data: { statuses: [], summary: [] } })),
      api.get('/compliance/rules').catch(() => ({ data: [] })),
    ])
      .then(([statusRes, rulesRes]) => {
        setSummary(statusRes.data.summary || []);
        setRules(rulesRes.data || []);
      })
      .catch(() => setError('Failed to load compliance data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalShortfalls = summary.reduce((acc, s) => acc + (s.shortfalls || 0), 0);

  if (loading) return <div className="text-white">Loading compliance...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Compliance &amp; Shortfalls</h1>

      {error && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      {/* Shortfall counter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-red-600 bg-opacity-90 rounded-lg p-6 text-white">
          <h2 className="text-lg font-semibold">Total Shortfalls</h2>
          <p className="text-4xl font-bold mt-1">{totalShortfalls}</p>
          <p className="text-sm opacity-90">across org units in scope</p>
        </div>
        <div className="bg-white bg-opacity-10 rounded-lg p-6 text-white">
          <h2 className="text-lg font-semibold">Org Units Tracked</h2>
          <p className="text-4xl font-bold mt-1">{summary.length}</p>
          <p className="text-sm opacity-90">with compliance snapshots</p>
        </div>
        <div className="bg-white bg-opacity-10 rounded-lg p-6 text-white">
          <h2 className="text-lg font-semibold">Rules Active</h2>
          <p className="text-4xl font-bold mt-1">{rules.length}</p>
          <p className="text-sm opacity-90">{canManage ? 'editable by admins' : 'view only'}</p>
        </div>
      </div>

      {/* Rules (view) */}
      <div className="bg-white rounded-lg shadow p-4 text-gray-800">
        <h2 className="font-semibold mb-3">Compliance Rules</h2>
        {rules.length === 0 ? (
          <p className="text-sm text-gray-500">No compliance rules defined. The nightly job evaluates every active rule.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Org Level</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Activity Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Required/Period</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Period Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rules.map((r) => (
                  <tr key={r._id}>
                    <td className="px-3 py-2 text-sm">{r.orgLevel}</td>
                    <td className="px-3 py-2 text-sm">{r.activityTypeId?.name || r.activityTypeId}</td>
                    <td className="px-3 py-2 text-sm">{r.requiredCountPerPeriod ?? 'informational'}</td>
                    <td className="px-3 py-2 text-sm">{r.periodType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shortfall drill-down */}
      <div className="bg-white rounded-lg shadow p-4 text-gray-800">
        <h2 className="font-semibold mb-3">Shortfall Drill-Down</h2>
        {summary.filter((s) => s.shortfalls > 0).length === 0 ? (
          <p className="text-sm text-gray-500">No shortfalls in your scope.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Org Unit</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Statuses</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Shortfalls</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.map((s) => (
                  <tr key={s.orgUnit._id} className={s.shortfalls > 0 ? 'bg-red-50' : ''}>
                    <td className="px-3 py-2 text-sm font-medium">{s.orgUnit.name}</td>
                    <td className="px-3 py-2 text-sm">{s.total}</td>
                    <td className="px-3 py-2 text-sm">
                      {s.shortfalls > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-medium">
                          {s.shortfalls} shortfall(s)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">OK</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {(s.details || [])
                        .filter((d) => d.status === 'shortfall')
                        .map((d) => (
                          <div key={d._id}>
                            {d.activityTypeId?.name} ({d.actualCount}/{d.requiredCount}) — {d.periodLabel}
                          </div>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() =>
              api.post('/compliance/check').then(() => {
                setError('');
                fetchData();
              }).catch((err) => setError(err.response?.data?.message || 'Failed to trigger check'))
            }
            className="px-4 py-2 rounded-md bg-primaryBg text-white font-semibold hover:bg-opacity-80"
          >
            Run Compliance Check Now
          </button>
        </div>
      )}
    </div>
  );
};

export default Compliance;

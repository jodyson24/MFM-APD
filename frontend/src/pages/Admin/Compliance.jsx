import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import { useAuth } from '../../context/index.js';
import { canAccessComplianceRules } from '../../utils/permissions.js';
import { Card, PageHeader, StatCard, Loading } from '../../components/ui/index.js';
import {
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

const Compliance = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [activeTableTab, setActiveTableTab] = useState('rules');

  const canManage = canAccessComplianceRules(user);

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
  const shortfallUnits = summary.filter((s) => s.shortfalls > 0).length;

  if (loading) return <Loading full label="Loading compliance…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance &amp; Shortfalls"
        subtitle="Automated checks against your activity targets across org units."
        actions={
          canManage && (
            <button
              onClick={() => {
                setRunning(true);
                setError('');
                api
                  .post('/compliance/check')
                  .then(() => {
                    setError('');
                    fetchData();
                  })
                  .catch((err) => setError(err.response?.data?.message || 'Failed to trigger check'))
                  .finally(() => setRunning(false));
              }}
              disabled={running}
              className="btn-primary"
            >
              {running ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Checking…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <BoltIcon className="h-4 w-4" />
                  Run Compliance Check
                </span>
              )}
            </button>
          )
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Shortfalls"
          value={totalShortfalls}
          hint="across org units in scope"
          icon={ExclamationTriangleIcon}
          tone="red"
          className="ring-1 ring-red-100"
        />
        <StatCard
          label="Units Tracking"
          value={summary.length}
          hint={`${shortfallUnits} with open shortfalls`}
          icon={BuildingOfficeIcon}
          tone="brand"
        />
        <StatCard
          label="Rules Active"
          value={rules.length}
          hint={canManage ? 'editable by admins' : 'view only'}
          icon={ShieldCheckIcon}
          tone="amber"
        />
      </div>

      <Card padded={false}>
        <div className="space-y-4 p-5">
          <div className="tab-list">
            <button
              type="button"
              className={`tab-button ${activeTableTab === 'rules' ? 'tab-button-active' : ''}`}
              onClick={() => setActiveTableTab('rules')}
            >
              Compliance Rules
            </button>
            <button
              type="button"
              className={`tab-button ${activeTableTab === 'shortfalls' ? 'tab-button-active' : ''}`}
              onClick={() => setActiveTableTab('shortfalls')}
            >
              Shortfall Drill-Down
            </button>
          </div>

          {activeTableTab === 'rules' && (
            <div>
              <div className="mb-3">
                <h2 className="text-base font-semibold text-ink-900">Compliance Rules</h2>
                <p className="text-sm text-ink-500">
                  The nightly job evaluates every active rule against recorded activities.
                </p>
              </div>
              {rules.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-ink-500">
                  No compliance rules defined. The nightly job evaluates every active rule.
                </p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Org Level</th>
                        <th>Activity Type</th>
                        <th>Required / Period</th>
                        <th>Period Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map((r) => (
                        <tr key={r._id}>
                          <td className="font-medium capitalize text-ink-900">
                            {(r.orgLevel || '').replace(/_/g, ' ')}
                          </td>
                          <td>{r.activityTypeId?.name || r.activityTypeId}</td>
                          <td>
                            {r.requiredCountPerPeriod != null ? (
                              <span className="badge bg-brand-100 text-brand-700">
                                {r.requiredCountPerPeriod} per period
                              </span>
                            ) : (
                              <span className="badge bg-ink-100 text-ink-500">informational</span>
                            )}
                          </td>
                          <td className="capitalize">{r.periodType}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTableTab === 'shortfalls' && (
            <div>
              <div className="mb-3">
                <h2 className="text-base font-semibold text-ink-900">Shortfall Drill-Down</h2>
                <p className="text-sm text-ink-500">
                  Units with gaps against their required activity count.
                </p>
              </div>
              {summary.filter((s) => s.shortfalls > 0).length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                    <ShieldCheckIcon className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="font-semibold text-ink-900">No shortfalls in your scope</p>
                  <p className="text-sm text-ink-500">All org units are meeting their targets.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Org Unit</th>
                        <th>Statuses</th>
                        <th>Shortfalls</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.map((s) => {
                        const details = (s.details || []).filter((d) => d.status === 'shortfall');
                        return (
                          <tr key={s.orgUnit._id} className={s.shortfalls > 0 ? 'bg-red-50/50' : ''}>
                            <td className="font-medium text-ink-900">{s.orgUnit.name}</td>
                            <td>{s.total}</td>
                            <td>
                              {s.shortfalls > 0 ? (
                                <span className="badge bg-red-100 text-red-700">
                                  {s.shortfalls} shortfall{s.shortfalls > 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="badge bg-emerald-100 text-emerald-700">OK</span>
                              )}
                            </td>
                            <td>
                              {details.length ? (
                                <div className="space-y-0.5 text-xs text-ink-600">
                                  {details.map((d) => (
                                    <div key={d._id}>
                                      {d.activityTypeId?.name} ({d.actualCount}/{d.requiredCount}) —{' '}
                                      {d.periodLabel}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-ink-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Compliance;

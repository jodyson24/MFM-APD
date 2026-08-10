import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import { useAppData } from '../../hooks/useAppData.js';
import { Card, PageHeader, Button, Loading, EmptyState } from '../../components/ui/index.js';
import {
  ChartBarIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

// Phase 4 — weekly-updatable data (e.g. Church Growth) per §12.
const WeeklyMetrics = () => {
  const { orgUnits } = useAppData();
  const [metricTypes, setMetricTypes] = useState([]);
  const [history, setHistory] = useState([]);
  const [aggregates, setAggregates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    orgUnitId: '',
    weeklyMetricTypeId: '',
    weekStartDate: '',
    value: '',
  });

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      api.get('/weekly-metrics/types').catch(() => ({ data: [] })),
      api.get('/weekly-metrics').catch(() => ({ data: [] })),
      api.get('/weekly-metrics/aggregates').catch(() => ({ data: [] })),
    ])
      .then(([t, h, a]) => {
        setMetricTypes(t.data || []);
        setHistory(h.data || []);
        setAggregates(a.data || []);
        if (!form.orgUnitId && orgUnits.length) {
          setForm((f) => ({ ...f, orgUnitId: orgUnits[0]._id }));
        }
      })
      .catch(() => setError('Failed to load weekly metrics data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!form.orgUnitId || !form.weeklyMetricTypeId || !form.weekStartDate || form.value === '') {
      return setError('All fields are required.');
    }
    const num = Number(form.value);
    if (!Number.isFinite(num)) return setError('Value must be a number.');

    setSubmitting(true);
    try {
      await api.post('/weekly-metrics', {
        orgUnitId: form.orgUnitId,
        weeklyMetricTypeId: form.weeklyMetricTypeId,
        weekStartDate: new Date(`${form.weekStartDate}T00:00:00`).toISOString(),
        value: num,
      });
      setMessage('Weekly metric submitted.');
      setForm((f) => ({ ...f, value: '' }));
      const h = await api.get('/weekly-metrics');
      const a = await api.get('/weekly-metrics/aggregates');
      setHistory(h.data || []);
      setAggregates(a.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit metric');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading full label="Loading weekly metrics…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly Metrics"
        subtitle="Track weekly-updatable figures such as Church Growth."
      />

      {message && (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Submission form */}
      <Card>
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <PlusIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink-900">Submit a weekly figure</h2>
            <p className="text-xs text-ink-500">One row per org unit, metric type, and week.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="field-label">Metric Type</label>
            <select
              value={form.weeklyMetricTypeId}
              onChange={(e) => setForm((f) => ({ ...f, weeklyMetricTypeId: e.target.value }))}
              className="input"
            >
              <option value="">Select…</option>
              {metricTypes.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Org Unit</label>
            <select
              value={form.orgUnitId}
              onChange={(e) => setForm((f) => ({ ...f, orgUnitId: e.target.value }))}
              className="input"
            >
              <option value="">Select…</option>
              {orgUnits.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Week Starting</label>
            <input
              type="date"
              value={form.weekStartDate}
              onChange={(e) => setForm((f) => ({ ...f, weekStartDate: e.target.value }))}
              className="input"
            />
          </div>
          <div>
            <label className="field-label">Value</label>
            <input
              type="number"
              step="any"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              className="input"
              placeholder="e.g. 240"
            />
          </div>
          <div className="flex items-end justify-end sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Metric'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Recent submissions */}
      <Card padded={false}>
        <div className="px-5 pt-5">
          <h2 className="text-base font-semibold text-ink-900">Recent Submissions</h2>
          <p className="text-sm text-ink-500">The latest weekly figures in your scope.</p>
        </div>
        {history.length === 0 ? (
          <EmptyState
            icon={ChartBarIcon}
            title="No weekly metrics yet"
            description="Submit your first weekly figure above."
          />
        ) : (
          <div className="table-wrap mt-4">
            <table className="table">
              <thead>
                <tr>
                  <th>Org Unit</th>
                  <th>Metric</th>
                  <th>Week Starting</th>
                  <th>Value</th>
                  <th>Submitted By</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 20).map((m) => (
                  <tr key={m._id}>
                    <td className="font-medium text-ink-900">{m.orgUnitId?.name || '—'}</td>
                    <td>{m.weeklyMetricTypeId?.name || '—'}</td>
                    <td className="text-sm text-ink-600">
                      {new Date(m.weekStartDate).toLocaleDateString()}
                    </td>
                    <td className="font-semibold text-ink-900">
                      {typeof m.value === 'number' ? m.value : JSON.stringify(m.value)}
                    </td>
                    <td className="text-sm text-ink-600">{m.submittedByUserId?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Aggregates */}
      <Card padded={false}>
        <div className="px-5 pt-5">
          <h2 className="text-base font-semibold text-ink-900">Aggregates</h2>
          <p className="text-sm text-ink-500">Rolled-up totals per org unit and metric type.</p>
        </div>
        {aggregates.length === 0 ? (
          <EmptyState
            icon={ChartBarIcon}
            title="No aggregates yet"
            description="Totals appear once weekly figures are submitted."
          />
        ) : (
          <div className="table-wrap mt-4">
            <table className="table">
              <thead>
                <tr>
                  <th>Org Unit</th>
                  <th>Metric</th>
                  <th>Total</th>
                  <th>Entries</th>
                  <th>Latest</th>
                </tr>
              </thead>
              <tbody>
                {aggregates.map((a, i) => (
                  <tr key={i}>
                    <td className="font-medium text-ink-900">{a.orgUnit?.name || '—'}</td>
                    <td>{a.weeklyMetricType?.name || '—'}</td>
                    <td className="font-semibold text-ink-900">{a.totalValue}</td>
                    <td>{a.count}</td>
                    <td className="text-sm text-ink-600">
                      {new Date(a.latestDate).toLocaleDateString()}
                    </td>
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

export default WeeklyMetrics;
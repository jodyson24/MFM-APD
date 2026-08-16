import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client.js';
import { useRealtime } from '../../hooks/useRealtime.js';
import BarChart from '../../components/charts/BarChart.jsx';
import LineChart from '../../components/charts/LineChart.jsx';
import { Card, PageHeader, Loading, EmptyState } from '../../components/ui/index.js';
import { ChartBarIcon, PresentationChartLineIcon, BeakerIcon } from '@heroicons/react/24/outline';

const Analytics = () => {
  const [activities, setActivities] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(() => {
    Promise.all([
      api.get('/activities').catch(() => ({ data: [] })),
      api.get('/presentation-cycles').catch(() => ({ data: [] })),
    ])
      .then(([actRes, cycRes]) => {
        setActivities(actRes.data || []);
        setCycles(cycRes.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Live refresh when new activity reports land or cycles change.
  useRealtime(['activities', 'analytics', 'cycles'], loadAll);

  // Half-over-half growth once a second period exists
  useEffect(() => {
    if (cycles.length < 2) return;
    const labels = cycles.map((c) => c.label).sort();
    const period2 = labels[labels.length - 1];
    const period1 = labels[labels.length - 2];
    api
      .get(`/analytics/growth?period1=${period1}&period2=${period2}`)
      .then((res) => setGrowth(res.data || []))
      .catch(() => setGrowth([]));
  }, [cycles]);

  // Activity counts by type
  const countByType = activities.reduce((acc, a) => {
    const code = a.activityTypeId?.code || 'other';
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});

  const typeChartData = Object.entries(countByType).map(([code, count]) => ({
    name: code.replace(/_/g, ' '),
    count,
  }));

  // Completed-activity metrics
  const completed = activities.filter((a) => a.status === 'completed');
  const totals = completed.reduce((acc, a) => {
    const m = a.report?.metrics || {};
    for (const [key, value] of Object.entries(m)) {
      if (typeof value === 'number') acc[key] = (acc[key] || 0) + value;
    }
    return acc;
  }, {});

  const metricsChartData = Object.entries(totals)
    .map(([key, value]) => ({ name: key.replace(/_/g, ' '), value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Rolled-up performance across activities, metrics, and presentation cycles."
      />

      {loading ? (
        <Loading label="Loading analytics…" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                  <ChartBarIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-ink-900">Activities by Type</h2>
                  <p className="text-xs text-ink-500">Count of activities per activity type.</p>
                </div>
              </div>
              {typeChartData.length === 0 ? (
                <EmptyState title="No activities to chart" description="Schedule activities to see the breakdown." />
              ) : (
                <BarChart data={typeChartData} xKey="name" bars={[{ key: 'count', name: 'Activities', fill: '#7c3aed' }]} />
              )}
            </Card>

            <Card>
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <BeakerIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-ink-900">
                    Total Reported Metrics
                  </h2>
                  <p className="text-xs text-ink-500">Summed numeric metrics from completed reports.</p>
                </div>
              </div>
              {metricsChartData.length === 0 ? (
                <EmptyState
                  title="No reported metrics"
                  description="Completed follow-up reports with metrics will appear here."
                />
              ) : (
                <BarChart
                  data={metricsChartData}
                  xKey="name"
                  bars={[{ key: 'value', name: 'Total', fill: '#f59e0b' }]}
                />
              )}
            </Card>
          </div>

          <Card>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <PresentationChartLineIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-ink-900">
                  Half-Over-Half Growth Comparison
                </h2>
                <p className="text-xs text-ink-500">
                  Growth computed from the nightly metrics rollup across presentation cycles.
                </p>
              </div>
            </div>
            {growth.length === 0 ? (
              <EmptyState
                title="No growth data yet"
                description="Growth is computed once a second presentation cycle exists. Rollup data will appear here."
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <LineChart
                    data={growth.map((g) => ({
                      name: g.metricKey,
                      period1: g.value1 || 0,
                      period2: g.value2 || 0,
                    }))}
                    xKey="name"
                    lines={[
                      { key: 'period1', name: 'Previous half', stroke: '#64709a' },
                      { key: 'period2', name: 'Current half', stroke: '#7c3aed' },
                    ]}
                  />
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Metric</th>
                          <th>Previous</th>
                          <th>Current</th>
                          <th>Growth</th>
                        </tr>
                      </thead>
                      <tbody>
                        {growth.map((g, i) => (
                          <tr key={i}>
                            <td className="font-medium text-ink-900">
                              {g.metricKey.replace(/_/g, ' ')}
                            </td>
                            <td>{g.value1 ?? 0}</td>
                            <td>{g.value2 ?? 0}</td>
                            <td>
                              {g.growth === null || g.growth === undefined ? (
                                <span className="text-ink-400">—</span>
                              ) : (
                                <span
                                  className={`badge ${
                                    g.growth >= 0
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {g.growth >= 0 ? '▲' : '▼'} {g.growth.toFixed(1)}%
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {cycles.length >= 2 && (
                  <p className="mt-4 text-xs text-ink-400">
                    Comparing {cycles[cycles.length - 2]?.label} →{' '}
                    {cycles[cycles.length - 1]?.label}.
                  </p>
                )}
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default Analytics;

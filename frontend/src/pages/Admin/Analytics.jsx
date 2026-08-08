import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import BarChart from '../../components/charts/BarChart';
import LineChart from '../../components/charts/LineChart';

const Analytics = () => {
  const [activities, setActivities] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/activities').catch(() => ({ data: [] })),
      api.get('/presentation-cycles').catch(() => ({ data: [] })),
    ]).then(([actRes, cycRes]) => {
      setActivities(actRes.data || []);
      setCycles(cycRes.data || []);
    });
  }, []);

  // Half-over-half growth once a second period exists
  useEffect(() => {
    if (cycles.length < 2) return;
    const labels = cycles.map((c) => c.label).sort();
    const period2 = labels[labels.length - 1];
    const period1 = labels[labels.length - 2];
    api
      .get(`/analytics/growth?period1=${period1}&period2=${period2}`)
      .then((res) => setGrowth(res.data || []))
      .catch(() => setGrowth([]))
      .finally(() => setLoading(false));
  }, [cycles]);

  // Activity counts by type
  const countByType = activities.reduce((acc, a) => {
    const code = a.activityTypeId?.code || 'other';
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});

  const typeChartData = Object.entries(countByType).map(([code, count]) => ({
    name: code.replace('_', ' '),
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
    .map(([key, value]) => ({ name: key, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Analytics</h1>

      {loading && <div className="text-white">Loading analytics...</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4 text-gray-800">
          <h2 className="font-semibold mb-3">Activities by Type</h2>
          {typeChartData.length === 0 ? (
            <p className="text-sm text-gray-500">No activities to chart.</p>
          ) : (
            <BarChart data={typeChartData} xKey="name" bars={[{ key: 'count', name: 'Activities', fill: '#901B76' }]} />
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4 text-gray-800">
          <h2 className="font-semibold mb-3">Total Reported Metrics (completed)</h2>
          {metricsChartData.length === 0 ? (
            <p className="text-sm text-gray-500">No completed reports yet.</p>
          ) : (
            <BarChart data={metricsChartData} xKey="name" bars={[{ key: 'value', name: 'Total', fill: '#FF6B14' }]} />
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 text-gray-800">
        <h2 className="font-semibold mb-3">Half-Over-Half Growth Comparison</h2>
        {growth.length === 0 ? (
          <p className="text-sm text-gray-500">
            No rollup data yet. Growth is computed from the nightly metrics rollup across presentation cycles.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LineChart
              data={growth.map((g) => ({
                name: g.metricKey,
                period1: g.value1 || 0,
                period2: g.value2 || 0,
              }))}
              xKey="name"
              lines={[
                { key: 'period1', name: 'Previous half', stroke: '#6c757d' },
                { key: 'period2', name: 'Current half', stroke: '#901B76' },
              ]}
            />
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Metric</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Previous</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Current</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Growth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {growth.map((g, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-sm font-medium">{g.metricKey}</td>
                      <td className="px-3 py-2 text-sm">{g.value1 ?? 0}</td>
                      <td className="px-3 py-2 text-sm">{g.value2 ?? 0}</td>
                      <td className={`px-3 py-2 text-sm font-medium ${g.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {g.growth === null || g.growth === undefined ? '—' : `${g.growth.toFixed(1)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {cycles.length >= 2 && (
          <p className="text-xs text-gray-400 mt-2">
            Comparing {cycles[cycles.length - 2]?.label} → {cycles[cycles.length - 1]?.label}.
          </p>
        )}
      </div>
    </div>
  );
};

export default Analytics;

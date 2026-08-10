import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const CHART_COLORS = ['#7c3aed', '#a78bfa', '#f59e0b', '#059669', '#dc2626', '#0ea5e9'];

const BarChart = ({
  data,
  xKey = 'name',
  bars = [{ key: 'value', name: 'Value', fill: '#7c3aed' }],
  height = 280,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barSize={32}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12, fill: '#64709a' }}
          axisLine={{ stroke: '#d5d9e8' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#64709a' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: '#f6f3ff' }}
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #ddd6fe',
            boxShadow: '0 8px 24px rgba(20,22,34,0.12)',
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
          }}
        />
        {bars.length === 1 ? (
          <Bar
            key={bars[0].key}
            dataKey={bars[0].key}
            name={bars[0].name}
            fill={bars[0].fill}
            radius={[8, 8, 0, 0]}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        ) : (
          bars.map((b) => (
            <Bar key={b.key} dataKey={b.key} name={b.name} fill={b.fill} radius={[8, 8, 0, 0]} />
          ))
        )}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

export default BarChart;

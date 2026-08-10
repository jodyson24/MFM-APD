import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const LineChart = ({
  data,
  xKey = 'name',
  lines = [{ key: 'value', name: 'Value', stroke: '#7c3aed' }],
  height = 280,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #ddd6fe',
            boxShadow: '0 8px 24px rgba(20,22,34,0.12)',
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 13, fontWeight: 600 }}
        />
        {lines.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.name}
            stroke={l.stroke}
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#ffffff', strokeWidth: 2, stroke: l.stroke }}
            activeDot={{ r: 6 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

export default LineChart;

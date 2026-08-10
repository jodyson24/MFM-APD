import React, { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const ShortfallPanel = () => {
  const [shortfalls, setShortfalls] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get('/compliance/status')
      .then((res) => {
        const summary = res.data.summary || [];
        setShortfalls(summary.filter((s) => s.shortfalls > 0));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return <p className="text-sm text-ink-400">Checking compliance…</p>;
  }

  if (shortfalls.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
        <CheckCircleIcon className="h-5 w-5" />
        All compliant
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {shortfalls.map((item) => (
        <div
          key={item.orgUnit._id}
          className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 ring-1 ring-red-100"
        >
          <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-red-500" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-red-800">
            {item.orgUnit.name}
          </span>
          <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
            {item.shortfalls}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ShortfallPanel;

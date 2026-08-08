import React, { useEffect, useState } from 'react';
import api from '../../api/client';

const ShortfallPanel = () => {
  const [shortfalls, setShortfalls] = useState([]);
  useEffect(() => {
    api.get('/compliance/status').then(res => {
      const summary = res.data.summary || [];
      setShortfalls(summary.filter(s => s.shortfalls > 0));
    }).catch(() => {});
  }, []);

  if (shortfalls.length === 0) {
    return <p className="text-green-400">✅ All compliant</p>;
  }

  return (
    <div className="space-y-2">
      {shortfalls.map((item) => (
        <div key={item.orgUnit._id} className="bg-red-900 bg-opacity-30 p-2 rounded">
          <span className="font-semibold">{item.orgUnit.name}</span>: {item.shortfalls} shortfall(s)
        </div>
      ))}
    </div>
  );
};

export default ShortfallPanel;
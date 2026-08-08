import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context';
import Countdown from '../../components/common/countdown';
import ShortfallPanel from '../../components/common/ShortfallPanel';

const Dashboard = () => {
  const { user } = useAuth();
  const [nextPresentation, setNextPresentation] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/presentation-cycles/next').catch(() => null),
      api.get('/activities').catch(() => ({ data: [] })),
    ])
      .then(([cycleRes, actRes]) => {
        setNextPresentation(cycleRes?.data?.presentationDate || null);
        setActivities(actRes.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const pending = activities.filter(
    (a) => a.status === 'scheduled' && new Date(a.scheduledDate) < now
  );
  const byStatus = activities.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Welcome, {user?.name}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white bg-opacity-10 p-6 rounded-lg backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-white">Next Presentation</h2>
          {nextPresentation ? (
            <Countdown targetDate={nextPresentation} />
          ) : (
            <p className="text-sm text-white opacity-80 mt-2">No upcoming presentation date set.</p>
          )}
        </div>
        <div className="bg-white bg-opacity-10 p-6 rounded-lg backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-white">Your Activities</h2>
          <p className="text-3xl font-bold text-white">{activities.length}</p>
          <p className="text-sm opacity-80 text-white">
            {byStatus.completed || 0} completed · {byStatus.scheduled || 0} scheduled
          </p>
        </div>
        <div className="bg-white bg-opacity-10 p-6 rounded-lg backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-white">Compliance</h2>
          <ShortfallPanel />
        </div>
      </div>

      {pending.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h2 className="font-semibold text-orange-800 mb-2">
            Pending Follow-Up ({pending.length}) — activities whose date has passed
          </h2>
          <ul className="space-y-1">
            {pending.map((a) => (
              <li key={a._id} className="flex items-center justify-between text-sm text-orange-800">
                <span>{a.title} — {new Date(a.scheduledDate).toLocaleDateString()}</span>
                <Link
                  to={`/admin/activities/${a._id}/follow-up`}
                  className="px-3 py-1 rounded bg-accentBg text-white text-xs hover:bg-opacity-80"
                >
                  File Follow-Up
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white bg-opacity-5 p-6 rounded-lg">
        <h2 className="text-xl font-semibold text-white mb-3">Recent Activities</h2>
        {activities.length === 0 ? (
          <p className="text-white opacity-80">No activities yet. <Link className="underline" to="/admin/activities/new">Schedule one</Link>.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activities.slice(0, 9).map((a) => (
              <div key={a._id} className="bg-white rounded-lg shadow p-4 text-gray-800">
                <h3 className="font-semibold">{a.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{a.activityTypeId?.name || 'Activity'}</p>
                <p className="text-xs text-gray-500">{new Date(a.scheduledDate).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import ActivityCard from '../../components/common/ActivityCard';

const Activities = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', activityType: '', division: '' });

  useEffect(() => {
    api
      .get('/activities')
      .then((res) => setActivities(res.data))
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (filters.status && a.status !== filters.status) return false;
      if (filters.activityType && (a.activityTypeId?.code || a.activityTypeId) !== filters.activityType) return false;
      if (filters.division && !(a.divisions || []).some((d) => (d.code || d) === filters.division)) return false;
      return true;
    });
  }, [activities, filters]);

  const now = new Date();
  const needsFollowUp = (a) => a.status === 'scheduled' && new Date(a.scheduledDate) < now;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Activities</h1>
        <Link
          to="/admin/activities/new"
          className="px-4 py-2 rounded-md bg-accentBg text-white font-semibold hover:bg-opacity-80"
        >
          + Schedule Activity
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-4 text-gray-800 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="not_held">Not Held</option>
            <option value="cancelled">Cancelled</option>
            <option value="postponed">Postponed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            value={filters.activityType}
            onChange={(e) => setFilters((f) => ({ ...f, activityType: e.target.value }))}
          >
            <option value="">All types</option>
            <option value="crusade">Crusades</option>
            <option value="jesus_march">Jesus March</option>
            <option value="eei">EEI</option>
            <option value="groups_outreach">Groups Outreach</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            value={filters.division}
            onChange={(e) => setFilters((f) => ({ ...f, division: e.target.value }))}
          >
            <option value="">All divisions</option>
            <option value="groups">Groups</option>
            <option value="gmov">GMOV</option>
            <option value="women_foundation">Women Foundation</option>
            <option value="teenage">Teenage</option>
            <option value="youth">Youth</option>
            <option value="children">Children</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-white">Loading activities...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white bg-opacity-5 rounded-lg p-8 text-center text-white">
          No activities found. <Link className="underline" to="/admin/activities/new">Schedule the first one</Link>.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <ActivityCard key={a._id} activity={a} />
          ))}
        </div>
      )}

      {filtered.some(needsFollowUp) && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
          Tip: activities whose date has passed show a <strong>File Follow-Up</strong> button. Please confirm whether each was held (Yes/No).
        </div>
      )}
    </div>
  );
};

export default Activities;

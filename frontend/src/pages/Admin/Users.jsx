import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/client';
import { createUserSchema } from '../../utils/validators';
import { ROLES } from '../../utils/constants';
import { useAuth } from '../../context';

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [orgUnits, setOrgUnits] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canCreate = currentUser?.isSuperAdmin || currentUser?.role === 'mega_region_admin';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(createUserSchema) });

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      api.get('/users').catch(() => ({ data: [] })),
      api.get('/org-units').catch(() => ({ data: [] })),
      api.get('/lookups/divisions').catch(() => ({ data: [] })),
    ])
      .then(([u, o, d]) => {
        setUsers(u.data);
        setOrgUnits(o.data);
        setDivisions(d.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const onCreate = async (data) => {
    setError('');
    setMessage('');
    try {
      await api.post('/users', data);
      setMessage('User created. Invite sent.');
      setShowForm(false);
      reset();
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const onDeactivate = async (id, name) => {
    if (!window.confirm(`Deactivate ${name}? They can no longer sign in.`)) return;
    try {
      await api.patch(`/users/${id}/deactivate`);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate user');
    }
  };

  const onResendInvite = async (id) => {
    try {
      await api.post(`/users/${id}/resend-invite`);
      setMessage('Invite resent.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend invite');
    }
  };

  if (loading) return <div className="text-white">Loading users...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">User Management</h1>
        {canCreate && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="px-4 py-2 rounded-md bg-accentBg text-white font-semibold hover:bg-opacity-80"
          >
            {showForm ? 'Cancel' : '+ Add User'}
          </button>
        )}
      </div>

      {message && <div className="p-3 rounded bg-green-50 border border-green-200 text-green-700 text-sm">{message}</div>}
      {error && <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 text-gray-800">
          <h2 className="text-lg font-bold text-primaryBg mb-4">Create User (invite)</h2>
          <form onSubmit={handleSubmit(onCreate)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                type="text"
                {...register('name')}
                className={`w-full rounded-md border px-3 py-2 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                {...register('email')}
                className={`w-full rounded-md border px-3 py-2 ${errors.email ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="text"
                {...register('phone')}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                {...register('role')}
                className={`w-full rounded-md border px-3 py-2 ${errors.role ? 'border-red-400' : 'border-gray-300'}`}
              >
                {Object.entries(ROLES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.role && <p className="text-red-500 text-sm">{errors.role.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Org Unit</label>
              <select
                {...register('orgUnitId')}
                className={`w-full rounded-md border px-3 py-2 ${errors.orgUnitId ? 'border-red-400' : 'border-gray-300'}`}
              >
                <option value="">Select...</option>
                {orgUnits.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.type})
                  </option>
                ))}
              </select>
              {errors.orgUnitId && <p className="text-red-500 text-sm">{errors.orgUnitId.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Divisions (optional)</label>
              <select
                multiple
                {...register('divisions')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 h-24"
              >
                {divisions.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-md bg-accentBg text-white font-semibold hover:bg-opacity-80 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create & Invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{u.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                <td className="px-4 py-3 text-sm">{ROLES[u.role] || u.role}</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right space-x-2">
                  {u.status === 'invited' && (
                    <button onClick={() => onResendInvite(u._id)} className="text-primaryBg hover:underline">
                      Resend Invite
                    </button>
                  )}
                  {u.isActive && u._id !== currentUser?._id && (
                    <button onClick={() => onDeactivate(u._id, u.name)} className="text-red-500 hover:underline">
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;

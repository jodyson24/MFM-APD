import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/client.js';
import { createUserSchema } from '../../utils/validators.js';
import { ROLES } from '../../utils/constants.js';
import { useAuth } from '../../context/index.js';
import { Card, PageHeader, Button, Loading, EmptyState } from '../../components/ui/index.js';
import {
  PlusIcon,
  XMarkIcon,
  UserPlusIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PaperAirplaneIcon,
  UserMinusIcon,
} from '@heroicons/react/24/outline';

const STATUS_BADGE = {
  active: 'bg-emerald-100 text-emerald-700',
  invited: 'bg-amber-100 text-amber-700',
  deactivated: 'bg-red-100 text-red-700',
  inactive: 'bg-ink-100 text-ink-600',
};

const Avatar = ({ name, className = '' }) => {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white ${className}`}
    >
      {initials}
    </div>
  );
};

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

  const Alert = ({ tone = 'info', children }) => (
    <div
      className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm ${
        tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      {tone === 'success' ? (
        <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
      ) : (
        <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
      )}
      <span>{children}</span>
    </div>
  );

  if (loading) return <Loading full label="Loading users…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Invite and manage dashboard accounts."
        actions={
          canCreate && (
            <Button onClick={() => setShowForm((s) => !s)} variant={showForm ? 'secondary' : 'primary'}>
              {showForm ? (
                <>
                  <XMarkIcon className="h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <PlusIcon className="h-4 w-4" />
                  Add User
                </>
              )}
            </Button>
          )
        }
      />

      {message && (
        <Alert tone="success">{message}</Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}

      {showForm && (
        <Card className="animate-in">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <UserPlusIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-900">Create User (invite)</h2>
              <p className="text-xs text-ink-500">
                An invitation email with a set-password link will be sent.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onCreate)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Full Name</label>
              <input
                type="text"
                {...register('name')}
                className={`input ${errors.name ? 'input-error' : ''}`}
                placeholder="Pastor John Doe"
              />
              {errors.name && <p className="mt-1 text-sm text-danger">{errors.name.message}</p>}
            </div>
            <div>
              <label className="field-label">Email</label>
              <input
                type="email"
                {...register('email')}
                className={`input ${errors.email ? 'input-error' : ''}`}
                placeholder="john.doe@example.com"
              />
              {errors.email && <p className="mt-1 text-sm text-danger">{errors.email.message}</p>}
            </div>
            <div>
              <label className="field-label">Phone</label>
              <input
                type="text"
                {...register('phone')}
                className="input"
                placeholder="+234 800 000 0000"
              />
            </div>
            <div>
              <label className="field-label">Role</label>
              <select
                {...register('role')}
                className={`input ${errors.role ? 'input-error' : ''}`}
              >
                {Object.entries(ROLES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.role && <p className="mt-1 text-sm text-danger">{errors.role.message}</p>}
            </div>
            <div>
              <label className="field-label">Org Unit</label>
              <select
                {...register('orgUnitId')}
                className={`input ${errors.orgUnitId ? 'input-error' : ''}`}
              >
                <option value="">Select…</option>
                {orgUnits.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.type})
                  </option>
                ))}
              </select>
              {errors.orgUnitId && (
                <p className="mt-1 text-sm text-danger">{errors.orgUnitId.message}</p>
              )}
            </div>
            <div>
              <label className="field-label">Divisions (optional)</label>
              <select multiple {...register('divisions')} className="input h-24 cursor-pointer">
                {divisions.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 sm:col-span-2">
              <Button type="submit" disabled={isSubmitting} className="gap-1.5">
                <PaperAirplaneIcon className="h-4 w-4" />
                {isSubmitting ? 'Creating…' : 'Create & Invite'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card padded={false}>
        {users.length === 0 ? (
          <EmptyState
            icon={UserPlusIcon}
            title="No users yet"
            description="Invite the first user to get started."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} />
                        <span className="font-medium text-ink-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="text-ink-500">{u.email}</td>
                    <td>{ROLES[u.role] || u.role}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[u.status] || STATUS_BADGE.inactive}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        {u.status === 'invited' && (
                          <button
                            onClick={() => onResendInvite(u._id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700"
                          >
                            <PaperAirplaneIcon className="h-3.5 w-3.5" />
                            Resend Invite
                          </button>
                        )}
                        {u.isActive && u._id !== currentUser?._id && (
                          <button
                            onClick={() => onDeactivate(u._id, u.name)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 transition hover:text-red-700"
                          >
                            <UserMinusIcon className="h-3.5 w-3.5" />
                            Deactivate
                          </button>
                        )}
                      </div>
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

export default Users;

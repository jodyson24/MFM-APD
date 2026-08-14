import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/client.js';
import { createUserSchema } from '../../utils/validators.js';
import { ROLES } from '../../utils/constants.js';
import { useAuth, useToast } from '../../context/index.js';
import { canManageUsers } from '../../utils/permissions.js';
import { Card, PageHeader, Button, Loading, EmptyState, Modal } from '../../components/ui/index.js';
import {
  PlusIcon,
  XMarkIcon,
  UserPlusIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PaperAirplaneIcon,
  UserMinusIcon,
  PencilSquareIcon,
  KeyIcon,
  ClipboardDocumentIcon,
  ShieldCheckIcon,
  TrashIcon,
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

const Users = () => {
  const { user: currentUser } = useAuth();
  const { loadingToast } = useToast();
  const [users, setUsers] = useState([]);
  const [orgUnits, setOrgUnits] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Edit + reset state
  const [editingUser, setEditingUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [resetLink, setResetLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const confirmType = confirmAction?.type;
  const confirmUser = confirmAction?.user ?? null;

  const canCreate = canManageUsers(currentUser);
  const canDeleteUsers = !!currentUser && (currentUser.isSuperAdmin || currentUser.role === 'super_admin');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(createUserSchema) });

  const editForm = useForm({
    defaultValues: { name: '', phone: '', role: '', orgUnitId: '', divisions: [] },
  });

  const openEdit = (u) => {
    setEditingUser(u);
    editForm.reset({
      name: u.name,
      phone: u.phone || '',
      role: u.role,
      orgUnitId: u.orgUnitId?._id || u.orgUnitId || '',
      divisions: (u.divisions || []).map((d) => d._id || d),
    });
  };

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

  const onEdit = async (data) => {
    setError('');
    setMessage('');
    try {
      await api.put(`/users/${editingUser._id}`, data);
      setMessage('User updated.');
      setEditingUser(null);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
    }
  };

  const onDeactivate = async () => {
    if (!confirmAction?.type || !confirmAction?.user) return;

    try {
      await api.patch(`/users/${confirmAction.user._id}/deactivate`);
      setConfirmAction(null);
      setMessage('User deactivated.');
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate user');
    }
  };

  const onDelete = async () => {
    if (!confirmAction?.type || !confirmAction?.user) return;

    try {
      await api.delete(`/users/${confirmAction.user._id}`);
      setConfirmAction(null);
      setMessage('User deleted.');
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const onResendInvite = async (id) => {
    const toast = loadingToast({
      title: 'Resending invite',
      message: 'Sending the invitation email and preparing the set-password link…',
    });

    try {
      await api.post(`/users/${id}/resend-invite`);
      toast.stop('success', 'Invite sent', 'The invitation email was sent successfully.', 3200);
    } catch (err) {
      toast.stop(
        'error',
        'Invite not sent',
        err.response?.data?.message || 'Failed to resend invite.',
        4200
      );
    }
  };

  const onResetPassword = async (id) => {
    const toast = loadingToast({
      title: 'Resetting password',
      message: 'Generating a new set-password link and sending it by email…',
    });

    setError('');
    setCopied(false);
    try {
      const res = await api.post(`/users/${id}/reset-password`);
      setResetLink(res.data.resetLink || '');
      setResetUser(users.find((u) => u._id === id) || {});
      toast.stop(
        'success',
        'Password reset link ready',
        res.data.message || 'A reset link was generated and sent by email.',
        3800
      );
    } catch (err) {
      toast.stop(
        'error',
        'Reset failed',
        err.response?.data?.message || 'Failed to reset password.',
        4200
      );
      setError(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(resetLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  if (loading) return <Loading full label="Loading users…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle={
          canCreate
            ? 'Invite and manage dashboard accounts.'
            : 'Read-only view of dashboard accounts.'
        }
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

      {message && <Alert tone="success">{message}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      {showForm && canCreate && (
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
                  {canCreate && <th className="text-right">Actions</th>}
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
                    <td>
                      <span className="inline-flex items-center gap-1">
                        {u.isSuperAdmin && <ShieldCheckIcon className="h-3.5 w-3.5 text-brand-600" />}
                        {ROLES[u.role] || u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[u.status] || STATUS_BADGE.inactive}`}>
                        {u.status}
                      </span>
                    </td>
                    {canCreate && (
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => openEdit(u)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700"
                          >
                            <PencilSquareIcon className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          {u.status === 'invited' && (
                            <button
                              onClick={() => onResendInvite(u._id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700"
                            >
                              <PaperAirplaneIcon className="h-3.5 w-3.5" />
                              Resend Invite
                            </button>
                          )}
                          {u._id !== currentUser?._id && (
                            <button
                              onClick={() => onResetPassword(u._id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 transition hover:text-amber-700"
                            >
                              <KeyIcon className="h-3.5 w-3.5" />
                              Reset Password
                            </button>
                          )}
                          {u.isActive && u._id !== currentUser?._id && (
                            <button
                              onClick={() => setConfirmAction({ type: 'deactivate', user: u })}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 transition hover:text-red-700"
                            >
                              <UserMinusIcon className="h-3.5 w-3.5" />
                              Deactivate
                            </button>
                          )}
                          {canDeleteUsers && u._id !== currentUser?._id && (
                            <button
                              onClick={() => setConfirmAction({ type: 'delete', user: u })}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 transition hover:text-red-800"
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit user modal */}
      <Modal
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Edit User"
        subtitle={editingUser ? `${editingUser.name} · ${editingUser.email}` : ''}
        icon={PencilSquareIcon}
        size="lg"
      >
        <form
          onSubmit={editForm.handleSubmit(onEdit)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div>
            <label className="field-label">Full Name</label>
            <input type="text" {...editForm.register('name')} className="input" />
          </div>
          <div>
            <label className="field-label">Phone</label>
            <input type="text" {...editForm.register('phone')} className="input" />
          </div>
          <div>
            <label className="field-label">Role</label>
            <select {...editForm.register('role')} className="input">
              {Object.entries(ROLES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Org Unit</label>
            <select {...editForm.register('orgUnitId')} className="input">
              {orgUnits.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.type})
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Divisions (optional)</label>
            <select multiple {...editForm.register('divisions')} className="input h-24 cursor-pointer">
              {divisions.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={editForm.formState.isSubmitting} className="gap-1.5">
              {editForm.formState.isSubmitting ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmType === 'delete' ? 'Delete User' : 'Deactivate User'}
        subtitle={confirmUser ? `${confirmUser.name} · ${confirmUser.email}` : 'Confirm action'}
        icon={confirmType === 'delete' ? TrashIcon : UserMinusIcon}
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={confirmType === 'delete' ? 'danger' : 'secondary'}
              onClick={() => {
                if (!confirmAction) return;
                if (confirmType === 'delete') {
                  onDelete();
                } else {
                  onDeactivate();
                }
              }}
              className={confirmType === 'delete' ? 'bg-red-600 text-white hover:bg-red-700' : ''}
            >
              {confirmType === 'delete' ? 'Delete User' : 'Deactivate User'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-ink-600">
            {confirmType === 'delete'
              ? `This will permanently remove ${confirmUser?.name || 'this user'} from the system. This action cannot be undone.`
              : `This will deactivate ${confirmUser?.name || 'this user'}. They will no longer be able to sign in until reactivated.`}
          </p>
          {confirmType === 'delete' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Warning: deleting a user removes their account from the platform permanently.
            </div>
          )}
        </div>
      </Modal>

      {/* Reset password modal */}
      <Modal
        open={!!resetLink}
        onClose={() => {
          setResetLink('');
          setResetUser(null);
        }}
        title="Reset Password"
        subtitle={resetUser?.name ? `${resetUser.name} · ${resetUser.email}` : 'Password reset'}
        icon={KeyIcon}
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-600">
            The user's password has been cleared. Share this one-time link with them so they can set
            a new password. It expires in <strong>72 hours</strong>.
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={resetLink}
              onFocus={(e) => e.target.select()}
              className="input flex-1 bg-ink-50 font-mono text-xs"
            />
            <Button type="button" variant="secondary" onClick={copyLink} className="gap-1.5 shrink-0">
              <ClipboardDocumentIcon className="h-4 w-4" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Users;

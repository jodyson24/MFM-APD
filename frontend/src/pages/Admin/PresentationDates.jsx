import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client.js';
import { useAuth, useToast } from '../../context/index.js';
import { useRealtime } from '../../hooks/useRealtime.js';
import { canManagePresentationDates } from '../../utils/permissions.js';
import { Card, PageHeader, Button, Loading, EmptyState, Modal } from '../../components/ui/index.js';
import {
  CalendarDaysIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

// Phase 2 — "Manage Presentation Dates" menu (§6.1): the two bi-annual
// presentation dates are admin-editable, never hardcoded.
const PresentationDates = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManage = canManagePresentationDates(user);

  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ label: '', periodStart: '', periodEnd: '', presentationDate: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCycles = useCallback(({ silent } = {}) => {
    if (!silent) setLoading(true);
    api
      .get('/presentation-cycles')
      .catch(() => [])
      .then((res) => setCycles(res.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  // Live refresh when another user changes presentation cycles.
  useRealtime(['cycles'], () => fetchCycles({ silent: true }));

  const toLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const toDateInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ label: '', periodStart: '', periodEnd: '', presentationDate: '' });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      label: c.label,
      periodStart: toDateInput(c.periodStart),
      periodEnd: toDateInput(c.periodEnd),
      presentationDate: toLocalInput(c.presentationDate),
    });
    setFormError('');
    setShowForm(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.label.trim() || !form.periodStart || !form.periodEnd || !form.presentationDate) {
      return setFormError('All fields are required.');
    }
    const payload = {
      label: form.label.trim(),
      periodStart: new Date(`${form.periodStart}T00:00:00`).toISOString(),
      periodEnd: new Date(`${form.periodEnd}T23:59:59`).toISOString(),
      presentationDate: new Date(form.presentationDate).toISOString(),
    };
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/presentation-cycles/${editing._id}`, payload);
        showToast({ type: 'success', title: 'Cycle updated', message: `Presentation cycle "${payload.label}" was saved.` });
      } else {
        await api.post('/presentation-cycles', payload);
        showToast({ type: 'success', title: 'Cycle created', message: `Presentation cycle "${payload.label}" was created.` });
      }
      setShowForm(false);
      fetchCycles();
    } catch (err) {
      showToast({ type: 'error', title: 'Save failed', message: err.response?.data?.message || 'Failed to save cycle' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/presentation-cycles/${deleteTarget._id}`);
      showToast({ type: 'success', title: 'Cycle deleted', message: `Presentation cycle "${deleteTarget.label}" was removed.` });
      setDeleteTarget(null);
      fetchCycles();
    } catch (err) {
      showToast({ type: 'error', title: 'Delete failed', message: err.response?.data?.message || 'Failed to delete cycle' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Loading full label="Loading presentation dates…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presentation Dates"
        subtitle="Set the two bi-annual presentation cycles and their period windows."
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              Add Cycle
            </Button>
          )
        }
      />

      {showForm && canManage && (
        <Card className="animate-in">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <CalendarDaysIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-900">
                {editing ? `Edit ${editing.label}` : 'Add Presentation Cycle'}
              </h2>
              <p className="text-xs text-ink-500">
                e.g. H1 2026 (period Jan–Jun) presenting in July, and H2 2026 (period Jul–Dec)
                presenting in January.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Label</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                className="input"
                placeholder="e.g. H1 2026"
              />
            </div>
            <div>
              <label className="field-label">Presentation Date</label>
              <input
                type="datetime-local"
                value={form.presentationDate}
                onChange={(e) => setForm((f) => ({ ...f, presentationDate: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="field-label">Period Start</label>
              <input
                type="date"
                value={form.periodStart}
                onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="field-label">Period End</label>
              <input
                type="date"
                value={form.periodEnd}
                onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
                className="input"
              />
            </div>

            {formError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">
                <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 sm:col-span-2">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Cycle'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card padded={false}>
        {cycles.length === 0 ? (
          <EmptyState
            icon={CalendarDaysIcon}
            title="No presentation cycles"
            description="Add the two bi-annual presentation dates to power countdowns and compliance periods."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Period</th>
                  <th>Presentation</th>
                  <th>Status</th>
                  {canManage && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {cycles.map((c) => (
                  <tr key={c._id}>
                    <td className="font-semibold text-ink-900">{c.label}</td>
                    <td className="text-sm text-ink-600">
                      {new Date(c.periodStart).toLocaleDateString()} —{' '}
                      {new Date(c.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="text-sm text-ink-600">
                      {new Date(c.presentationDate).toLocaleDateString(undefined, {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          c.status === 'upcoming'
                            ? 'bg-brand-100 text-brand-700'
                            : 'bg-ink-100 text-ink-500'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    {canManage && (
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => openEdit(c)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700"
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(c)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 transition hover:text-red-700"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                            Delete
                          </button>
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

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Delete Presentation Cycle"
        subtitle={deleteTarget ? deleteTarget.label : 'Confirm deletion'}
        icon={TrashIcon}
        size="sm"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={confirmDelete}
              disabled={deleting}
              className="gap-1.5"
            >
              <TrashIcon className="h-4 w-4" />
              {deleting ? 'Deleting…' : 'Delete Cycle'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-ink-600">
            This will permanently remove the presentation cycle{' '}
            <strong>{deleteTarget?.label}</strong> and its period window. This action cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default PresentationDates;
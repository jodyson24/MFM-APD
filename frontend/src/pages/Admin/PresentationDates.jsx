import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import { useAuth } from '../../context/index.js';
import { Card, PageHeader, Button, Loading, EmptyState } from '../../components/ui/index.js';
import {
  CalendarDaysIcon,
  PlusIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

// Phase 2 — "Manage Presentation Dates" menu (§6.1): the two bi-annual
// presentation dates are admin-editable, never hardcoded.
const PresentationDates = () => {
  const { user } = useAuth();
  const canManage = user?.isSuperAdmin || user?.role === 'mega_region_admin';

  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ label: '', periodStart: '', periodEnd: '', presentationDate: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchCycles = () => {
    setLoading(true);
    api
      .get('/presentation-cycles')
      .catch(() => [])
      .then((res) => setCycles(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCycles();
  }, []);

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
    setError('');
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
    setError('');
    setShowForm(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!form.label.trim() || !form.periodStart || !form.periodEnd || !form.presentationDate) {
      return setError('All fields are required.');
    }
    const payload = {
      label: form.label.trim(),
      periodStart: new Date(`${form.periodStart}T00:00:00`).toISOString(),
      periodEnd: new Date(`${form.periodEnd}T23:59:59`).toISOString(),
      presentationDate: new Date(form.presentationDate).toISOString(),
    };
    try {
      if (editing) {
        await api.put(`/presentation-cycles/${editing._id}`, payload);
        setMessage('Presentation cycle updated.');
      } else {
        await api.post('/presentation-cycles', payload);
        setMessage('Presentation cycle created.');
      }
      setShowForm(false);
      fetchCycles();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save cycle');
    }
  };

  const onDelete = async (c) => {
    if (!window.confirm(`Delete presentation cycle "${c.label}"?`)) return;
    try {
      await api.delete(`/presentation-cycles/${c._id}`);
      setMessage('Presentation cycle deleted.');
      fetchCycles();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete cycle');
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
            <Button onClick={() => (showForm ? setShowForm(false) : openCreate())} variant={showForm ? 'secondary' : 'primary'}>
              {showForm ? (
                <>
                  <XMarkIcon className="h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <PlusIcon className="h-4 w-4" />
                  Add Cycle
                </>
              )}
            </Button>
          )
        }
      />

      {message && (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

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
            <div className="flex justify-end gap-3 sm:col-span-2">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit">{editing ? 'Save Changes' : 'Create Cycle'}</Button>
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
                            onClick={() => onDelete(c)}
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
    </div>
  );
};

export default PresentationDates;
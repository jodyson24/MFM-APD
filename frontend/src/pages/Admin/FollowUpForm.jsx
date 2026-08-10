import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/client.js';
import { uploadFiles } from '../../utils/upload.js';
import FileUpload from '../../components/forms/FileUpload.jsx';
import { activityFollowUpSchema } from '../../utils/validators.js';
import { Card, Button, Loading, Badge } from '../../components/ui/index.js';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentCheckIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

const FollowUpForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [extraFields, setExtraFields] = useState([]);
  const [metricValues, setMetricValues] = useState({});
  const [otherJson, setOtherJson] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(activityFollowUpSchema),
    mode: 'onChange',
    defaultValues: { wasHeld: null, media: [], metrics: {}, rescheduledDate: '' },
  });

  const watchedWasHeld = watch('wasHeld');

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await api.get(`/activities/${id}`);
        setActivity(res.data);
        setExtraFields(res.data.activityTypeId?.extraFields || []);
        setLoading(false);
      } catch {
        navigate('/admin/activities');
      }
    };
    fetchActivity();
  }, [id, navigate]);

  const hasImage = (files = []) => files.some((f) => f.type?.startsWith('image/'));

  const updateMetric = (key, value) => setMetricValues((prev) => ({ ...prev, [key]: value }));

  // Build the metrics object from the per-type fields + attendance breakdown + any JSON extras
  const buildMetrics = () => {
    const metrics = {};

    for (const field of extraFields) {
      const raw = metricValues[field.key];
      const isEmpty = raw === undefined || raw === null || String(raw).trim() === '';
      if (isEmpty) {
        if (field.required) {
          throw new Error(`${field.label} is required`);
        }
        continue;
      }
      if (field.dataType === 'number') {
        metrics[field.key] = Number(raw);
      } else if (field.dataType === 'array') {
        metrics[field.key] = String(raw)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        metrics[field.key] = String(raw);
      }
    }

    const attendance = {};
    for (const key of ['adults', 'children', 'teenagers', 'youth', 'total']) {
      const raw = metricValues[`attendanceBreakdown.${key}`];
      if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
        attendance[key] = Number(raw);
      }
    }
    if (Object.keys(attendance).length) metrics.attendanceBreakdown = attendance;

    if (otherJson.trim()) {
      const parsed = JSON.parse(otherJson);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        Object.assign(metrics, parsed);
      }
    }

    return metrics;
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    setServerError('');
    try {
      let metrics;
      try {
        metrics = buildMetrics();
      } catch (err) {
        setServerError(err.message);
        setSubmitting(false);
        return;
      }

      // Upload pictorial evidence to the server so URLs are real and persist
      const mediaData = data.media?.length ? await uploadFiles(data.media) : [];

      const payload = {
        wasHeld: data.wasHeld,
        narrativeReport: data.narrativeReport,
        metrics,
        media: mediaData,
        notHeldReason: data.notHeldReason,
      };
      if (data.wasHeld === false && data.rescheduledDate) {
        const iso = new Date(data.rescheduledDate);
        if (!Number.isNaN(iso.getTime())) {
          payload.rescheduledDate = iso.toISOString();
        }
      }

      await api.post(`/activities/${id}/follow-up`, payload);
      navigate('/admin/activities');
    } catch (err) {
      if (err instanceof SyntaxError) {
        setServerError('Metrics must be valid JSON, e.g. {"attendance": 150}');
      } else {
        setServerError(err.response?.data?.message || 'Submission failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const attendanceSubfields = ['adults', 'children', 'teenagers', 'youth', 'total'];

  // Render a metric input for one extraField descriptor (string / number / enum / array)
  const renderMetricField = (field) => {
    const base = {
      key: field.key,
      label: field.label,
      required: field.required,
      value: metricValues[field.key] || '',
    };
    if (field.dataType === 'number') {
      return (
        <input
          key={base.key}
          type="number"
          step="any"
          value={base.value}
          onChange={(e) => updateMetric(base.key, e.target.value)}
          className="input"
        />
      );
    }
    if (field.dataType === 'enum') {
      return (
        <select key={base.key} value={base.value} onChange={(e) => updateMetric(base.key, e.target.value)} className="input">
          <option value="">Select…</option>
          {(field.enumOptions || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }
    if (field.dataType === 'array') {
      return (
        <input
          key={base.key}
          type="text"
          value={base.value}
          onChange={(e) => updateMetric(base.key, e.target.value)}
          className="input"
          placeholder="Comma-separated values"
        />
      );
    }
    return (
      <input
        key={base.key}
        type="text"
        value={base.value}
        onChange={(e) => updateMetric(base.key, e.target.value)}
        className="input"
      />
    );
  };

  if (loading) return <Loading full label="Loading activity…" />;

  const disableSubmit =
    submitting || watchedWasHeld === null || (watchedWasHeld === true && !hasImage(watch('media')));

  const heldOptions = [
    { value: true, label: 'Yes, it was held', icon: CheckCircleIcon, active: 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', inactive: 'border-ink-200 text-ink-500 hover:border-ink-300 hover:bg-ink-50' },
    { value: false, label: 'No, not held', icon: XCircleIcon, active: 'border-red-500 bg-red-50 text-red-700 ring-1 ring-red-200', inactive: 'border-ink-200 text-ink-500 hover:border-ink-300 hover:bg-ink-50' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        onClick={() => navigate('/admin/activities')}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition hover:text-brand-700"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Activities
      </button>

      <Card className="p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <ClipboardDocumentCheckIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-ink-900">Follow-Up Report</h1>
            <p className="truncate text-sm text-ink-500">{activity?.title}</p>
          </div>
          <div className="ml-auto shrink-0">
            <Badge status={activity?.status} />
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2 rounded-xl bg-ink-50/70 p-4 text-sm ring-1 ring-ink-100">
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              Scheduled
            </span>
            <span className="font-medium text-ink-800">
              {new Date(activity?.scheduledDate).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              Org Unit
            </span>
            <span className="font-medium text-ink-800">{activity?.orgUnitId?.name || '—'}</span>
          </div>
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              Type
            </span>
            <span className="font-medium text-ink-800">
              {activity?.activityTypeId?.name || '—'}
            </span>
          </div>
        </div>

        {serverError && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
          {/* Yes/No toggle */}
          <div>
            <label className="field-label">Was this activity carried out?</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {heldOptions.map(({ value, label, icon: Icon, active, inactive }) => {
                const selected = watchedWasHeld === value;
                return (
                  <button
                    key={String(value)}
                    type="button"
                    onClick={() => setValue('wasHeld', value)}
                    className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-sm font-semibold transition ${
                      selected ? active : inactive
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                );
              })}
            </div>
            {errors.wasHeld && <p className="mt-2 text-sm text-danger">{errors.wasHeld.message}</p>}
          </div>

          {/* Yes branch */}
          {watchedWasHeld === true && (
            <div className="space-y-6 rounded-xl bg-emerald-50/40 p-5 ring-1 ring-emerald-100">
              <div>
                <label className="field-label">Narrative Report</label>
                <Controller
                  name="narrativeReport"
                  control={control}
                  render={({ field }) => (
                    <textarea
                      {...field}
                      rows="4"
                      className="input resize-y"
                      placeholder="Summarise what happened, key highlights, and outcomes…"
                    />
                  )}
                />
                {errors.narrativeReport && (
                  <p className="mt-1 text-sm text-danger">{errors.narrativeReport.message}</p>
                )}
              </div>

              <div>
                <label className="field-label">Outcome Metrics</label>
                {extraFields.length === 0 && (
                  <p className="mb-3 rounded-lg bg-ink-50 p-3 text-sm text-ink-500 ring-1 ring-ink-100">
                    No additional metrics are defined for this activity type. You can still record
                    attendance below or add custom metrics in JSON.
                  </p>
                )}
                {extraFields.length > 0 && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {extraFields.map((field) => (
                      <div key={field.key}>
                        <label className="field-label">
                          {field.label}
                          {field.required && <span className="text-danger"> *</span>}
                        </label>
                        {renderMetricField(field)}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5">
                  <label className="field-label">Attendance Breakdown (optional)</label>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                    {attendanceSubfields.map((key) => (
                      <div key={key}>
                        <label className="field-label capitalize">{key}</label>
                        <input
                          type="number"
                          step="any"
                          value={metricValues[`attendanceBreakdown.${key}`] || ''}
                          onChange={(e) => updateMetric(`attendanceBreakdown.${key}`, e.target.value)}
                          className="input"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <label className="field-label">Additional Metrics (JSON, optional)</label>
                  <textarea
                    rows="3"
                    value={otherJson}
                    onChange={(e) => setOtherJson(e.target.value)}
                    placeholder='{"budgetOrResources": {"amount": 50000, "currency": "NGN"}, "followUpsConducted": 9}'
                    className="input resize-y font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-ink-400">
                    Optional. Any extra numeric/string/bool metrics not covered above.
                  </p>
                </div>
              </div>

              <div>
                <Controller
                  name="media"
                  control={control}
                  render={({ field }) => (
                    <FileUpload
                      label="Pictorial Evidence (at least 1 photo required)"
                      multiple
                      accept="image/*,video/*"
                      value={field.value || []}
                      onChange={(files) => {
                        field.onChange(files);
                        if (hasImage(files)) clearErrors('media');
                        else setError('media', { type: 'custom', message: 'Attach at least one photo before submitting' });
                      }}
                      error={errors.media?.message}
                    />
                  )}
                />
                {watchedWasHeld === true && !hasImage(watch('media')) && (
                  <p className="mt-1 text-sm font-medium text-amber-600">
                    Attach at least one photo before submitting (mandatory pictorial evidence).
                  </p>
                )}
              </div>
            </div>
          )}

          {/* No branch */}
          {watchedWasHeld === false && (
            <div className="rounded-xl bg-red-50/40 p-5 ring-1 ring-red-100">
              <label className="field-label">Reason not held</label>
              <Controller
                name="notHeldReason"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    rows="3"
                    className="input resize-y"
                    placeholder="Why was this activity not carried out?"
                  />
                )}
              />
              {errors.notHeldReason && (
                <p className="mt-1 text-sm text-danger">{errors.notHeldReason.message}</p>
              )}

              <div className="mt-5 border-t border-red-100 pt-4">
                <label className="field-label">Reschedule this activity? (optional)</label>
                <Controller
                  name="rescheduledDate"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="datetime-local"
                      className="input"
                    />
                  )}
                />
                {errors.rescheduledDate && (
                  <p className="mt-1 text-sm text-danger">{errors.rescheduledDate.message}</p>
                )}
                <p className="mt-1.5 text-xs text-ink-500">
                  Providing a date auto-creates a new scheduled activity linked to this one, so the
                  missed event isn&apos;t counted twice.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => navigate('/admin/activities')}>
              Cancel
            </Button>
            <Button type="submit" disabled={disableSubmit}>
              {submitting ? 'Uploading & submitting…' : 'Submit Report'}
            </Button>
          </div>
          {watchedWasHeld === true && !hasImage(watch('media')) && (
            <p className="text-right text-xs text-ink-400">
              Submit stays disabled until a photo is attached.
            </p>
          )}
        </form>
      </Card>
    </div>
  );
};

export default FollowUpForm;

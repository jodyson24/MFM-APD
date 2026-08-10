import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/client.js';
import { createActivitySchema } from '../../utils/validators.js';
import { uploadFiles } from '../../utils/upload.js';
import SelectInput from '../../components/forms/SelectInput.jsx';
import MediaUploader from '../../components/forms/MediaUploader.jsx';
import { Card, Button, Loading } from '../../components/ui/index.js';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

const ActivityForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [orgUnits, setOrgUnits] = useState([]);
  const [activityCategories, setActivityCategories] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState('');
  const [mediaItems, setMediaItems] = useState([]);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(createActivitySchema) });

  useEffect(() => {
    Promise.all([
      api.get('/org-units'),
      api.get('/lookups/activity-categories').catch(() => ({ data: [] })),
      api.get('/lookups/activity-types'),
      api.get('/lookups/divisions'),
      api.get('/lookups/strategic-initiatives').catch(() => ({ data: [] })),
      ...(isEdit ? [api.get(`/activities/${id}`)] : []),
    ])
      .then(([orgRes, catRes, typeRes, divRes, initRes, activityRes]) => {
        setOrgUnits(orgRes.data);
        setActivityCategories(catRes.data);
        setActivityTypes(typeRes.data);
        setDivisions(divRes.data);
        setInitiatives(initRes.data);
        if (activityRes) {
          const a = activityRes.data;
          reset({
            orgUnitId: a.orgUnitId._id,
            activityTypeId: a.activityTypeId._id,
            divisions: (a.divisions || []).map((d) => d._id),
            strategicInitiativeId: a.strategicInitiativeId || '',
            title: a.title,
            description: a.description || '',
            scheduledDate: a.scheduledDate ? a.scheduledDate.slice(0, 10) : '',
            scheduledEndDate: a.scheduledEndDate ? a.scheduledEndDate.slice(0, 10) : '',
          });
          setMediaItems(
            (a.media || []).map((m) => ({ url: m.url, mediaType: m.mediaType, caption: m.caption }))
          );
        }
      })
      .catch((err) => setServerError(err.response?.data?.message || 'Failed to load form data'))
      .finally(() => setLoading(false));
  }, [isEdit, id, reset]);

  const onSubmit = async (data) => {
    setServerError('');
    setUploading(true);
    try {
      // Upload newly-picked files first, keep previously-saved media as-is
      const pending = mediaItems.filter((m) => m.file);
      const saved = mediaItems.filter((m) => !m.file);
      const uploaded = pending.length ? await uploadFiles(pending.map((m) => m.file)) : [];

      const media = [
        ...saved.map((m) => ({ mediaType: m.mediaType, url: m.url, caption: m.caption })),
        ...uploaded.map((u) => ({ mediaType: u.mediaType, url: u.url, caption: u.caption })),
      ];

      const payload = {
        ...data,
        divisions: data.divisions || [],
        strategicInitiativeId: data.strategicInitiativeId || null,
        scheduledDate: new Date(data.scheduledDate).toISOString(),
        scheduledEndDate: data.scheduledEndDate ? new Date(data.scheduledEndDate).toISOString() : undefined,
        media,
      };

      if (isEdit) {
        await api.put(`/activities/${id}`, payload);
      } else {
        await api.post('/activities', payload);
      }
      navigate('/admin/activities');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to save activity');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <Loading full label="Loading form…" />;

  // Group activity types by their category for a browsable, catalog-aware dropdown
  const categoriesById = new Map(activityCategories.map((c) => [c._id, c]));
  const typesByCategory = activityTypes.reduce((acc, t) => {
    const catId = t.activityCategoryId?._id;
    const key = catId || 'uncategorised';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const onTypeChange = (e) => {
    const type = activityTypes.find((t) => t._id === e.target.value);
    if (type) {
      const category = type.activityCategoryId
        ? categoriesById.get(type.activityCategoryId._id)
        : null;
      const suggested = category?.programAreaIds?.[0];
      if (suggested) setValue('strategicInitiativeId', suggested._id);
    }
  };

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
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <CalendarDaysIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink-900">
              {isEdit ? 'Edit Activity' : 'Schedule Activity'}
            </h1>
            <p className="text-sm text-ink-500">
              {isEdit
                ? 'Update the details of this activity.'
                : 'Add a new activity to your calendar.'}
            </p>
          </div>
        </div>

        {serverError && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="field-label">Title</label>
            <input
              type="text"
              {...register('title')}
              className={`input ${errors.title ? 'input-error' : ''}`}
              placeholder="e.g. Mega Regional Crusade — Lagos"
            />
            {errors.title && <p className="mt-1 text-sm text-danger">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectInput label="Org Unit" error={errors.orgUnitId?.message} {...register('orgUnitId')}>
              <option value="">Select org unit…</option>
              {orgUnits.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.type})
                </option>
              ))}
            </SelectInput>

            <SelectInput
              label="Activity Type"
              error={errors.activityTypeId?.message}
              {...register('activityTypeId')}
              onChange={(e) => {
                register('activityTypeId').onChange(e);
                onTypeChange(e);
              }}
            >
              <option value="">Select type…</option>
              {Object.entries(typesByCategory).map(([catId, types]) => {
                const cat = categoriesById.get(catId);
                return (
                  <optgroup key={catId} label={cat ? `${cat.name}${cat.tier === 'core' ? ' [CORE]' : ''}` : 'Other'}>
                    {types.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </SelectInput>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Scheduled Date</label>
              <input
                type="date"
                {...register('scheduledDate')}
                className={`input ${errors.scheduledDate ? 'input-error' : ''}`}
              />
              {errors.scheduledDate && <p className="mt-1 text-sm text-danger">{errors.scheduledDate.message}</p>}
            </div>
            <div>
              <label className="field-label">End Date (optional)</label>
              <input type="date" {...register('scheduledEndDate')} className="input" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Divisions (optional)</label>
              <Controller
                name="divisions"
                control={control}
                render={({ field }) => (
                  <select
                    multiple
                    value={field.value || []}
                    onChange={(e) =>
                      field.onChange(Array.from(e.target.selectedOptions).map((o) => o.value))
                    }
                    className="input h-32 cursor-pointer"
                  >
                    {divisions.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
              />
              <p className="mt-1 text-xs text-ink-400">Hold Ctrl/Cmd to select multiple.</p>
            </div>

            <SelectInput label="Strategic Initiative (optional)" {...register('strategicInitiativeId')}>
              <option value="">None</option>
              {initiatives.map((i) => (
                <option key={i._id} value={i._id}>
                  {i.title}
                </option>
              ))}
            </SelectInput>
          </div>

          <div>
            <label className="field-label">Description</label>
            <textarea
              rows="3"
              {...register('description')}
              className="input resize-y"
              placeholder="Brief description of the activity…"
            />
          </div>

          <MediaUploader
            label="Pictorial Evidence (optional)"
            items={mediaItems}
            onChange={setMediaItems}
            hint="Images/videos attached here are kept with the activity and can be used in the bi-annual presentation deck. You can add more later via the follow-up report."
          />

          <div className="flex flex-col-reverse gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => navigate('/admin/activities')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || uploading}>
              {uploading
                ? 'Uploading media…'
                : isSubmitting
                  ? 'Saving…'
                  : isEdit
                    ? 'Update Activity'
                    : 'Schedule Activity'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ActivityForm;

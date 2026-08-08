import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/client';
import { createActivitySchema } from '../../utils/validators';
import SelectInput from '../../components/forms/SelectInput';

const ActivityForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [orgUnits, setOrgUnits] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(createActivitySchema) });

  useEffect(() => {
    Promise.all([
      api.get('/org-units'),
      api.get('/lookups/activity-types'),
      api.get('/lookups/divisions'),
      api.get('/lookups/strategic-initiatives').catch(() => ({ data: [] })),
      ...(isEdit ? [api.get(`/activities/${id}`)] : []),
    ])
      .then(([orgRes, typeRes, divRes, initRes, activityRes]) => {
        setOrgUnits(orgRes.data);
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
        }
      })
      .catch((err) => setServerError(err.response?.data?.message || 'Failed to load form data'))
      .finally(() => setLoading(false));
  }, [isEdit, id, reset]);

  const onSubmit = async (data) => {
    setServerError('');
    const payload = {
      ...data,
      divisions: data.divisions || [],
      strategicInitiativeId: data.strategicInitiativeId || null,
      scheduledDate: new Date(data.scheduledDate).toISOString(),
      scheduledEndDate: data.scheduledEndDate ? new Date(data.scheduledEndDate).toISOString() : undefined,
    };
    try {
      if (isEdit) {
        await api.put(`/activities/${id}`, payload);
      } else {
        await api.post('/activities', payload);
      }
      navigate('/admin/activities');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to save activity');
    }
  };

  if (loading) return <div className="text-white">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6 text-gray-800">
      <h1 className="text-2xl font-bold text-primaryBg mb-6">{isEdit ? 'Edit Activity' : 'Schedule Activity'}</h1>

      {serverError && (
        <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{serverError}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            {...register('title')}
            className={`w-full rounded-md border shadow-sm px-3 py-2 ${errors.title ? 'border-red-400' : 'border-gray-300'}`}
          />
          {errors.title && <p className="mt-1 text-red-500 text-sm">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput label="Org Unit" error={errors.orgUnitId?.message} {...register('orgUnitId')}>
            <option value="">Select org unit...</option>
            {orgUnits.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name} ({u.type})
              </option>
            ))}
          </SelectInput>

          <SelectInput label="Activity Type" error={errors.activityTypeId?.message} {...register('activityTypeId')}>
            <option value="">Select type...</option>
            {activityTypes.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </SelectInput>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
            <input
              type="date"
              {...register('scheduledDate')}
              className={`w-full rounded-md border shadow-sm px-3 py-2 ${errors.scheduledDate ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.scheduledDate && <p className="mt-1 text-red-500 text-sm">{errors.scheduledDate.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
            <input
              type="date"
              {...register('scheduledEndDate')}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Divisions (optional)</label>
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
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 h-28"
                >
                  {divisions.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
            />
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            rows="3"
            {...register('description')}
            className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/admin/activities')}
            className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md bg-accentBg text-white font-semibold hover:bg-opacity-80 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Schedule'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ActivityForm;

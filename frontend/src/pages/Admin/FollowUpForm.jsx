import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/client';
import FileUpload from '../../components/forms/FileUpload';
import { activityFollowUpSchema } from '../../utils/validators';

const FollowUpForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
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
    defaultValues: { wasHeld: null, media: [], metrics: {} },
  });

  const watchedWasHeld = watch('wasHeld');

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await api.get(`/activities/${id}`);
        setActivity(res.data);
        setLoading(false);
      } catch {
        navigate('/admin/activities');
      }
    };
    fetchActivity();
  }, [id, navigate]);

  const hasImage = (files = []) => files.some((f) => f.type?.startsWith('image/'));

  const onSubmit = async (data) => {
    setSubmitting(true);
    setServerError('');
    try {
      const metrics = data.metrics || {};

      // Dev placeholder: media items are local blob URLs. Replace with presigned
      // S3/R2 upload URLs before media arrives in the "Yes" branch (§10.2).
      const mediaData = (data.media || []).map((file) => ({
        mediaType: file.type?.startsWith('image/') ? 'image' : 'video',
        url: URL.createObjectURL(file),
        caption: file.name,
      }));

      const payload = {
        wasHeld: data.wasHeld,
        narrativeReport: data.narrativeReport,
        metrics,
        media: mediaData,
        notHeldReason: data.notHeldReason,
      };

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

  if (loading) return <div className="text-white">Loading activity...</div>;

  const disableSubmit =
    submitting || watchedWasHeld === null || (watchedWasHeld === true && !hasImage(watch('media')));

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6 text-gray-800">
      <h1 className="text-2xl font-bold text-primaryBg mb-6">Follow-Up Report</h1>
      <p className="mb-4">
        <strong>Activity:</strong> {activity?.title} <br />
        <strong>Scheduled:</strong> {new Date(activity?.scheduledDate).toLocaleDateString()}
      </p>

      {serverError && (
        <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{serverError}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Yes/No toggle (§10) */}
        <div>
          <label className="block text-sm font-medium mb-2">Was this activity carried out?</label>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={watchedWasHeld === true}
                onChange={() => setValue('wasHeld', true)}
              />
              <span>Yes</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={watchedWasHeld === false}
                onChange={() => setValue('wasHeld', false)}
              />
              <span>No</span>
            </label>
          </div>
          {errors.wasHeld && <p className="text-red-500 text-sm">{errors.wasHeld.message}</p>}
        </div>

        {/* Yes branch */}
        {watchedWasHeld === true && (
          <>
            <div>
              <label className="block text-sm font-medium">Narrative Report</label>
              <Controller
                name="narrativeReport"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    rows="4"
                    className="mt-1 w-full rounded-md border border-gray-300 shadow-sm focus:border-primaryBg focus:ring-primaryBg px-3 py-2"
                  />
                )}
              />
              {errors.narrativeReport && <p className="text-red-500 text-sm">{errors.narrativeReport.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium">Metrics (JSON)</label>
              <Controller
                name="metrics"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    rows="3"
                    placeholder='{"attendance": 150, "soulsWon": 12}'
                    value={typeof field.value === 'string' ? field.value : JSON.stringify(field.value || {}, null, 2)}
                    onChange={(e) => {
                      const text = e.target.value;
                      try {
                        const parsed = text.trim() ? JSON.parse(text) : {};
                        if (parsed && typeof parsed === 'object') {
                          setValue('metrics', parsed, { shouldValidate: true });
                          clearErrors('metrics');
                          return;
                        }
                      } catch {
                        // fall through to invalid-string state so the schema surfaces the error
                      }
                      setValue('metrics', text, { shouldValidate: true });
                    }}
                    className="mt-1 w-full rounded-md border border-gray-300 shadow-sm focus:border-primaryBg focus:ring-primaryBg px-3 py-2"
                  />
                )}
              />
              {errors.metrics && <p className="text-red-500 text-sm">{errors.metrics.message}</p>}
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
                <p className="mt-1 text-amber-600 text-sm">
                  Attach at least one photo before submitting (mandatory pictorial evidence).
                </p>
              )}
            </div>
          </>
        )}

        {/* No branch */}
        {watchedWasHeld === false && (
          <div>
            <label className="block text-sm font-medium">Reason not held</label>
            <Controller
              name="notHeldReason"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  rows="3"
                  className="mt-1 w-full rounded-md border border-gray-300 shadow-sm focus:border-primaryBg focus:ring-primaryBg px-3 py-2"
                  placeholder="Why was this activity not carried out?"
                />
              )}
            />
            {errors.notHeldReason && <p className="text-red-500 text-sm">{errors.notHeldReason.message}</p>}
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/admin/activities')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={disableSubmit}
            className="px-4 py-2 bg-accentBg text-white rounded-md shadow-sm hover:bg-opacity-80 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
        {watchedWasHeld === true && !hasImage(watch('media')) && (
          <p className="text-right text-xs text-gray-500">Submit stays disabled until a photo is attached.</p>
        )}
      </form>
    </div>
  );
};

export default FollowUpForm;

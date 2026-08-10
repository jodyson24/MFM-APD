import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PencilIcon,
  EyeIcon,
  ClipboardDocumentCheckIcon,
  MapPinIcon,
  CalendarIcon,
  HomeModernIcon,
} from '@heroicons/react/24/outline';
import Badge from '../ui/Badge.jsx';
import Countdown from './countdown.jsx';
import api from '../../api/client.js';

// Cached once per app session — avoids a request per card.
let nextPresentationPromise = null;
const getNextPresentation = () => {
  if (!nextPresentationPromise) {
    nextPresentationPromise = api
      .get('/presentation-cycles/next')
      .then((res) => res.data?.presentationDate || null)
      .catch(() => null);
  }
  return nextPresentationPromise;
};

const ActivityCard = ({ activity }) => {
  const navigate = useNavigate();
  const org = activity.orgUnitId?.name || '—';
  const type = activity.activityTypeId?.name || activity.activityTypeId?.code || 'Activity';
  const isMegaRegion = activity.orgUnitId?.type === 'mega_region';
  const [nextPresentation, setNextPresentation] = useState(null);

  useEffect(() => {
    if (isMegaRegion) getNextPresentation().then(setNextPresentation);
  }, [isMegaRegion]);

  const needsFollowUp =
    activity.status === 'scheduled' && new Date(activity.scheduledDate) < new Date();

  return (
    <div className="card card-hover p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-ink-900">{activity.title}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
            <span>{type}</span>
            <span className="text-ink-300">·</span>
            <MapPinIcon className="h-3.5 w-3.5" />
            <span className="truncate">{org}</span>
            {isMegaRegion && (
              <HomeModernIcon className="h-3.5 w-3.5 text-amber-500" aria-label="Mega region level" />
            )}
          </p>
        </div>
        <Badge status={activity.status} />
      </div>

      {activity.scheduledDate && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-ink-50/70 px-3 py-2.5 ring-1 ring-ink-100">
          <div className="flex items-center gap-1.5 text-xs font-medium text-ink-600">
            <CalendarIcon className="h-4 w-4 text-brand-600" />
            {new Date(activity.scheduledDate).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
          <div className="scale-90 origin-right">
            <Countdown targetDate={activity.scheduledDate} compact />
          </div>
        </div>
      )}

      {/* Dual countdown (§6.2): Mega Regional activities also show days to presentation */}
      {isMegaRegion && nextPresentation && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-amber-50/70 px-3 py-2 ring-1 ring-amber-100">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            Next Presentation
          </span>
          <div className="scale-90 origin-right">
            <Countdown targetDate={nextPresentation} compact />
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 pt-1">
        <button
          onClick={() => navigate(`/admin/activities/${activity._id}`)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 hover:border-ink-300"
        >
          <EyeIcon className="h-3.5 w-3.5" />
          View
        </button>
        {activity.status === 'scheduled' && (
          <button
            onClick={() => navigate(`/admin/activities/${activity._id}/edit`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 hover:border-ink-300"
          >
            <PencilIcon className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
        {needsFollowUp && (
          <button
            onClick={() => navigate(`/admin/activities/${activity._id}/follow-up`)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600"
          >
            <ClipboardDocumentCheckIcon className="h-3.5 w-3.5" />
            File Follow-Up
          </button>
        )}
      </div>
    </div>
  );
};

export default ActivityCard;

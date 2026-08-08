import { useNavigate } from 'react-router-dom';
import { STATUS_BADGE_COLORS, ACTIVITY_STATUS } from '../../utils/constants';
import Countdown from './countdown';

const ActivityCard = ({ activity }) => {
  const navigate = useNavigate();
  const statusColor = STATUS_BADGE_COLORS[activity.status] || 'bg-gray-100 text-gray-800';
  const org = activity.orgUnitId?.name || '—';
  const type = activity.activityTypeId?.name || activity.activityTypeId?.code || 'Activity';

  const needsFollowUp = activity.status === 'scheduled' && new Date(activity.scheduledDate) < new Date();

  return (
    <div className="bg-white rounded-lg shadow p-4 text-gray-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-base">{activity.title}</h3>
          <p className="text-xs text-gray-500">{type} · {org}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor}`}>
          {ACTIVITY_STATUS[activity.status] || activity.status}
        </span>
      </div>

      {activity.scheduledDate && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {new Date(activity.scheduledDate).toLocaleDateString()}
          </span>
          <div className="scale-90 origin-right">
            <Countdown targetDate={activity.scheduledDate} />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => navigate(`/admin/activities/${activity._id}/edit`)}
          className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
        >
          Edit
        </button>
        {needsFollowUp && (
          <button
            onClick={() => navigate(`/admin/activities/${activity._id}/follow-up`)}
            className="text-xs px-3 py-1 rounded bg-accentBg text-white hover:bg-opacity-80"
          >
            File Follow-Up
          </button>
        )}
      </div>
    </div>
  );
};

export default ActivityCard;

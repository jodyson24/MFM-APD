import React from 'react';
import { ACTIVITY_STATUS } from '../../utils/constants.js';

const TONES = {
  gray: 'bg-ink-100 text-ink-600',
  brand: 'bg-brand-100 text-brand-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-800',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
};

const STATUS_TONE = {
  scheduled: 'blue',
  completed: 'green',
  not_held: 'orange',
  cancelled: 'red',
  postponed: 'purple',
};

const Badge = ({ children, status, tone, className = '' }) => {
  const resolvedTone = tone || (status ? STATUS_TONE[status] : 'gray');
  return (
    <span className={`badge ${TONES[resolvedTone] || TONES.gray} ${className}`}>
      {status ? ACTIVITY_STATUS[status] || status : children}
    </span>
  );
};

export default Badge;

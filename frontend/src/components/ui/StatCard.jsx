import React from 'react';

const ICON_BG = {
  brand: 'bg-brand-100 text-brand-700',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-600',
  amber: 'bg-amber-100 text-amber-700',
  ink: 'bg-ink-100 text-ink-600',
};

const StatCard = ({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'brand',
  className = '',
}) => {
  return (
    <div className={`card p-5 flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 truncate">
          {label}
        </p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-ink-900 leading-none">
          {value}
        </p>
        {hint && <p className="mt-2 text-xs text-ink-500">{hint}</p>}
      </div>
      {Icon && (
        <div
          className={`shrink-0 h-11 w-11 rounded-xl flex items-center justify-center ${ICON_BG[tone]}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      )}
    </div>
  );
};

export default StatCard;

import React, { useState, useEffect } from 'react';
import { differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';

const Countdown = ({ targetDate, compact = false }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const target = new Date(targetDate);
      const days = differenceInDays(target, now);
      const hours = differenceInHours(target, now) % 24;
      const minutes = differenceInMinutes(target, now) % 60;
      setTimeLeft({
        days: Math.max(0, days),
        hours: Math.max(0, hours),
        minutes: Math.max(0, minutes),
      });
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const units = [
    { value: timeLeft.days, label: 'Days' },
    { value: timeLeft.hours, label: 'Hours' },
    { value: timeLeft.minutes, label: 'Min' },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {units.map((u, i) => (
        <React.Fragment key={u.label}>
          <div
            className={`flex flex-col items-center justify-center rounded-lg bg-brand-50 ring-1 ring-brand-100 ${
              compact ? 'h-12 w-14 px-1' : 'h-16 w-20'
            }`}
          >
            <span
              className={`font-bold tabular-nums tracking-tight text-brand-800 ${
                compact ? 'text-xl' : 'text-2xl'
              }`}
            >
              {String(u.value).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-500">
              {u.label}
            </span>
          </div>
          {i < units.length - 1 && (
            <span className="text-lg font-bold text-brand-300">:</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Countdown;

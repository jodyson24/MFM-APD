import React, { useState, useEffect } from 'react';
import { differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';

const Countdown = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const target = new Date(targetDate);
      const days = differenceInDays(target, now);
      const hours = differenceInHours(target, now) % 24;
      const minutes = differenceInMinutes(target, now) % 60;
      setTimeLeft({ days: Math.max(0, days), hours: Math.max(0, hours), minutes: Math.max(0, minutes) });
    }, 60000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="flex space-x-4 text-center">
      <div>
        <div className="text-3xl font-bold">{timeLeft.days}</div>
        <div className="text-xs uppercase">Days</div>
      </div>
      <div>
        <div className="text-3xl font-bold">{timeLeft.hours}</div>
        <div className="text-xs uppercase">Hours</div>
      </div>
      <div>
        <div className="text-3xl font-bold">{timeLeft.minutes}</div>
        <div className="text-xs uppercase">Min</div>
      </div>
    </div>
  );
};

export default Countdown;
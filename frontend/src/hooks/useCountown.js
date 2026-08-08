import { useState, useEffect } from 'react';
import { differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';

export const useCountdown = (targetDate) => {
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

  return timeLeft;
};
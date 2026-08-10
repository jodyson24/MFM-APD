import React from 'react';
import logoUrl from '../../assets/logo.png';

const Logo = ({
  className = 'h-9 w-9',
  showText = true,
  variant = 'light', // 'light' (on dark) | 'dark' (on light)
  textClass = '',
}) => {
  const onDark = variant === 'light';
  return (
    <div className="flex items-center gap-3 select-none">
      <img
        src={logoUrl}
        alt="MFM logo"
        className={`${className} shrink-0 rounded-xl object-contain ring-1 ring-white/10`}
      />
      {showText && (
        <div className="leading-tight">
          <span
            className={`block text-sm font-extrabold tracking-tight ${
              onDark ? 'text-white' : 'text-ink-900'
            } ${textClass}`}
          >
            MFM Dashboard
          </span>
          <span
            className={`block text-[10px] font-semibold uppercase tracking-widest ${
              onDark ? 'text-brand-300' : 'text-ink-400'
            }`}
          >
            Activities &amp; Performance
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
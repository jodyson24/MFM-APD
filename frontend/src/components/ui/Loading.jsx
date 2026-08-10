import React from 'react';

const Loading = ({ label = 'Loading…', full = false }) => {
  const content = (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-500">
      <svg
        className="h-6 w-6 animate-spin text-brand-600"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );

  if (!full) return content;

  return (
    <div className="min-h-[50vh] flex items-center justify-center">{content}</div>
  );
};

export default Loading;

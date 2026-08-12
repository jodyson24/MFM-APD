import React, { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const Modal = ({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  footer,
  size = 'md', // 'sm' | 'md' | 'lg'
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const width = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
  }[size];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative w-full ${width} overflow-hidden rounded-2xl bg-white shadow-elevated animate-in`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 px-6 py-5 text-white">
          <div className="flex min-w-0 items-center gap-3">
            {Icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <Icon className="h-5 w-5 text-amber-300" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold tracking-tight">{title}</h3>
              {subtitle && <p className="truncate text-xs text-brand-200">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-brand-200 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-ink-100 bg-ink-50 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
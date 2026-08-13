import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ToastContext = createContext(null);

const DEFAULT_DURATION = 4500;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const clearTimer = useCallback((id) => {
    if (timers.current.has(id)) {
      clearTimeout(timers.current.get(id));
      timers.current.delete(id);
    }
  }, []);

  const clearProgressTimer = useCallback((id) => {
    if (timers.current.has(id)) {
      clearInterval(timers.current.get(id));
      timers.current.delete(id);
    }
  }, []);

  const removeToast = useCallback(
    (id) => {
      clearTimer(id);
      clearProgressTimer(id);
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    },
    [clearProgressTimer, clearTimer]
  );

  const showToast = useCallback(
    ({ title, message, type = 'info', duration = DEFAULT_DURATION, progress, closable = true }) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [...prev, { id, title, message, type, progress, closable }]);

      if (type !== 'loading' && duration > 0) {
        const timer = setTimeout(() => removeToast(id), duration);
        timers.current.set(id, timer);
      }

      return id;
    },
    [removeToast]
  );

  const updateToast = useCallback((id, updates) => {
    setToasts((prev) => prev.map((toast) => (toast.id === id ? { ...toast, ...updates } : toast)));
  }, []);

  const dismissToast = useCallback((id) => removeToast(id), [removeToast]);

  const loadingToast = useCallback(
    ({ title, message }) => {
      const id = showToast({ title, message, type: 'loading', progress: 0, closable: true, duration: 0 });
      let progress = 0;

      const progressTimer = setInterval(() => {
        progress = Math.min(progress + 18, 94);
        updateToast(id, { progress });
      }, 350);

      timers.current.set(id, progressTimer);

      return {
        id,
        stop: (result = 'success', finalTitle = title, finalMessage = message, duration = DEFAULT_DURATION) => {
          clearProgressTimer(id);
          updateToast(id, {
            type: result,
            title: finalTitle,
            message: finalMessage,
            progress: 100,
            duration,
          });

          if (result !== 'loading') {
            const finalTimer = setTimeout(() => removeToast(id), duration);
            timers.current.set(id, finalTimer);
          }
        },
      };
    },
    [clearProgressTimer, showToast, updateToast, removeToast]
  );

  const value = useMemo(
    () => ({ toasts, showToast, updateToast, dismissToast, loadingToast }),
    [dismissToast, loadingToast, showToast, toasts, updateToast]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider');
  }

  return context;
};

export const ToastViewport = () => {
  const { toasts, dismissToast } = useToast();

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(26rem,calc(100vw-1.5rem))] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto overflow-hidden rounded-xl border bg-white shadow-2xl ring-1 ring-black/5 ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50'
              : toast.type === 'error'
                ? 'border-red-200 bg-red-50'
                : toast.type === 'loading'
                  ? 'border-brand-200 bg-white'
                  : 'border-brand-100 bg-white'
          }`}
        >
          <div className="flex items-start gap-3 p-4">
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 ring-1 ring-inset ring-black/5">
              {toast.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
              ) : toast.type === 'error' ? (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              ) : toast.type === 'loading' ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              ) : (
                <InformationCircleIcon className="h-5 w-5 text-brand-600" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900">{toast.title}</p>
                  <p className="mt-1 text-sm text-ink-600">{toast.message}</p>
                </div>

                {toast.closable && (
                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    className="rounded-md p-1 text-ink-400 transition hover:bg-black/5 hover:text-ink-700"
                    aria-label="Close notification"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              {(toast.type === 'loading' || toast.progress !== undefined) && (
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-ink-500">
                    <span>{toast.type === 'loading' ? 'In progress' : 'Status'}</span>
                    <span>{Math.min(100, Math.max(0, toast.progress ?? 0))}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        toast.type === 'error'
                          ? 'bg-red-500'
                          : toast.type === 'success'
                            ? 'bg-emerald-500'
                            : 'bg-brand-600'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, toast.progress ?? 0))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

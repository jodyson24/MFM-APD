import React, { useState, useEffect, useCallback } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [swSupported, setSwSupported] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => setSwSupported(true));
    }

    // Listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShow(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem('pwaInstallDismissed', 'true');
  }, []);

  // Don't show if already installed, dismissed, or no prompt
  if (isInstalled || !deferredPrompt || !swSupported) return null;
  if (localStorage.getItem('pwaInstallDismissed') === 'true') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2" role="dialog" aria-label="Install app">
      <div className="card p-4 shadow-xl max-w-sm border-brand-200 ring-1 ring-brand-100">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-lg bg-brand-100 p-2">
            <svg className="h-6 w-6 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink-900">Install MFM-APD</p>
            <p className="mt-1 text-xs text-ink-500">
              Add to home screen for offline access and faster loading.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 text-ink-400 hover:text-ink-600"
            aria-label="Dismiss"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleInstall}
            className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-600 transition hover:bg-ink-50"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default PWAInstallPrompt;
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth, useSocket } from '../../context/index.js';
import {
  Bars3Icon,
  CalendarDaysIcon,
  GlobeAltIcon,
  ArrowRightOnRectangleIcon,
  WifiIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const TITLES = {
  '/admin/activities': 'Activities',
  '/admin/compliance': 'Compliance',
  '/admin/analytics': 'Analytics',
  '/admin/users': 'Users',
  '/admin/security': 'Security Log',
  '/admin': 'Dashboard',
};

const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { connected: socketConnected } = useSocket();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineBanner(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const title = Object.entries(TITLES).find(([path]) =>
    pathname.startsWith(path)
  )?.[1];

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  const isFullyConnected = isOnline && socketConnected;

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/85 backdrop-blur">
      {/* Offline banner */}
      {showOfflineBanner && (
        <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-center text-xs text-amber-800">
          <div className="flex items-center justify-center gap-1.5">
            <XMarkIcon className="h-4 w-4" />
            <span>You're offline. Some features may be limited. Data will sync when reconnected.</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden rounded-lg border border-ink-200 p-2 text-ink-600 hover:bg-ink-50 transition"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">{title || 'Overview'}</p>
            <p className="hidden sm:block truncate text-xs text-ink-500">
              {user?.name || 'User'} · {today}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Network status indicator */}
          <span
            className="hidden lg:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition"
            title={isFullyConnected ? 'Online - Live updates connected' : 'Offline or limited connectivity'}
          >
            <span
              className={`h-2 w-2 rounded-full ${isFullyConnected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`}
            />
            <span className={isFullyConnected ? 'text-green-700' : 'text-red-500'}>
              {isFullyConnected ? 'Online' : 'Offline'}
            </span>
          </span>

          <span className="hidden xl:inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">
            <CalendarDaysIcon className="h-4 w-4" />
            Bi-annual reporting
          </span>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-2 text-xs font-semibold text-ink-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 sm:px-3"
            title="View public dashboard"
          >
            <GlobeAltIcon className="h-4 w-4" />
            <span className="hidden md:inline">Public Site</span>
          </Link>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 sm:px-3"
            title="Sign out"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            <span className="hidden md:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

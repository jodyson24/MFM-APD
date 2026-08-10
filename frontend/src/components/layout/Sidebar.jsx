import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/index.js';
import {
  HomeIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChartBarIcon,
  UsersIcon,
  BuildingOffice2Icon,
  ShieldCheckIcon,
  GlobeAltIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import Logo from '../ui/Logo.jsx';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: HomeIcon, end: true },
  { to: '/admin/activities', label: 'Activities', icon: CalendarDaysIcon, end: false },
  { to: '/admin/compliance', label: 'Compliance', icon: CheckCircleIcon, end: false },
  { to: '/admin/analytics', label: 'Analytics', icon: ChartBarIcon, end: false },
  { to: '/admin/weekly-metrics', label: 'Weekly Metrics', icon: ArrowTrendingUpIcon, end: false },
];

const SidebarContent = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.isSuperAdmin || user?.role === 'mega_region_admin';
  const navItems = [...NAV_ITEMS];

  if (isAdmin) {
    navItems.push({ to: '/admin/users', label: 'Users', icon: UsersIcon, end: false });
    navItems.push({ to: '/admin/org-units', label: 'Org Units', icon: BuildingOffice2Icon, end: false });
    navItems.push({ to: '/admin/presentation-dates', label: 'Presentation Dates', icon: CalendarIcon, end: false });
  }
  if (user?.isSuperAdmin) {
    navItems.push({ to: '/admin/security', label: 'Security Log', icon: ShieldCheckIcon, end: false });
  }

  const initials = (user?.name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-brand-950 via-brand-900 to-brand-950 text-white">
      {/* Brand */}
      <div className="flex items-center justify-between px-5 pt-6 pb-5">
        <Logo />
        <button
          onClick={onNavigate}
          className="lg:hidden rounded-lg p-1.5 text-brand-300 hover:bg-white/10 hover:text-white transition"
          aria-label="Close menu"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-brand-400">
          Menu
        </p>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-white/10 text-white ring-1 ring-white/10'
                  : 'text-brand-200 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`absolute left-0 h-5 w-1 rounded-r-full transition ${
                    isActive ? 'bg-amber-400' : 'bg-transparent'
                  }`}
                />
                <Icon
                  className={`h-5 w-5 shrink-0 transition ${
                    isActive ? 'text-amber-400' : 'text-brand-300 group-hover:text-brand-100'
                  }`}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User / logout */}
      <div className="space-y-2 border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white ring-2 ring-white/20">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.name || 'User'}</p>
            <p className="truncate text-[11px] capitalize text-brand-300">
              {(user?.role || '').replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-brand-200 transition hover:bg-white/5 hover:text-white"
        >
          <GlobeAltIcon className="h-5 w-5 shrink-0 text-brand-300" />
          <span>View Public Dashboard</span>
        </Link>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-red-600 hover:ring-red-500"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5 shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
};

const Sidebar = ({ open, onClose }) => {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-ink-200">
        <div className="sticky top-0 h-screen">
          <SidebarContent onNavigate={onClose} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 h-full w-72 shadow-elevated">
            <SidebarContent onNavigate={onClose} />
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;

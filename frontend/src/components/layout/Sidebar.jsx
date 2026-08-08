import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context';
import {
  HomeIcon,
  CalendarIcon,
  CheckCircleIcon,
  ChartBarIcon,
  UsersIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'; // you can install @heroicons/react

const Sidebar = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'mega_region_admin';

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: HomeIcon },
    { to: '/admin/activities', label: 'Activities', icon: CalendarIcon },
    { to: '/admin/compliance', label: 'Compliance', icon: CheckCircleIcon },
    { to: '/admin/analytics', label: 'Analytics', icon: ChartBarIcon },
  ];

  if (isAdmin) {
    navItems.push({ to: '/admin/users', label: 'Users', icon: UsersIcon });
  }
  if (user?.isSuperAdmin) {
    navItems.push({ to: '/admin/security', label: 'Security Log', icon: ShieldCheckIcon });
  }

  return (
    <aside className="w-64 bg-primaryBg text-textColor flex-shrink-0">
      <div className="p-4 border-b border-opacity-20 border-white">
        <img src="/logo-placeholder.png" alt="Logo" className="h-12 mx-auto" />
      </div>
      <nav className="p-4 space-y-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center space-x-3 p-3 rounded-lg transition ${
                isActive ? 'bg-accentBg text-white' : 'hover:bg-white hover:bg-opacity-10'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
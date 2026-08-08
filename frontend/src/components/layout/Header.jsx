import React from 'react';
import { useAuth } from '../../context';

const Header = () => {
  const { user, logout } = useAuth();
  return (
    <header className="bg-secondaryBg shadow-md px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <img src="/logo-placeholder.png" alt="Logo" className="h-10 w-auto" />
        <span className="text-xl font-bold">MFM Dashboard</span>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-sm">{user?.name}</span>
        <button
          onClick={logout}
          className="px-4 py-2 bg-accentBg hover:bg-opacity-80 rounded-md text-white transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
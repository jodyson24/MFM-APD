import React from 'react';
import { Link } from 'react-router-dom';
import { GlobeAltIcon } from '@heroicons/react/24/outline';

const Footer = () => {
  return (
    <footer className="border-t border-ink-100 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <p className="text-center text-xs text-ink-400">
          &copy; {new Date().getFullYear()} MFM Activities &amp; Performance Dashboard &middot; Private &amp; Confidential
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 transition hover:text-brand-700"
        >
          <GlobeAltIcon className="h-3.5 w-3.5" />
          View Public Dashboard
        </Link>
      </div>
    </footer>
  );
};

export default Footer;

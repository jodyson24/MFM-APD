import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-secondaryBg px-6 py-3 text-center text-xs text-white opacity-80">
      &copy; {new Date().getFullYear()} MFM Activities &amp; Performance Dashboard. Private &amp; Confidential.
    </footer>
  );
};

export default Footer;

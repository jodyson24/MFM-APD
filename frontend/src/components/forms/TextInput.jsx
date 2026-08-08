import React from 'react';

const TextInput = ({ label, type = 'text', error, className = '', ...props }) => {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input
        type={type}
        className={`w-full rounded-md border shadow-sm focus:ring-primaryBg focus:border-primaryBg px-3 py-2 ${
          error ? 'border-red-400' : 'border-gray-300'
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-red-500 text-sm">{error}</p>}
    </div>
  );
};

export default TextInput;

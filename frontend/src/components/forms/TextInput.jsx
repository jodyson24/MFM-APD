import React from 'react';

const TextInput = ({ label, type = 'text', error, className = '', ...props }) => {
  return (
    <div className={className}>
      {label && <label className="field-label">{label}</label>}
      <input
        type={type}
        className={`input ${error ? 'input-error' : ''}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
};

export default TextInput;

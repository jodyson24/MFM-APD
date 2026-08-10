import React from 'react';

const SelectInput = ({ label, error, className = '', children, ...props }) => {
  return (
    <div className={className}>
      {label && <label className="field-label">{label}</label>}
      <select className={`input ${error ? 'input-error' : ''}`} {...props}>
        {children}
      </select>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
};

export default SelectInput;

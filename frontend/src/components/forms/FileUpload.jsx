import React, { useState, useRef } from 'react';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';

const FileUpload = ({ label, multiple = false, accept = 'image/*', onChange, value = [], error, maxFiles = 5, maxSizeMB = 10 }) => {
  const [previews, setPreviews] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    let files = Array.from(e.target.files);
    if (!multiple && files.length > 1) files = files.slice(0, 1);
    if (files.length + value.length > maxFiles) {
      alert(`You can upload up to ${maxFiles} files.`);
      return;
    }
    // Validate file size
    const oversized = files.some(f => f.size > maxSizeMB * 1024 * 1024);
    if (oversized) {
      alert(`Each file must be under ${maxSizeMB} MB.`);
      return;
    }
    // Generate previews
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...newPreviews]);
    // Pass files to parent
    onChange([...value, ...files]);
    // Reset input
    e.target.value = '';
  };

  const removeFile = (index) => {
    const newFiles = value.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);
    onChange(newFiles);
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primaryBg transition"
        onClick={() => fileInputRef.current.click()}
      >
        <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">Click to upload or drag and drop</p>
        <p className="text-xs text-gray-500">PNG, JPG, WEBP up to {maxSizeMB}MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {previews.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mt-2">
          {previews.map((src, idx) => (
            <div key={idx} className="relative group">
              <img src={src} alt={`preview-${idx}`} className="h-20 w-20 object-cover rounded border" />
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
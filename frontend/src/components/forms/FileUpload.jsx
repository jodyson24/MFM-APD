import React, { useState, useRef } from 'react';
import { XMarkIcon, CloudArrowUpIcon, PhotoIcon, FilmIcon } from '@heroicons/react/24/outline';

const FileUpload = ({
  label,
  multiple = false,
  accept = 'image/*',
  onChange,
  value = [],
  error,
  maxFiles = 5,
  maxSizeMB = 10,
}) => {
  const [previews, setPreviews] = useState([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    let files = Array.from(e.target.files);
    if (!multiple && files.length > 1) files = files.slice(0, 1);
    if (files.length + value.length > maxFiles) {
      alert(`You can upload up to ${maxFiles} files.`);
      return;
    }
    const oversized = files.some((f) => f.size > maxSizeMB * 1024 * 1024);
    if (oversized) {
      alert(`Each file must be under ${maxSizeMB} MB.`);
      return;
    }
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
    onChange([...value, ...files]);
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
      {label && <label className="field-label">{label}</label>}
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFileChange({ target: { files: e.dataTransfer.files, value: '' } });
        }}
        className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition ${
          dragging
            ? 'border-brand-500 bg-brand-50'
            : 'border-ink-200 hover:border-brand-400 hover:bg-brand-50/40'
        }`}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
          <CloudArrowUpIcon className="h-6 w-6" />
        </div>
        <p className="mt-3 text-sm font-semibold text-ink-700">
          Click to upload or drag &amp; drop
        </p>
        <p className="mt-1 text-xs text-ink-500">
          PNG, JPG, WEBP, MP4 up to {maxSizeMB} MB · max {maxFiles} files
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {previews.map((src, idx) => {
            const file = value[idx];
            const isVideo = file?.type?.startsWith('video/');
            return (
              <div key={idx} className="group relative overflow-hidden rounded-lg ring-1 ring-ink-100">
                {isVideo ? (
                  <div className="flex h-20 items-center justify-center bg-ink-950">
                    <FilmIcon className="h-7 w-7 text-ink-400" />
                  </div>
                ) : (
                  <img src={src} alt={`preview-${idx}`} className="h-20 w-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 to-transparent opacity-0 transition group-hover:opacity-100" />
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  aria-label="Remove file"
                  className="absolute right-1.5 top-1.5 rounded-full bg-ink-950/70 p-1 text-white shadow transition hover:bg-red-600"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1 px-1.5 py-1 opacity-0 transition group-hover:opacity-100">
                  <PhotoIcon className="h-3 w-3 text-white" />
                  <span className="truncate text-[10px] font-medium text-white">
                    {file?.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FileUpload;

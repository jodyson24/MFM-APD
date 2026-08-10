import React, { useState, useRef } from 'react';
import {
  XMarkIcon,
  CloudArrowUpIcon,
  PhotoIcon,
  PaperClipIcon,
} from '@heroicons/react/24/outline';

/**
 * Media picker that supports:
 *  - already-persisted items ({ url, mediaType, caption })
 *  - freshly selected files ({ file, mediaType, caption }) — uploaded on submit by the parent
 */
const MediaUploader = ({
  label,
  items = [],
  onChange,
  error,
  maxFiles = 5,
  maxSizeMB = 10,
  hint,
}) => {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = (fileList) => {
    const files = Array.from(fileList);
    if (!files.length) return;
    if (items.length + files.length > maxFiles) {
      alert(`You can upload up to ${maxFiles} files.`);
      return;
    }
    const oversized = files.some((f) => f.size > maxSizeMB * 1024 * 1024);
    if (oversized) {
      alert(`Each file must be under ${maxSizeMB} MB.`);
      return;
    }
    const newItems = files.map((f) => ({
      file: f,
      mediaType: f.type?.startsWith('video/') ? 'video' : 'image',
      caption: f.name,
    }));
    onChange([...items, ...newItems]);
  };

  const removeItem = (index) => {
    const removed = items[index];
    if (removed?.file && removed.__preview) {
      URL.revokeObjectURL(removed.__preview);
    }
    onChange(items.filter((_, i) => i !== index));
  };

  const renderThumb = (item, index) => {
    const isVideo = item.mediaType === 'video';
    const src = item.file
      ? URL.createObjectURL(item.file)
      : item.url;
    const isPending = Boolean(item.file);

    return (
      <div key={`${item.url || item.caption}-${index}`} className="group relative overflow-hidden rounded-lg ring-1 ring-ink-100">
        {isVideo ? (
          <video src={src} className="h-24 w-full object-cover" muted />
        ) : (
          <img src={src} alt={item.caption || `evidence-${index}`} className="h-24 w-full object-cover" />
        )}
        {isPending && (
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            <CloudArrowUpIcon className="h-3 w-3" />
            Pending
          </span>
        )}
        <button
          type="button"
          onClick={() => removeItem(index)}
          aria-label="Remove file"
          className="absolute right-1.5 top-1.5 rounded-full bg-ink-950/70 p-1 text-white shadow transition hover:bg-red-600"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
        </button>
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1 px-1.5 py-1 bg-gradient-to-t from-ink-950/70 to-transparent">
          <PhotoIcon className="h-3 w-3 text-white" />
          <span className="truncate text-[10px] font-medium text-white">
            {item.caption || (isVideo ? 'Video' : 'Image')}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {label && <label className="field-label">{label}</label>}

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {items.map((item, i) => renderThumb(item, i))}
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition ${
          dragging
            ? 'border-brand-500 bg-brand-50'
            : 'border-ink-200 hover:border-brand-400 hover:bg-brand-50/40'
        }`}
      >
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
          <PaperClipIcon className="h-5 w-5" />
        </div>
        <p className="mt-2.5 text-sm font-semibold text-ink-700">
          Click to upload or drag &amp; drop
        </p>
        <p className="mt-1 text-xs text-ink-500">
          Images &amp; videos · up to {maxSizeMB} MB each · max {maxFiles} files
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-400">{hint}</p>}
    </div>
  );
};

export default MediaUploader;

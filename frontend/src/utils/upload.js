import api from '../api/client.js';

/**
 * Upload file(s) to the backend and return persisted media items.
 * @param {File[]} files
 * @returns {Promise<Array<{url:string, mediaType:string, caption:string}>>}
 */
export const uploadFiles = async (files) => {
  if (!files.length) return [];
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  const res = await api.post('/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return (res.data && res.data.items) || [];
};

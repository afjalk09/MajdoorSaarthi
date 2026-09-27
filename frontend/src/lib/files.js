import api from '@/services/api';

// Verification documents (PAN / Aadhaar) are sensitive, so they are streamed
// through an auth-gated API route instead of the static /uploads mount.
// The axios instance in services/api already prefixes the backend origin in
// production, so document paths stay relative here.

export const documentFilePath = (documentId) => `/api/employer/documents/${documentId}/file`;

/**
 * Fetches a document as a blob (the API requires an Authorization header, so a
 * plain <a href> would 401) and hands back an object URL.
 * Caller must revokeObjectURL when finished.
 */
export const fetchDocumentObjectUrl = async (documentId) => {
  const response = await api.get(documentFilePath(documentId), { responseType: 'blob' });
  return URL.createObjectURL(response.data);
};

const guessExtension = (doc) => {
  if (doc?.mimeType === 'application/pdf') return 'pdf';
  if (doc?.mimeType === 'image/png') return 'png';
  if (doc?.mimeType === 'image/webp') return 'webp';
  return 'jpg';
};

export const openDocument = async (doc) => {
  const objectUrl = await fetchDocumentObjectUrl(doc.id);
  window.open(objectUrl, '_blank', 'noopener');
  // Give the new tab time to read the blob before releasing it
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
};

export const downloadDocument = async (doc) => {
  const objectUrl = await fetchDocumentObjectUrl(doc.id);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = doc.fileName || `document.${guessExtension(doc)}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};

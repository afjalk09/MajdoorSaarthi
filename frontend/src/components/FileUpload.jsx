import { useRef, useState } from 'react';
import { Upload, FileText, X, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ACCEPTED_UPLOAD_TYPES,
  DOC_STATUS_LABELS,
  formatFileSize,
  MAX_UPLOAD_BYTES
} from '@/lib/docTypes';
import { openDocument } from '@/lib/files';
import { showError } from '@/lib/toast';

const ACCEPT_ATTR = ACCEPTED_UPLOAD_TYPES.join(',');

const STATUS_VARIANTS = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive'
};

const validateFile = (file) => {
  const name = (file.name || '').toLowerCase();
  const hasValidExtension = ACCEPTED_UPLOAD_TYPES.some((ext) => name.endsWith(ext));
  if (!hasValidExtension) {
    return 'Only PDF, JPG, PNG or WEBP files are allowed';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'File is too large. Maximum size is 5 MB';
  }
  return null;
};

/**
 * Single-document picker used for verification uploads.
 *
 * @param file       currently selected File (not yet uploaded)
 * @param onSelect   called with the chosen File, or null when cleared
 * @param existing   the Document row already on file, if any (for status + view/replace)
 * @param error      validation message for this field
 */
const FileUpload = ({
  id,
  label,
  description,
  required = false,
  file,
  onSelect,
  existing,
  error
}) => {
  const inputRef = useRef(null);
  const [viewing, setViewing] = useState(false);

  const handleChange = (event) => {
    const picked = event.target.files?.[0] || null;
    // allow re-picking the same file after a clear
    event.target.value = '';

    if (!picked) {
      onSelect?.(null);
      return;
    }

    const problem = validateFile(picked);
    if (problem) {
      showError(problem);
      onSelect?.(null);
      return;
    }

    onSelect?.(picked);
  };

  const handleView = async () => {
    if (!existing) return;
    setViewing(true);
    try {
      await openDocument(existing);
    } catch (err) {
      showError(
        err.response?.data?.message ||
          (err.response?.status === 401 ? 'Session expired, please log in again' : 'Could not open the file')
      );
    } finally {
      setViewing(false);
    }
  };

  const onFile = Boolean(file);
  const hasExisting = Boolean(existing);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium leading-none">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
        {hasExisting && (
          <Badge variant={STATUS_VARIANTS[existing.status] || 'secondary'}>
            {DOC_STATUS_LABELS[existing.status] || existing.status}
          </Badge>
        )}
      </div>

      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      {onFile ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2.5">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)} • ready to upload</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSelect?.(null)}
            aria-label={`Remove ${file.name}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input px-3 py-4 transition-colors hover:border-primary hover:bg-accent/40"
        >
          <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {hasExisting ? 'Replace document' : 'Choose a file'}
            </p>
            <p className="text-xs text-muted-foreground">
              {hasExisting ? existing.fileName || 'Document on file' : 'PDF, JPG, PNG or WEBP • max 5 MB'}
            </p>
          </div>
          <span className="sr-only">Upload {label}</span>
        </label>
      )}

      <input
        id={id}
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        onChange={handleChange}
        className="sr-only"
      />

      {hasExisting && !onFile && (
        <Button type="button" variant="outline" size="sm" onClick={handleView} disabled={viewing}>
          {viewing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="mr-2 h-3.5 w-3.5" />}
          View uploaded document
        </Button>
      )}

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
};

export default FileUpload;

import { useState } from 'react';
import { initialsOf } from '@/lib/format';
import { getWorkerImage } from '@/lib/roleImages';

/**
 * A worker's picture — the worker analogue of JobImage.
 *
 * Falls back to initials when there is no `profilePhoto` AND the derived role
 * image fails to load, so a broken URL never leaves a blank hole in a card.
 * THIS is the single place worker images are drawn; reuse it anywhere a worker
 * image is needed rather than re-deriving `getWorkerImage`.
 */
const WorkerImage = ({ worker, className = '', alt }) => {
  const [error, setError] = useState(false);
  const img = getWorkerImage(worker);

  if (!img || error) {
    return (
      <div
        className={`bg-gradient-to-br from-saffron-100 to-earth-100 flex items-center justify-center ${className}`}
      >
        <span className="font-display font-bold text-saffron-600">
          {initialsOf(worker?.fullName, 'W')}
        </span>
      </div>
    );
  }

  return (
    <img
      src={img}
      alt={alt || worker?.fullName || ''}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
};

export default WorkerImage;

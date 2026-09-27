import { useState } from 'react';
import { getJobImage } from '@/lib/roleImages';
import { Wrench } from 'lucide-react';

const JobImage = ({ job, className = '', alt }) => {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`bg-gradient-to-br from-saffron-100 to-earth-100 flex items-center justify-center ${className}`}>
        <Wrench className="text-saffron-400/60" />
      </div>
    );
  }

  return (
    <img
      src={getJobImage(job)}
      alt={alt || job?.title || ''}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
};

export default JobImage;
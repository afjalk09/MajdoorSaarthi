import JobImage from '@/components/JobImage';
import { Wrench } from 'lucide-react';

const JobBanner = ({ job, className = '', aspect = 'aspect-[21/9]' }) => {
  const primaryRole = job?.jobRoles?.find(r => r.roleName)?.roleName;

  return (
    <div className={`relative ${aspect} overflow-hidden bg-gradient-to-br from-saffron-100 to-earth-100 ${className}`}>
      <JobImage job={job} alt={job?.title} className="w-full h-full absolute inset-0 object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      {primaryRole && (
        <span className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex items-end justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-white font-display font-semibold text-sm truncate">
            <Wrench size={14} className="text-gold-300" />
            {primaryRole}
          </span>
        </span>
      )}
    </div>
  );
};

export default JobBanner;
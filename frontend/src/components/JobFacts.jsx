import { MapPin, IndianRupee, Calendar, Users, Clock } from 'lucide-react';
import Fact from '@/components/Fact';
import { formatJobSchedule, formatWage, timeAgo } from '@/lib/format';

/**
 * The plain-language facts of a job: where, what it pays, how long, how many
 * workers, when, and how fresh the posting is. Every field is optional, so the
 * same component serves the full tracking page and the compact details dialog.
 */
const JobFacts = ({ job, columns = 'grid-cols-2', showPosted = false }) => {
  const schedule = formatJobSchedule(job);
  const wage = formatWage(job);

  return (
    <div className={`grid ${columns} gap-4 text-sm`}>
      {job.locationText && (
        <Fact icon={MapPin}>{job.locationText}</Fact>
      )}

      {wage && (
        <Fact icon={IndianRupee}>{wage}</Fact>
      )}

      {job.durationDays && (
        <Fact icon={Calendar}>{job.durationDays} {job.durationDays === 1 ? 'day' : 'days'}</Fact>
      )}

      <Fact icon={Users}>{job.workersNeeded} workers needed</Fact>

      {schedule && (
        <Fact icon={Clock} className="col-span-2">{schedule}</Fact>
      )}

      {showPosted && job.createdAt && (
        <Fact icon={Calendar} className="col-span-2">Posted {timeAgo(job.createdAt)}</Fact>
      )}
    </div>
  );
};

export default JobFacts;

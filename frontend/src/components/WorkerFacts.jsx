import { MapPin, IndianRupee, Calendar, CalendarCheck, Activity } from 'lucide-react';
import Fact from '@/components/Fact';
import { formatExpectedWage, formatReliability, timeAgo } from '@/lib/format';
import { availabilityLabel } from '@/lib/worker';

/**
 * The plain-language facts of a worker: where they are, what they expect to
 * earn, how long they have been doing this, their availability and reputation.
 * Every field is optional so the same grid serves a browse card and the full
 * details dialog.
 */
const WorkerFacts = ({ worker, columns = 'grid-cols-2' }) => {
  const wage = formatExpectedWage(worker);
  const reliability = formatReliability(worker?.reliabilityScore);

  return (
    <div className={`grid ${columns} gap-4 text-sm`}>
      {worker?.locationText && (
        <Fact icon={MapPin}>{worker.locationText}</Fact>
      )}

      {wage && (
        <Fact icon={IndianRupee}>Expected {wage}</Fact>
      )}

      <Fact icon={Calendar}>
        {worker?.experienceYears || 0} {worker?.experienceYears === 1 ? 'year' : 'years'} experience
      </Fact>

      <Fact icon={Activity}>{availabilityLabel(worker?.availability)}</Fact>

      {reliability && (
        <Fact icon={CalendarCheck}>Reliability {reliability}</Fact>
      )}

      {worker?.createdAt && (
        <Fact icon={Calendar} className="col-span-2">On the platform since {timeAgo(worker.createdAt)}</Fact>
      )}
    </div>
  );
};

export default WorkerFacts;

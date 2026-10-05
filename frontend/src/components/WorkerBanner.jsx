import { Wrench, Star } from 'lucide-react';
import WorkerImage from '@/components/WorkerImage';
import { formatReliability } from '@/lib/format';

/**
 * A worker's picture with their trade overlaid — the worker analogue of
 * JobBanner, and the single source for the worker imagery that this codebase
 * previously rendered twice (a `w-14` thumb in the employer dashboard and an
 * `aspect-[4/3]` banner on the browse page).
 *
 * `size` picks the preset:
 *   - `sm` a square thumbnail for dense lists and modals
 *   - `lg` a wide card banner (default) for browse grids and the details dialog
 *
 * `aspect` only applies to `lg` and defaults to `aspect-[4/3]`, mirroring
 * JobBanner. It is a separate prop rather than being folded into `className`
 * so that a caller passing only a shape class (`rounded-xl`) can never
 * accidentally drop the height and collapse the absolutely-positioned image.
 */
const WorkerBanner = ({
  worker,
  size = 'lg',
  showReliability = true,
  aspect = 'aspect-[4/3]',
  className = ''
}) => {
  const primaryRole = (worker?.roles || [])[0];
  const reliability = formatReliability(worker?.reliabilityScore);
  const isThumb = size === 'sm';

  return (
    <div
      className={
        isThumb
          ? `relative shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-saffron-100 to-earth-100 border border-warm-200 ${className || 'w-14 h-14'}`
          : `relative ${aspect} overflow-hidden bg-gradient-to-br from-saffron-100 to-earth-100 ${className}`
      }
    >
      <WorkerImage
        worker={worker}
        className={isThumb ? 'w-full h-full object-cover' : 'w-full h-full absolute inset-0 object-cover'}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      {showReliability && reliability && !isThumb && (
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm text-gold-300 text-xs font-semibold">
            <Star size={12} className="fill-gold-400 text-gold-400" />
            {reliability}
          </span>
        </div>
      )}

      {primaryRole && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 px-2.5 pt-3 pb-1.5">
          <Wrench size={isThumb ? 9 : 14} className="text-gold-300 shrink-0" />
          <span className={`text-white font-medium truncate ${isThumb ? 'text-[9px]' : 'text-xs'}`}>
            {primaryRole}
          </span>
        </div>
      )}
    </div>
  );
};

export default WorkerBanner;

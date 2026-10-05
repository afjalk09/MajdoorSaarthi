/**
 * One icon + value pair — the atom every facts grid is built from.
 *
 * Extracted from JobFacts so the job and worker fact grids are guaranteed to
 * line up visually and share the same icon/typography treatment.
 */
const Fact = ({ icon: Icon, children, className = '' }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
    <span className="min-w-0">{children}</span>
  </div>
);

export default Fact;

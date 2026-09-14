import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

// Searchable role picker: type to filter the taxonomy (starts-with first),
// click an entry to select. Falls back to free text if no valid match.
const RoleSelect = ({ value, onChange, roles = [], placeholder = 'Select a role', disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Close the list when clicking outside
  useEffect(() => {
    const onMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const q = query.trim().toLowerCase();
  const startsWith = q
    ? roles.filter(r => r.name.toLowerCase().startsWith(q))
    : roles;
  const contains = q
    ? roles.filter(r => !r.name.toLowerCase().startsWith(q) && r.name.toLowerCase().includes(q))
    : [];

  return (
    <div className="relative" ref={containerRef}>
      <Input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); onChange(e.target.value); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const exact = roles.find(r => r.name.toLowerCase() === query.trim().toLowerCase());
            if (exact) onChange(exact.name);
            setOpen(false);
            e.preventDefault();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full"
      />
      {open && roles.length > 0 && (
        <>
          {!q && <p className="text-xs text-muted-foreground px-3 pt-2">Type to search roles...</p>}
          <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-md border bg-background shadow-lg">
            {q && (
              <div className="border-b px-3 py-1.5 bg-muted/50">
                <span className="text-xs text-muted-foreground">
                  {startsWith.length + contains.length} match{startsWith.length + contains.length === 1 ? '' : 'es'}
                </span>
              </div>
            )}
            {startsWith.map(r => (
              <button
                key={r.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange(r.name); setOpen(false); }}
                className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
              >
                {r.name}
                {r.skills && r.skills.length > 0 && (
                  <span className="text-xs text-muted-foreground truncate max-w-[55%] ml-2">
                    {r.skills.slice(0, 3).join(', ')}
                  </span>
                )}
              </button>
            ))}
            {contains.map(r => (
              <button
                key={r.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange(r.name); setOpen(false); }}
                className="flex w-full items-center justify-between px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground text-left"
              >
                {r.name}
                {r.skills && r.skills.length > 0 && (
                  <span className="text-xs truncate max-w-[55%] ml-2">{r.skills.slice(0, 3).join(', ')}</span>
                )}
              </button>
            ))}
            {q && startsWith.length + contains.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No role found. You can type any role name manually.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RoleSelect;
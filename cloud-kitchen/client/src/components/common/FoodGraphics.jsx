/**
 * Decorative food illustrations, drawn inline as SVG.
 *
 * Inline rather than image files so they inherit the brand colour, scale
 * cleanly, cost no network request, and never appear broken on a cold start.
 * All are purely decorative, so they carry aria-hidden and no accessible name.
 */

const base = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export function BurgerIcon({ size = 48, className = '', style }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} style={style} {...base}>
      <path d="M10 26c0-9 10-15 22-15s22 6 22 15" stroke="currentColor" strokeWidth="3" />
      <path d="M12 34h40M10 41h44" stroke="currentColor" strokeWidth="3" />
      <path d="M10 48c0 4 4 7 10 7h24c6 0 10-3 10-7" stroke="currentColor" strokeWidth="3" />
      <circle cx="24" cy="20" r="1.6" fill="currentColor" />
      <circle cx="34" cy="17" r="1.6" fill="currentColor" />
      <circle cx="42" cy="21" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function PizzaIcon({ size = 48, className = '', style }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} style={style} {...base}>
      <path d="M32 8 54 52a2 2 0 0 1-2 3H12a2 2 0 0 1-2-3L32 8z" stroke="currentColor" strokeWidth="3" />
      <path d="M18 44h28" stroke="currentColor" strokeWidth="2" opacity=".5" />
      <circle cx="32" cy="28" r="2.5" fill="currentColor" />
      <circle cx="25" cy="40" r="2.5" fill="currentColor" />
      <circle cx="39" cy="40" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function CoffeeIcon({ size = 48, className = '', style }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} style={style} {...base}>
      <path d="M12 24h34v16c0 7-6 12-13 12h-8c-7 0-13-5-13-12V24z" stroke="currentColor" strokeWidth="3" />
      <path d="M46 28h5a6 6 0 0 1 0 12h-5" stroke="currentColor" strokeWidth="3" />
      <path d="M22 8c0 4-3 4-3 8M31 6c0 5-3 5-3 10M40 8c0 4-3 4-3 8" stroke="currentColor" strokeWidth="2.5" opacity=".6" />
    </svg>
  );
}

export function ChefHatIcon({ size = 48, className = '', style }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} style={style} {...base}>
      <path d="M18 34a11 11 0 1 1 3-21 13 13 0 0 1 22 0 11 11 0 1 1 3 21v4H18v-4z" stroke="currentColor" strokeWidth="3" />
      <path d="M18 44h28v6a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4v-6z" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

export function CutleryIcon({ size = 48, className = '', style }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} style={style} {...base}>
      <path d="M20 8v18a6 6 0 0 1-12 0V8M14 8v48" stroke="currentColor" strokeWidth="3" />
      <path d="M44 8c6 0 10 6 10 14s-4 12-10 12v22" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

export function LeafIcon({ size = 48, className = '', style }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} style={style} {...base}>
      <path d="M52 12C30 12 14 22 14 40c0 5 2 9 5 12 4-16 16-26 30-30-12 6-21 16-25 30 20 2 32-14 32-30 0-4 0-8-4-10z" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

/**
 * A faint scatter of food shapes for section backgrounds.
 * Sits behind content and ignores pointer events.
 */
export function FoodPattern({ className = '' }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <PizzaIcon size={120} className="absolute -left-6 top-6 opacity-[.07] rotate-12" />
      <BurgerIcon size={140} className="absolute right-4 -top-4 opacity-[.07] -rotate-12" />
      <CoffeeIcon size={100} className="absolute left-1/3 bottom-0 opacity-[.06] rotate-6" />
      <LeafIcon size={110} className="absolute right-1/4 bottom-2 opacity-[.06] -rotate-6" />
    </div>
  );
}

export function NoodlesIcon({ size = 48, className = '', style }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} style={style} {...base}>
      <path d="M12 30h40c0 12-9 21-20 21s-20-9-20-21z" stroke="currentColor" strokeWidth="3" />
      <path d="M8 55h48" stroke="currentColor" strokeWidth="3" />
      <path d="M24 30V14M32 30V9M40 30v-16" stroke="currentColor" strokeWidth="2.5" opacity=".6" />
      <path d="M44 16c4-3 8-1 8 3" stroke="currentColor" strokeWidth="2.5" opacity=".6" />
    </svg>
  );
}

export function CupcakeIcon({ size = 48, className = '', style }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} style={style} {...base}>
      <path d="M16 30h32l-4 22a4 4 0 0 1-4 3H24a4 4 0 0 1-4-3l-4-22z" stroke="currentColor" strokeWidth="3" />
      <path d="M18 30a8 8 0 0 1 3-13 11 11 0 0 1 22 0 8 8 0 0 1 3 13" stroke="currentColor" strokeWidth="3" />
      <circle cx="32" cy="8" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function ChiliIcon({ size = 48, className = '', style }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} style={style} {...base}>
      <path d="M38 16c10 2 16 11 14 22-2 12-13 19-24 16C18 51 12 43 14 34c2-8 9-12 16-11" stroke="currentColor" strokeWidth="3" />
      <path d="M38 16c0-5 3-8 8-8M38 16c-4 0-7-2-8-5" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

export function DrinkIcon({ size = 48, className = '', style }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} style={style} {...base}>
      <path d="M18 18h28l-4 34a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4L18 18z" stroke="currentColor" strokeWidth="3" />
      <path d="M16 18h32" stroke="currentColor" strokeWidth="3" />
      <path d="M40 18 46 6" stroke="currentColor" strokeWidth="2.5" opacity=".6" />
      <path d="M21 32h22" stroke="currentColor" strokeWidth="2" opacity=".4" />
    </svg>
  );
}

export function BowlIcon({ size = 48, className = '', style }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} style={style} {...base}>
      <path d="M8 28h48c0 14-11 24-24 24S8 42 8 28z" stroke="currentColor" strokeWidth="3" />
      <path d="M22 20c0-4 4-4 4-8M32 18c0-5 4-5 4-10M42 20c0-4 4-4 4-8" stroke="currentColor" strokeWidth="2.5" opacity=".55" />
    </svg>
  );
}

export function SparkleIcon({ size = 24, className = '', style }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden="true">
      <path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7L12 2z" fill="currentColor" />
    </svg>
  );
}

/** A thin band of food icons, for breaking up long pages. */
export function FoodDivider({ className = '' }) {
  const icons = [BurgerIcon, PizzaIcon, NoodlesIcon, DrinkIcon, CupcakeIcon, CoffeeIcon];
  return (
    <div className={`flex items-center justify-center gap-6 sm:gap-10 ${className}`} aria-hidden="true">
      <span className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-brand-200" />
      {icons.map((Icon, i) => (
        <Icon key={i} size={28} className="text-brand-300 animate-float" style={{ animationDelay: `${i * 300}ms` }} />
      ))}
      <span className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-brand-200" />
    </div>
  );
}

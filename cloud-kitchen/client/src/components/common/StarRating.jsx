import { useState } from 'react';
import { FiStar } from 'react-icons/fi';

const SIZES = { sm: 14, md: 18, lg: 26 };

/**
 * Star rating display, or an input when `onChange` is given.
 * Read-only mode renders half-filled stars for fractional averages.
 */
export default function StarRating({ value = 0, onChange, size = 'md', showValue = false, count = null }) {
  const [hover, setHover] = useState(0);
  const px = SIZES[size] || SIZES.md;
  const interactive = typeof onChange === 'function';
  const shown = interactive && hover ? hover : value;

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(star => {
          // Fraction of this star that should be coloured (0 to 1).
          const fill = Math.max(0, Math.min(1, shown - star + 1));

          const starIcon = (
            <span className="relative inline-block" style={{ width: px, height: px }}>
              <FiStar size={px} className="absolute inset-0 text-gray-300" />
              {fill > 0 && (
                <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                  <FiStar size={px} className="text-amber-400 fill-amber-400" />
                </span>
              )}
            </span>
          );

          return interactive ? (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="p-0.5 transition-transform hover:scale-110"
              aria-label={`Rate ${star} out of 5`}
            >
              {starIcon}
            </button>
          ) : (
            <span key={star} className="p-0.5">{starIcon}</span>
          );
        })}
      </div>

      {showValue && value > 0 && (
        <span className="text-sm font-semibold text-gray-700 ml-1">{Number(value).toFixed(1)}</span>
      )}
      {count !== null && (
        <span className="text-xs text-gray-500 ml-1">({count})</span>
      )}
    </div>
  );
}

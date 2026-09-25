import { FiMinus, FiPlus } from 'react-icons/fi';

/**
 * Quantity controls for an item's paid extras - cheese, sauces and so on.
 *
 * `addOns` is the list the admin defined; `quantities` maps add-on id to how
 * many are chosen. Renders nothing when an item offers no enabled extras, so a
 * single call site works for every menu item.
 */
export default function AddOnStepper({ addOns = [], quantities = {}, onChange, size = 'md' }) {
  const available = addOns.filter(a => a.enabled !== false);
  if (available.length === 0) return null;

  const compact = size === 'sm';

  return (
    <div className="space-y-1.5">
      {available.map((addOn) => {
        const id = addOn.addOnId || addOn._id;
        const value = quantities[id] || 0;
        const max = addOn.maxQuantity || 0;
        const set = (next) => onChange(id, Math.min(Math.max(0, next), max));

        return (
          <div
            key={id}
            className={`flex items-center justify-between gap-3 rounded-lg border border-dashed
              transition-colors duration-200 ${
                value > 0 ? 'border-brand-300 bg-brand-50' : 'border-gray-200 bg-gray-50/60'
              } ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}`}
          >
            <div className="min-w-0">
              <p className={`font-medium text-gray-800 truncate ${compact ? 'text-xs' : 'text-sm'}`}>
                {addOn.label}
              </p>
              <p className={`text-gray-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                +₹{addOn.price} each
                {value > 0 && (
                  <span className="text-brand-600 font-semibold">
                    {' '}· ₹{(addOn.price * value).toFixed(2)}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => set(value - 1)}
                disabled={value <= 0}
                aria-label={`Remove one ${addOn.label}`}
                className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-white border border-gray-300
                  flex items-center justify-center transition-all duration-150 active:scale-90
                  hover:border-brand-400 disabled:opacity-40 disabled:cursor-not-allowed
                  disabled:active:scale-100`}
              >
                <FiMinus size={compact ? 12 : 14} />
              </button>

              <span
                className={`font-bold text-center tabular-nums ${compact ? 'w-4 text-xs' : 'w-6 text-sm'}`}
                aria-live="polite"
              >
                {value}
              </span>

              <button
                type="button"
                onClick={() => set(value + 1)}
                disabled={value >= max}
                aria-label={`Add one ${addOn.label}`}
                title={value >= max ? `Maximum ${max}` : undefined}
                className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-white border border-gray-300
                  flex items-center justify-center transition-all duration-150 active:scale-90
                  hover:border-brand-400 disabled:opacity-40 disabled:cursor-not-allowed
                  disabled:active:scale-100`}
              >
                <FiPlus size={compact ? 12 : 14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

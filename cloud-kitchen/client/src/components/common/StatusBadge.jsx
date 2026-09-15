const statusColors = {
  PLACED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-indigo-100 text-indigo-700',
  PREPARING: 'bg-yellow-100 text-yellow-700',
  READY_FOR_PICKUP: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const statusLabels = {
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready for Pickup',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

// Statuses where the kitchen is actively working: the dot pulses so a glance at
// the page tells you the order is moving. Finished states stay still.
const IN_PROGRESS = ['PLACED', 'CONFIRMED', 'PREPARING'];

const dotColors = {
  PLACED: 'bg-blue-500',
  CONFIRMED: 'bg-indigo-500',
  PREPARING: 'bg-yellow-500',
  READY_FOR_PICKUP: 'bg-green-500',
  COMPLETED: 'bg-gray-400',
  CANCELLED: 'bg-red-500',
};

export default function StatusBadge({ status }) {
  const active = IN_PROGRESS.includes(status);
  const ready = status === 'READY_FOR_PICKUP';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors duration-300 ${
        statusColors[status] || 'bg-gray-100 text-gray-700'
      }`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {active && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
              dotColors[status] || 'bg-gray-400'
            }`}
          />
        )}
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotColors[status] || 'bg-gray-400'}`}
        />
      </span>
      {statusLabels[status] || status}
      {/* Ready is the one the customer is waiting for, so it gets a nudge. */}
      {ready && <span className="animate-pop">🎉</span>}
    </span>
  );
}

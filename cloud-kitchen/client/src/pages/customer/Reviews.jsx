import { FiMapPin, FiPhone, FiClock } from 'react-icons/fi';
import ReviewSection from '../../components/common/ReviewSection';
import {
  useSettings, formatAddress, mapsLink, formatTime, DAY_ORDER, DAY_LABELS,
} from '../../context/SettingsContext';

/** Public page for restaurant-wide ratings and reviews. */
export default function Reviews() {
  const { settings } = useSettings();
  const { location = {}, contact = {}, openingHours = [], openState } = settings;

  const address = formatAddress(location);
  const maps = mapsLink(location);
  const hoursByDay = new Map(openingHours.map(h => [h.day, h]));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <h1 className="text-3xl font-bold mb-1">Reviews</h1>
        <p className="text-gray-600 mb-6">
          Tell us how your experience at {settings.restaurantName} was.
        </p>
        <div className="card p-6">
          <ReviewSection />
        </div>
      </div>

      {/* Restaurant info sidebar */}
      <aside className="space-y-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <img src="/logo.png" alt="" className="w-12 h-12 rounded-lg object-cover" />
            <div>
              <p className="font-bold">{settings.restaurantName}</p>
              <span className={`text-xs font-semibold ${openState?.isOpen ? 'text-green-600' : 'text-red-500'}`}>
                {openState?.isOpen ? 'Open now' : 'Closed'}
              </span>
            </div>
          </div>

          {address && (
            <div className="flex gap-2.5 text-sm mb-3">
              <FiMapPin className="text-brand-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-gray-700">{address}</p>
                {maps && (
                  <a href={maps} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline text-xs">
                    Get directions →
                  </a>
                )}
              </div>
            </div>
          )}

          {contact.phone && (
            <div className="flex gap-2.5 text-sm items-center">
              <FiPhone className="text-brand-500 flex-shrink-0" size={16} />
              <a href={`tel:${contact.phone}`} className="text-gray-700 hover:text-brand-600">{contact.phone}</a>
            </div>
          )}
        </div>

        {openingHours.length > 0 && (
          <div className="card p-5">
            <h2 className="font-bold mb-3 flex items-center gap-2 text-sm">
              <FiClock size={15} className="text-brand-500" /> Opening Hours
            </h2>
            <ul className="space-y-1.5 text-sm">
              {DAY_ORDER.map(day => {
                const entry = hoursByDay.get(day);
                if (!entry) return null;
                const isToday = day === openState?.todayHours?.day;
                return (
                  <li key={day} className={`flex justify-between gap-3 ${isToday ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                    <span>{DAY_LABELS[day]}</span>
                    <span className={entry.isClosed ? 'text-red-500' : ''}>
                      {entry.isClosed ? 'Closed' : `${formatTime(entry.openTime)} – ${formatTime(entry.closeTime)}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

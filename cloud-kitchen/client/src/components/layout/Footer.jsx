import { Link } from 'react-router-dom';
import { FiMapPin, FiPhone, FiMail, FiClock, FiExternalLink } from 'react-icons/fi';
import {
  useSettings, formatAddress, mapsLink, formatTime, DAY_ORDER, DAY_LABELS,
} from '../../context/SettingsContext';

export default function Footer() {
  const { settings } = useSettings();
  const { location = {}, contact = {}, openingHours = [], openState } = settings;

  const address = formatAddress(location);
  const maps = mapsLink(location);
  const hoursByDay = new Map(openingHours.map(h => [h.day, h]));
  const todayKey = openState?.todayHours?.day;

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12 grid gap-10 md:grid-cols-3">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <img src="/logo.png" alt="" className="w-11 h-11 rounded-lg object-cover" />
            <div>
              <p className="font-bold text-white text-lg leading-tight">{settings.restaurantName}</p>
              <p className="text-xs text-gray-400">{settings.tagline}</p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
              openState?.isOpen ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${openState?.isOpen ? 'bg-green-400' : 'bg-red-400'}`} />
            {openState?.isOpen ? 'Open now' : 'Closed'}
          </span>
          <nav className="mt-5 flex flex-col gap-1.5 text-sm">
            <Link to="/menu" className="hover:text-white w-fit">Menu</Link>
            <Link to="/orders" className="hover:text-white w-fit">My Orders</Link>
            <Link to="/reviews" className="hover:text-white w-fit">Reviews</Link>
          </nav>
        </div>

        {/* Contact */}
        <div>
          <h3 className="font-semibold text-white mb-3">Visit &amp; Contact</h3>
          <ul className="space-y-3 text-sm">
            {address && (
              <li className="flex gap-2.5">
                <FiMapPin className="mt-0.5 flex-shrink-0 text-brand-400" size={16} />
                <div>
                  <p>{address}</p>
                  {maps && (
                    <a
                      href={maps}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand-400 hover:text-brand-300 mt-1"
                    >
                      Get directions <FiExternalLink size={12} />
                    </a>
                  )}
                </div>
              </li>
            )}
            {contact.phone && (
              <li className="flex gap-2.5 items-center">
                <FiPhone className="flex-shrink-0 text-brand-400" size={16} />
                <a href={`tel:${contact.phone}`} className="hover:text-white">{contact.phone}</a>
                {contact.alternatePhone && (
                  <a href={`tel:${contact.alternatePhone}`} className="hover:text-white">/ {contact.alternatePhone}</a>
                )}
              </li>
            )}
            {contact.email && (
              <li className="flex gap-2.5 items-center">
                <FiMail className="flex-shrink-0 text-brand-400" size={16} />
                <a href={`mailto:${contact.email}`} className="hover:text-white break-all">{contact.email}</a>
              </li>
            )}
            {!address && !contact.phone && !contact.email && (
              <li className="text-gray-500">Contact details coming soon.</li>
            )}
          </ul>
        </div>

        {/* Hours */}
        <div>
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <FiClock size={16} className="text-brand-400" /> Opening Hours
          </h3>
          {openingHours.length === 0 ? (
            <p className="text-sm text-gray-500">Hours not set yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {DAY_ORDER.map(day => {
                const entry = hoursByDay.get(day);
                if (!entry) return null;
                const isToday = day === todayKey;
                return (
                  <li
                    key={day}
                    className={`flex justify-between gap-4 ${isToday ? 'text-white font-semibold' : ''}`}
                  >
                    <span>{DAY_LABELS[day]}{isToday && <span className="text-brand-400 font-normal"> · today</span>}</span>
                    <span className={entry.isClosed ? 'text-red-400' : ''}>
                      {entry.isClosed ? 'Closed' : `${formatTime(entry.openTime)} – ${formatTime(entry.closeTime)}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} {settings.restaurantName}. All rights reserved.
      </div>
    </footer>
  );
}

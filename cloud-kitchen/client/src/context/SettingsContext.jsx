import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { getSocket } from '../services/socket';

const SettingsContext = createContext(null);

export const useSettings = () => useContext(SettingsContext);

/** Used until the API responds, and if the API is unreachable. */
const FALLBACK = {
  restaurantName: 'CloudKitchen',
  tagline: 'Fresh Food, Fast Pickup',
  location: {},
  contact: {},
  openingHours: [],
  timezone: 'Asia/Kolkata',
  temporarilyClosed: false,
  openState: { isOpen: true, reason: '', todayHours: null, nextOpen: null },
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.getSettings();
      setSettings({ ...FALLBACK, ...data });
      return data;
    } catch (err) {
      console.warn('Could not load restaurant settings:', err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Re-evaluate the open/closed state on a timer so the badge flips without a reload.
  useEffect(() => {
    const id = setInterval(refresh, 60 * 1000);
    return () => clearInterval(id);
  }, [refresh]);

  // Apply admin edits instantly to every open tab.
  useEffect(() => {
    let socket;
    let cancelled = false;

    const onUpdate = (data) => setSettings({ ...FALLBACK, ...data });

    getSocket().then(s => {
      if (cancelled) return;
      socket = s;
      socket.on('settingsUpdated', onUpdate);
    }).catch(() => {});

    return () => {
      cancelled = true;
      socket?.off('settingsUpdated', onUpdate);
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh, isOpen: settings.openState?.isOpen !== false }}>
      {children}
    </SettingsContext.Provider>
  );
}

/** "12 MG Road, Pune, Maharashtra 411001" from the settings location block. */
export const formatAddress = (location = {}) => {
  const { addressLine1, addressLine2, city, state, postalCode, country } = location;
  return [addressLine1, addressLine2, city, state, postalCode, country].filter(Boolean).join(', ');
};

/** A Google Maps link: the admin's own URL if set, otherwise a search for the address. */
export const mapsLink = (location = {}) => {
  if (location.mapsUrl) return location.mapsUrl;
  const address = formatAddress(location);
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
};

export const DAY_LABELS = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
};

export const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/** "9:00 AM" from "09:00". */
export const formatTime = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
};

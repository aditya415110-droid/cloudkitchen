/**
 * Opening-hours evaluation for the restaurant settings.
 *
 * Hours are stored as "HH:mm" strings per weekday and are interpreted in the
 * restaurant's own timezone, not the server's. A closeTime that is less than or
 * equal to its openTime is treated as running past midnight into the next day.
 */

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Current weekday index and minutes-since-midnight in the given IANA timezone. */
const nowInZone = (timezone, now = new Date()) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);

    const get = (type) => parts.find(p => p.type === type)?.value;
    const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    // Intl can emit "24" for midnight in some environments.
    const hour = parseInt(get('hour'), 10) % 24;
    const minute = parseInt(get('minute'), 10);

    if (weekdayIndex < 0 || Number.isNaN(hour) || Number.isNaN(minute)) throw new Error('unparsable');
    return { dayIndex: weekdayIndex, minutes: hour * 60 + minute };
  } catch {
    // Unknown timezone: fall back to server-local time rather than failing the request.
    return { dayIndex: now.getDay(), minutes: now.getHours() * 60 + now.getMinutes() };
  }
};

const findDay = (openingHours, dayIndex) =>
  (openingHours || []).find(h => h.day === DAYS[dayIndex]) || null;

/**
 * Evaluate whether the restaurant is currently accepting orders.
 * Returns { isOpen, reason, todayHours, nextOpen }.
 */
export const getOpenState = (settings, now = new Date()) => {
  const hours = (settings?.openingHours || []).map(h => (h.toObject ? h.toObject() : h));
  const { dayIndex, minutes } = nowInZone(settings?.timezone, now);
  const today = findDay(hours, dayIndex);

  if (settings?.temporarilyClosed) {
    return {
      isOpen: false,
      reason: settings.closedMessage || 'We are temporarily closed. Please check back soon.',
      todayHours: today,
      nextOpen: findNextOpening(hours, dayIndex, minutes),
    };
  }

  // A shift that started yesterday and runs past midnight still counts as open.
  const yesterday = findDay(hours, (dayIndex + 6) % 7);
  if (yesterday && !yesterday.isClosed) {
    const open = toMinutes(yesterday.openTime);
    const close = toMinutes(yesterday.closeTime);
    if (close <= open && minutes < close) {
      return { isOpen: true, reason: '', todayHours: today, nextOpen: null };
    }
  }

  if (!today || today.isClosed) {
    return {
      isOpen: false,
      reason: 'We are closed today.',
      todayHours: today,
      nextOpen: findNextOpening(hours, dayIndex, minutes),
    };
  }

  const open = toMinutes(today.openTime);
  const close = toMinutes(today.closeTime);
  const isOpen = close <= open
    ? minutes >= open          // overnight shift, still within today's portion
    : minutes >= open && minutes < close;

  return {
    isOpen,
    reason: isOpen ? '' : (minutes < open
      ? `We open at ${today.openTime} today.`
      : `We closed at ${today.closeTime} today.`),
    todayHours: today,
    nextOpen: isOpen ? null : findNextOpening(hours, dayIndex, minutes),
  };
};

/** The next `{ day, openTime }` the restaurant opens, searching up to a week ahead. */
const findNextOpening = (hours, dayIndex, minutes) => {
  for (let offset = 0; offset < 8; offset++) {
    const day = findDay(hours, (dayIndex + offset) % 7);
    if (!day || day.isClosed) continue;
    const open = toMinutes(day.openTime);
    if (offset === 0 && minutes >= open) continue; // already past today's opening
    return { day: day.day, openTime: day.openTime, daysAhead: offset };
  }
  return null;
};

export { DAYS };

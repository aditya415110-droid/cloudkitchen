import { getOpenState, DAYS } from '../src/utils/openingHours.js';

/** Build a settings-like object with every day sharing the same hours. */
const withHours = (overrides = {}, dayOverrides = {}) => ({
  timezone: 'UTC',
  temporarilyClosed: false,
  closedMessage: '',
  openingHours: DAYS.map(day => ({
    day,
    isClosed: false,
    openTime: '09:00',
    closeTime: '22:00',
    ...(dayOverrides[day] || {}),
  })),
  ...overrides,
});

// A fixed instant makes the weekday deterministic: 2026-09-16 is a Wednesday.
const at = (hhmm) => new Date(`2026-09-16T${hhmm}:00Z`);

describe('Opening hours', () => {
  test('open during the configured window', () => {
    expect(getOpenState(withHours(), at('12:00')).isOpen).toBe(true);
  });

  test('closed before opening time', () => {
    const state = getOpenState(withHours(), at('08:59'));
    expect(state.isOpen).toBe(false);
    expect(state.reason).toContain('09:00');
  });

  test('closed at and after closing time', () => {
    expect(getOpenState(withHours(), at('22:00')).isOpen).toBe(false);
    expect(getOpenState(withHours(), at('23:30')).isOpen).toBe(false);
  });

  test('a day marked closed is closed all day', () => {
    const settings = withHours({}, { wednesday: { isClosed: true } });
    expect(getOpenState(settings, at('12:00')).isOpen).toBe(false);
  });

  test('temporarilyClosed overrides the schedule and surfaces the message', () => {
    const settings = withHours({ temporarilyClosed: true, closedMessage: 'Back on Monday' });
    const state = getOpenState(settings, at('12:00'));
    expect(state.isOpen).toBe(false);
    expect(state.reason).toBe('Back on Monday');
  });

  test('an overnight shift stays open past midnight', () => {
    // Open 18:00 until 02:00 the following day.
    const settings = withHours({}, Object.fromEntries(
      DAYS.map(day => [day, { openTime: '18:00', closeTime: '02:00' }])
    ));

    expect(getOpenState(settings, at('20:00')).isOpen).toBe(true);  // within the evening
    expect(getOpenState(settings, at('01:00')).isOpen).toBe(true);  // carried over from Tuesday
    expect(getOpenState(settings, at('03:00')).isOpen).toBe(false); // after the shift ended
  });

  test('an overnight shift does not carry over from a closed previous day', () => {
    const settings = withHours({}, {
      tuesday: { isClosed: true },
      wednesday: { openTime: '18:00', closeTime: '02:00' },
    });
    // 01:00 Wednesday would only be open if Tuesday's shift ran over, and it did not.
    expect(getOpenState(settings, at('01:00')).isOpen).toBe(false);
  });

  test('nextOpen points at the next trading day when closed', () => {
    const settings = withHours({}, { wednesday: { isClosed: true } });
    const state = getOpenState(settings, at('12:00'));
    expect(state.nextOpen).toMatchObject({ day: 'thursday', openTime: '09:00', daysAhead: 1 });
  });

  test('nextOpen points at later today when asked before opening', () => {
    const state = getOpenState(withHours(), at('07:00'));
    expect(state.nextOpen).toMatchObject({ day: 'wednesday', daysAhead: 0 });
  });

  test('an unknown timezone falls back instead of throwing', () => {
    const settings = withHours({ timezone: 'Not/AZone' });
    expect(() => getOpenState(settings, at('12:00'))).not.toThrow();
  });

  test('timezone is honoured, not the server clock', () => {
    // 23:00 UTC is 04:30 next day in Kolkata, which is outside 09:00-22:00.
    const settings = withHours({ timezone: 'Asia/Kolkata' });
    expect(getOpenState(settings, at('23:00')).isOpen).toBe(false);

    // 06:00 UTC is 11:30 in Kolkata, comfortably inside the window.
    expect(getOpenState(settings, at('06:00')).isOpen).toBe(true);
  });
});

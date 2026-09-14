import Settings from '../models/Settings.js';
import { getOpenState, DAYS } from '../utils/openingHours.js';
import { emailService, verifyEmailConnection, isEmailConfigured } from '../services/emailService.js';
import config from '../config/index.js';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Keep only the day entries we recognise, and validate their time strings. */
const sanitizeHours = (input) => {
  if (!Array.isArray(input)) return null;
  const byDay = new Map();

  for (const entry of input) {
    if (!entry || !DAYS.includes(entry.day)) continue;
    const isClosed = Boolean(entry.isClosed);
    const openTime = TIME_RE.test(entry.openTime) ? entry.openTime : '09:00';
    const closeTime = TIME_RE.test(entry.closeTime) ? entry.closeTime : '22:00';
    byDay.set(entry.day, { day: entry.day, isClosed, openTime, closeTime });
  }

  if (byDay.size === 0) return null;
  // Always store all seven days so the client never has to guess.
  return DAYS.map(day => byDay.get(day) || { day, isClosed: false, openTime: '09:00', closeTime: '22:00' });
};

export const settingsController = {
  // Public: restaurant info plus the computed open/closed state
  async get(req, res) {
    const settings = await Settings.getSettings();
    res.json({
      success: true,
      data: { ...settings.toObject(), openState: getOpenState(settings) },
    });
  },

  // Admin: update restaurant info
  async update(req, res) {
    try {
      const settings = await Settings.getSettings();
      const {
        restaurantName, tagline, location, contact,
        openingHours, timezone, temporarilyClosed, closedMessage,
      } = req.body;

      if (restaurantName !== undefined) settings.restaurantName = restaurantName;
      if (tagline !== undefined) settings.tagline = tagline;
      if (timezone !== undefined && timezone) settings.timezone = timezone;
      if (temporarilyClosed !== undefined) settings.temporarilyClosed = Boolean(temporarilyClosed);
      if (closedMessage !== undefined) settings.closedMessage = closedMessage;

      // Merge nested objects field by field so a partial update never wipes siblings.
      if (location && typeof location === 'object') {
        for (const key of Object.keys(settings.location.toObject())) {
          if (location[key] !== undefined) settings.location[key] = location[key];
        }
      }
      if (contact && typeof contact === 'object') {
        for (const key of Object.keys(settings.contact.toObject())) {
          if (contact[key] !== undefined) settings.contact[key] = contact[key];
        }
      }

      const hours = sanitizeHours(openingHours);
      if (hours) settings.openingHours = hours;

      await settings.save();

      // Push the new info to every connected client so banners update live.
      const io = req.app.get('io');
      const payload = { ...settings.toObject(), openState: getOpenState(settings) };
      if (io) io.emit('settingsUpdated', payload);

      res.json({ success: true, data: payload });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to update settings.' });
    }
  },

  // Admin: is outbound email actually working from this host?
  async emailStatus(req, res) {
    const result = await verifyEmailConnection();
    res.json({
      success: true,
      data: {
        ...result,
        configured: isEmailConfigured(),
        // Never echo the password back, only whether it is present.
        settings: {
          host: config.email.host || null,
          port: config.email.port,
          secure: config.email.secure,
          user: config.email.user || null,
          from: config.email.from,
          passwordSet: Boolean(config.email.password),
          adminEmails: config.email.adminEmails,
        },
      },
    });
  },

  // Admin: send a real test email to confirm delivery end to end.
  async sendTestEmail(req, res) {
    const to = (req.body?.to || req.user.email || '').trim();
    if (!to) return res.status(400).json({ success: false, message: 'No recipient address available.' });

    const result = await emailService.sendTestEmail(to);

    // Always 200: the diagnostic succeeded in telling us what happened, even
    // when the send itself failed. The payload carries the real outcome.
    res.json({
      success: true,
      data: { ...result, to, sentAt: new Date().toISOString() },
    });
  },
};

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FiSave, FiMapPin, FiPhone, FiClock, FiCopy } from 'react-icons/fi';
import { api } from '../../services/api';
import { useSettings, DAY_ORDER, DAY_LABELS } from '../../context/SettingsContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmailDiagnostics from '../../components/admin/EmailDiagnostics';

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London',
  'America/New_York', 'America/Los_Angeles', 'Australia/Sydney', 'UTC',
];

const blankDay = (day) => ({ day, isClosed: false, openTime: '09:00', closeTime: '22:00' });

export default function SettingsManagement() {
  const { refresh } = useSettings();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSettings()
      .then(({ data }) => {
        const byDay = new Map((data.openingHours || []).map(h => [h.day, h]));
        setForm({
          restaurantName: data.restaurantName || '',
          tagline: data.tagline || '',
          timezone: data.timezone || 'Asia/Kolkata',
          temporarilyClosed: Boolean(data.temporarilyClosed),
          closedMessage: data.closedMessage || '',
          location: {
            addressLine1: '', addressLine2: '', city: '', state: '',
            postalCode: '', country: 'India', mapsUrl: '',
            ...data.location,
          },
          contact: {
            phone: '', alternatePhone: '', whatsapp: '', email: '',
            ...data.contact,
          },
          // Always edit all seven days in a fixed order.
          openingHours: DAY_ORDER.map(day => ({ ...blankDay(day), ...(byDay.get(day) || {}) })),
        });
      })
      .catch(err => toast.error(err.message || 'Could not load settings'));
  }, []);

  if (!form) return <LoadingSpinner />;

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const setNested = (group, key, value) =>
    setForm(f => ({ ...f, [group]: { ...f[group], [key]: value } }));
  const setDay = (day, patch) =>
    setForm(f => ({
      ...f,
      openingHours: f.openingHours.map(h => h.day === day ? { ...h, ...patch } : h),
    }));

  /** Copy one day's times onto every other day. */
  const copyToAllDays = (day) => {
    const source = form.openingHours.find(h => h.day === day);
    if (!source) return;
    setForm(f => ({
      ...f,
      openingHours: f.openingHours.map(h => ({
        ...h,
        isClosed: source.isClosed,
        openTime: source.openTime,
        closeTime: source.closeTime,
      })),
    }));
    toast.success(`Applied the hours from ${DAY_LABELS[day]} to every day`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // A day that is open must have a time at both ends of its shift.
    const invalid = form.openingHours.find(h => !h.isClosed && (!h.openTime || !h.closeTime));
    if (invalid) {
      toast.error(`Set both opening and closing times for ${DAY_LABELS[invalid.day]}.`);
      return;
    }

    setSaving(true);
    try {
      await api.updateSettings(form);
      await refresh();
      toast.success('Restaurant settings saved');
    } catch (err) {
      toast.error(err.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 pb-10">
      <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Restaurant Settings</h1>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          <FiSave size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Identity */}
      <section className="card p-6 space-y-4">
        <h2 className="font-bold">Identity</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Restaurant name</label>
          <input
            className="input"
            maxLength={100}
            value={form.restaurantName}
            onChange={e => setField('restaurantName', e.target.value)}
            placeholder="CloudKitchen"
          />
          <p className="text-xs text-gray-500 mt-1">Shown in the navbar, footer, emails and the sign-in popup.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tagline</label>
          <input
            className="input"
            maxLength={200}
            value={form.tagline}
            onChange={e => setField('tagline', e.target.value)}
            placeholder="Fresh Food, Fast Pickup"
          />
        </div>
      </section>

      {/* Location */}
      <section className="card p-6 space-y-4">
        <h2 className="font-bold flex items-center gap-2">
          <FiMapPin size={16} className="text-brand-500" /> Location
        </h2>
        <div>
          <label className="block text-sm font-medium mb-1">Address line 1</label>
          <input
            className="input"
            maxLength={200}
            value={form.location.addressLine1}
            onChange={e => setNested('location', 'addressLine1', e.target.value)}
            placeholder="Shop 4, Sunrise Plaza"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Address line 2</label>
          <input
            className="input"
            maxLength={200}
            value={form.location.addressLine2}
            onChange={e => setNested('location', 'addressLine2', e.target.value)}
            placeholder="MG Road"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <input
              className="input"
              maxLength={100}
              value={form.location.city}
              onChange={e => setNested('location', 'city', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">State</label>
            <input
              className="input"
              maxLength={100}
              value={form.location.state}
              onChange={e => setNested('location', 'state', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Postal code</label>
            <input
              className="input"
              maxLength={20}
              value={form.location.postalCode}
              onChange={e => setNested('location', 'postalCode', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Country</label>
            <input
              className="input"
              maxLength={100}
              value={form.location.country}
              onChange={e => setNested('location', 'country', e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Google Maps link (optional)</label>
          <input
            className="input"
            type="url"
            maxLength={500}
            value={form.location.mapsUrl}
            onChange={e => setNested('location', 'mapsUrl', e.target.value)}
            placeholder="https://maps.app.goo.gl/..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave blank and we will link a Maps search for the address above.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="card p-6 space-y-4">
        <h2 className="font-bold flex items-center gap-2">
          <FiPhone size={16} className="text-brand-500" /> Contact
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Phone number</label>
            <input
              className="input"
              type="tel"
              maxLength={30}
              value={form.contact.phone}
              onChange={e => setNested('contact', 'phone', e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Alternate phone</label>
            <input
              className="input"
              type="tel"
              maxLength={30}
              value={form.contact.alternatePhone}
              onChange={e => setNested('contact', 'alternatePhone', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">WhatsApp</label>
            <input
              className="input"
              type="tel"
              maxLength={30}
              value={form.contact.whatsapp}
              onChange={e => setNested('contact', 'whatsapp', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Public email</label>
            <input
              className="input"
              type="email"
              maxLength={120}
              value={form.contact.email}
              onChange={e => setNested('contact', 'email', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Hours */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-bold flex items-center gap-2">
            <FiClock size={16} className="text-brand-500" /> Opening Hours
          </h2>
          <select
            className="input w-auto text-sm"
            value={form.timezone}
            onChange={e => setField('timezone', e.target.value)}
          >
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
        <p className="text-xs text-gray-500">
          Orders are blocked outside these hours. A closing time earlier than the opening time
          means the shift runs past midnight.
        </p>

        <div className="space-y-2">
          {form.openingHours.map(entry => (
            <div key={entry.day} className="flex flex-wrap items-center gap-3 py-2 border-b last:border-b-0">
              <span className="w-24 text-sm font-medium">{DAY_LABELS[entry.day]}</span>

              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={!entry.isClosed}
                  onChange={e => setDay(entry.day, { isClosed: !e.target.checked })}
                  className="rounded"
                />
                Open
              </label>

              <input
                type="time"
                className="input w-32"
                disabled={entry.isClosed}
                value={entry.openTime}
                onChange={e => setDay(entry.day, { openTime: e.target.value })}
              />
              <span className="text-gray-400">to</span>
              <input
                type="time"
                className="input w-32"
                disabled={entry.isClosed}
                value={entry.closeTime}
                onChange={e => setDay(entry.day, { closeTime: e.target.value })}
              />

              <button
                type="button"
                onClick={() => copyToAllDays(entry.day)}
                className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 ml-auto"
                title="Apply these hours to every day"
              >
                <FiCopy size={12} /> Apply to all
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Temporary closure */}
      <section className="card p-6 space-y-4">
        <h2 className="font-bold">Temporary Closure</h2>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.temporarilyClosed}
            onChange={e => setField('temporarilyClosed', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium">Close the kitchen now, regardless of opening hours</span>
        </label>
        <div>
          <label className="block text-sm font-medium mb-1">Message shown to customers</label>
          <input
            className="input"
            maxLength={300}
            value={form.closedMessage}
            onChange={e => setField('closedMessage', e.target.value)}
            placeholder="Closed for a private event, back tomorrow!"
          />
        </div>
      </section>

      <button type="submit" disabled={saving} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
        <FiSave size={16} /> {saving ? 'Saving...' : 'Save Changes'}
      </button>
      </form>

      {/* Kept outside the settings form: these act immediately and have nothing
          to save, and a nested input would submit the form on Enter. */}
      <EmailDiagnostics />
    </div>
  );
}

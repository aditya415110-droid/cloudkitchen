import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiTag, FiX } from 'react-icons/fi';
import { api } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const emptyForm = {
  code: '',
  description: '',
  discountType: 'PERCENT',
  discountValue: '',
  maxDiscount: '',
  minOrderAmount: '',
  startsAt: '',
  expiresAt: '',
  usageLimit: '',
  perUserLimit: '1',
  isActive: true,
  showOnHome: true,
};

/** Format a Date for a `datetime-local` input, in the browser's own timezone. */
const toLocalInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const describe = (c) => {
  const base = c.discountType === 'PERCENT' ? `${c.discountValue}% off` : `₹${c.discountValue} off`;
  const cap = c.discountType === 'PERCENT' && c.maxDiscount > 0 ? ` (max ₹${c.maxDiscount})` : '';
  return base + cap;
};

export default function CouponManagement() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = form closed
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.getAdminCoupons();
      setCoupons(data || []);
    } catch (err) {
      toast.error(err.message || 'Could not load coupons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditing('new');
  };

  const openEdit = (coupon) => {
    setForm({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : '',
      minOrderAmount: coupon.minOrderAmount ? String(coupon.minOrderAmount) : '',
      startsAt: toLocalInput(coupon.startsAt),
      expiresAt: toLocalInput(coupon.expiresAt),
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
      perUserLimit: String(coupon.perUserLimit ?? 1),
      isActive: coupon.isActive,
      showOnHome: coupon.showOnHome,
    });
    setEditing(coupon);
  };

  const closeForm = () => { setEditing(null); setForm(emptyForm); };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const value = Number(form.discountValue);
    if (!form.code.trim()) { toast.error('Enter a coupon code.'); return; }
    if (!Number.isFinite(value) || value <= 0) { toast.error('Enter a discount greater than zero.'); return; }
    if (form.discountType === 'PERCENT' && value > 100) { toast.error('A percentage discount cannot exceed 100.'); return; }
    if (form.startsAt && form.expiresAt && new Date(form.expiresAt) <= new Date(form.startsAt)) {
      toast.error('The expiry must come after the start date.');
      return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      discountType: form.discountType,
      discountValue: value,
      // A flat discount has no percentage cap to apply.
      maxDiscount: form.discountType === 'PERCENT' ? Number(form.maxDiscount) || 0 : 0,
      minOrderAmount: Number(form.minOrderAmount) || 0,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : new Date().toISOString(),
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      usageLimit: Number(form.usageLimit) || 0,
      perUserLimit: Number(form.perUserLimit) || 0,
      isActive: form.isActive,
      showOnHome: form.showOnHome,
    };

    setSaving(true);
    try {
      if (editing === 'new') {
        await api.createCoupon(payload);
        toast.success('Coupon created');
      } else {
        await api.updateCoupon(editing._id, payload);
        toast.success('Coupon updated');
      }
      closeForm();
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not save the coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}? This cannot be undone.`)) return;
    try {
      await api.deleteCoupon(coupon._id);
      toast.success('Coupon deleted');
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleActive = async (coupon) => {
    try {
      await api.updateCoupon(coupon._id, { isActive: !coupon.isActive });
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Coupons</h1>
          <p className="text-sm text-gray-500">Offers marked "show on home" appear in the banner on the customer home page.</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <FiPlus size={16} /> New Coupon
        </button>
      </div>

      {coupons.length === 0 ? (
        <div className="card p-12 text-center">
          <FiTag size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="font-semibold mb-1">No coupons yet</p>
          <p className="text-sm text-gray-500 mb-5">Create a discount code for your customers.</p>
          <button onClick={openCreate} className="btn-primary">Create your first coupon</button>
        </div>
      ) : (
        <div className="grid gap-3">
          {coupons.map(coupon => {
            const expired = coupon.expiresAt && new Date(coupon.expiresAt) <= new Date();
            const exhausted = coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit;

            return (
              <div key={coupon._id} className="card p-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-lg">{coupon.code}</span>
                    <span className="text-brand-600 font-semibold text-sm">{describe(coupon)}</span>
                    {!coupon.isActive && <Pill tone="gray">Inactive</Pill>}
                    {expired && <Pill tone="red">Expired</Pill>}
                    {exhausted && <Pill tone="amber">Limit reached</Pill>}
                    {coupon.showOnHome && coupon.isActive && !expired && <Pill tone="green">On home page</Pill>}
                  </div>
                  {coupon.description && <p className="text-sm text-gray-600 mt-1">{coupon.description}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    {coupon.minOrderAmount > 0 && `Min order ₹${coupon.minOrderAmount} · `}
                    Used {coupon.usedCount}{coupon.usageLimit > 0 ? ` / ${coupon.usageLimit}` : ''} times
                    {coupon.perUserLimit > 0 && ` · ${coupon.perUserLimit} per customer`}
                    {coupon.expiresAt && ` · expires ${new Date(coupon.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(coupon)}
                    className="btn-secondary text-sm"
                  >
                    {coupon.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => openEdit(coupon)} className="p-2 text-gray-500 hover:text-brand-600" aria-label="Edit">
                    <FiEdit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(coupon)} className="p-2 text-gray-500 hover:text-red-600" aria-label="Delete">
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / edit form */}
      {editing && (
        <div
          className="fixed inset-0 z-[95] bg-black/50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={closeForm}
        >
          <form
            onSubmit={handleSubmit}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing === 'new' ? 'New Coupon' : `Edit ${editing.code}`}</h2>
              <button type="button" onClick={closeForm} className="text-gray-400 hover:text-gray-700" aria-label="Close">
                <FiX size={20} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Code</label>
              <input
                className="input font-mono uppercase"
                maxLength={30}
                required
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') }))}
                placeholder="WELCOME20"
              />
              <p className="text-xs text-gray-500 mt-1">Letters, numbers, hyphens and underscores only.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                className="input"
                maxLength={200}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="20% off your first order"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Discount type</label>
                <select
                  className="input"
                  value={form.discountType}
                  onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))}
                >
                  <option value="PERCENT">Percentage</option>
                  <option value="FLAT">Flat amount</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {form.discountType === 'PERCENT' ? 'Percent off' : 'Amount off (₹)'}
                </label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max={form.discountType === 'PERCENT' ? 100 : undefined}
                  step="0.01"
                  required
                  value={form.discountValue}
                  onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {form.discountType === 'PERCENT' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Max discount (₹)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.maxDiscount}
                    onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value }))}
                    placeholder="0 = no cap"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Min order (₹)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minOrderAmount}
                  onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Starts</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Expires</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank for no expiry.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Total uses</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.usageLimit}
                  onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))}
                  placeholder="0 = unlimited"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Uses per customer</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.perUserLimit}
                  onChange={e => setForm(f => ({ ...f, perUserLimit: e.target.value }))}
                  placeholder="0 = unlimited"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                />
                Active
              </label>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={form.showOnHome}
                  onChange={e => setForm(f => ({ ...f, showOnHome: e.target.checked }))}
                />
                Advertise on the home page
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : (editing === 'new' ? 'Create Coupon' : 'Save Changes')}
              </button>
              <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Pill({ tone, children }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-green-50 text-green-700',
  };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${tones[tone]}`}>
      {children}
    </span>
  );
}

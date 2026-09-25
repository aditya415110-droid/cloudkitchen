import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiClock, FiSmartphone, FiShield, FiMapPin, FiPhone, FiTag, FiCopy, FiCheck, FiStar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useSettings, formatAddress, mapsLink, formatTime } from '../../context/SettingsContext';
import { describeCoupon } from '../../components/common/CouponInput';
import StarRating from '../../components/common/StarRating';
import { FoodPattern, BurgerIcon, PizzaIcon, CoffeeIcon } from '../../components/common/FoodGraphics';

const features = [
  { icon: FiClock, title: 'Fast Pickup', desc: 'Order online, pick up in minutes' },
  { icon: FiSmartphone, title: 'QR Pickup', desc: 'Scan your QR code at the counter' },
  { icon: FiShield, title: 'Secure Orders', desc: 'Safe, verified ordering system' },
];

export default function Home() {
  const { settings } = useSettings();
  const [coupons, setCoupons] = useState([]);
  const [rating, setRating] = useState({ average: 0, count: 0 });

  useEffect(() => {
    api.getActiveCoupons().then(({ data }) => setCoupons(data || [])).catch(() => setCoupons([]));
    api.getRestaurantReviews()
      .then(({ data }) => setRating({ average: data.average, count: data.count }))
      .catch(() => {});
  }, []);

  const { openState, location = {}, contact = {} } = settings;
  const address = formatAddress(location);
  const maps = mapsLink(location);
  const today = openState?.todayHours;

  return (
    <div>
      {/* Offers ticker */}
      {coupons.length > 0 && <OfferBanner coupons={coupons} />}

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-500 to-brand-700 text-white relative overflow-hidden">
        <FoodPattern className="text-white" />
        <div className="max-w-7xl mx-auto px-4 py-20 md:py-28 text-center relative">
          <img
            src="/logo.png"
            alt=""
            className="w-24 h-24 rounded-2xl object-cover mx-auto mb-6 shadow-lg ring-4 ring-white/20 animate-float"
          />

          <span
            className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1 rounded-full mb-5 animate-scaleIn ${
              openState?.isOpen ? 'bg-green-400/20 text-green-50' : 'bg-red-900/30 text-red-50'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${openState?.isOpen ? 'bg-green-300 animate-pulse' : 'bg-red-300'}`} />
            {openState?.isOpen
              ? `Open now${today && !today.isClosed ? ` · till ${formatTime(today.closeTime)}` : ''}`
              : (openState?.reason || 'Currently closed')}
          </span>

          <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-fadeUp [animation-delay:80ms]">
            {settings.restaurantName}
          </h1>
          <p className="text-lg md:text-xl text-brand-100 mb-4 max-w-2xl mx-auto animate-fadeUp [animation-delay:160ms]">
            {settings.tagline}
          </p>

          {rating.count > 0 && (
            <Link to="/reviews" className="inline-flex items-center gap-2 mb-6 hover:opacity-90">
              <StarRating value={rating.average} size="sm" />
              <span className="text-sm text-brand-50">{rating.average} from {rating.count} review{rating.count === 1 ? '' : 's'}</span>
            </Link>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 animate-fadeUp [animation-delay:240ms]">
            <Link to="/menu" className="inline-block bg-white text-brand-600 font-bold py-3 px-8 rounded-full text-lg hover:bg-brand-50 transition">
              Browse Menu
            </Link>
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="inline-flex items-center gap-2 border-2 border-white/70 text-white font-bold py-3 px-6 rounded-full text-lg hover:bg-white/10 transition"
              >
                <FiPhone size={18} /> Call Us
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Offers grid */}
      {coupons.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pt-14">
          <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <FiTag className="text-brand-500" /> Today's Offers
          </h2>
          <p className="text-gray-600 mb-6 text-sm">Tap a code to copy it, then apply it in your cart.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
            {coupons.map(coupon => <CouponCard key={coupon._id} coupon={coupon} />)}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex justify-center gap-10 mb-12 text-brand-300">
          <BurgerIcon size={44} className="animate-float" />
          <PizzaIcon size={44} className="animate-float [animation-delay:400ms]" />
          <CoffeeIcon size={44} className="animate-float [animation-delay:800ms]" />
        </div>
        <div className="grid md:grid-cols-3 gap-8 stagger">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card card-interactive p-6 text-center group">
              <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <Icon size={28} className="text-brand-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">{title}</h3>
              <p className="text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Find us */}
      {(address || contact.phone) && (
        <section className="max-w-7xl mx-auto px-4 pb-16">
          <div className="card p-6 md:p-8 grid md:grid-cols-2 gap-6">
            {address && (
              <div className="flex gap-3">
                <FiMapPin size={22} className="text-brand-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold mb-1">Find us</h3>
                  <p className="text-gray-600">{address}</p>
                  {maps && (
                    <a href={maps} target="_blank" rel="noopener noreferrer" className="text-brand-600 font-medium text-sm hover:underline mt-1 inline-block">
                      Open in Google Maps →
                    </a>
                  )}
                </div>
              </div>
            )}
            {contact.phone && (
              <div className="flex gap-3">
                <FiPhone size={22} className="text-brand-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold mb-1">Call us</h3>
                  <a href={`tel:${contact.phone}`} className="text-gray-600 hover:text-brand-600 block">{contact.phone}</a>
                  {contact.alternatePhone && (
                    <a href={`tel:${contact.alternatePhone}`} className="text-gray-600 hover:text-brand-600 block">{contact.alternatePhone}</a>
                  )}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="text-gray-600 hover:text-brand-600 block break-all">{contact.email}</a>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to order?</h2>
          <p className="text-gray-400 mb-8">Check out our menu and place your first order today.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/menu" className="btn-primary text-lg py-3 px-8">View Menu</Link>
            <Link to="/reviews" className="inline-flex items-center gap-2 border border-gray-600 text-white font-medium py-3 px-8 rounded-lg hover:bg-gray-800 transition">
              <FiStar size={18} /> Read Reviews
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Scrolling strip of live offers across the top of the page. */
function OfferBanner({ coupons }) {
  const parts = coupons.map((c) => {
    const minimum = c.minOrderAmount > 0 ? ` on orders above ₹${c.minOrderAmount}` : '';
    return `${describeCoupon(c)} with code ${c.code}${minimum}`;
  });
  const text = parts.join('   •   ');

  return (
    <div className="bg-amber-400 text-amber-950 overflow-hidden">
      <div className="flex whitespace-nowrap py-2 text-sm font-semibold animate-marquee">
        {/* Duplicated so the loop has no visible gap. */}
        {[0, 1].map((i) => (
          <span key={i} className="px-4 flex items-center gap-2" aria-hidden={i === 1}>
            <FiTag size={14} /> {text} &nbsp;&bull;&nbsp;
          </span>
        ))}
      </div>
    </div>
  );
}

function CouponCard({ coupon }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      toast.success(`Code ${coupon.code} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — please note the code down.');
    }
  };

  return (
    <button
      onClick={copy}
      className="card card-interactive p-5 text-left border-dashed border-2 border-brand-200 hover:border-brand-400 w-full"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xl font-bold text-brand-600">{describeCoupon(coupon)}</p>
          {coupon.description && <p className="text-sm text-gray-600 mt-1">{coupon.description}</p>}
          {coupon.minOrderAmount > 0 && (
            <p className="text-xs text-gray-500 mt-1">On orders above ₹{coupon.minOrderAmount}</p>
          )}
          {coupon.expiresAt && (
            <p className="text-xs text-gray-500 mt-0.5">
              Valid till {new Date(coupon.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>
        <span className="text-brand-500 flex-shrink-0">
          {copied ? <FiCheck size={18} /> : <FiCopy size={18} />}
        </span>
      </div>
      <p className="mt-3 font-mono font-bold tracking-wider bg-brand-50 text-brand-700 rounded-md px-3 py-1.5 inline-block text-sm">
        {coupon.code}
      </p>
    </button>
  );
}

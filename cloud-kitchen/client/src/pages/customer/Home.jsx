import { Link } from 'react-router-dom';
import { FiClock, FiSmartphone, FiShield } from 'react-icons/fi';

const features = [
  { icon: FiClock, title: 'Fast Pickup', desc: 'Order online, pick up in minutes' },
  { icon: FiSmartphone, title: 'QR Pickup', desc: 'Scan your QR code at the counter' },
  { icon: FiShield, title: 'Secure Orders', desc: 'Safe, verified ordering system' },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-500 to-brand-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 md:py-32 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Fresh Food,<br />Fast Pickup</h1>
          <p className="text-lg md:text-xl text-brand-100 mb-8 max-w-2xl mx-auto">
            Order from our kitchen, get notified when it's ready, and pick up with a simple QR scan.
          </p>
          <Link to="/menu" className="inline-block bg-white text-brand-600 font-bold py-3 px-8 rounded-full text-lg hover:bg-brand-50 transition">
            Browse Menu
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-6 text-center">
              <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon size={28} className="text-brand-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">{title}</h3>
              <p className="text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to order?</h2>
          <p className="text-gray-400 mb-8">Check out our menu and place your first order today.</p>
          <Link to="/menu" className="btn-primary text-lg py-3 px-8">View Menu</Link>
        </div>
      </section>
    </div>
  );
}

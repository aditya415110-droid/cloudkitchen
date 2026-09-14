import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

// Remembering the dismissal stops the popup reappearing on every navigation.
const DISMISS_KEY = 'ck_login_prompt_dismissed';

const GoogleMark = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

/**
 * Sign-in prompt shown once per browser session to visitors who are not
 * signed in. Dismissible — browsing and the cart both work without an account.
 */
export default function LoginModal() {
  const { user, loading, signInWithGoogle } = useAuth();
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || user) { setOpen(false); return; }

    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      // Private browsing can block sessionStorage; showing the prompt is the safe default.
    }
    if (dismissed) return;

    // A short delay lets the page paint first, so the modal doesn't feel like a wall.
    const timer = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(timer);
  }, [user, loading]);

  const dismiss = () => {
    setOpen(false);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* not critical */ }
  };

  // Close on Escape, and stop the page behind from scrolling.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const handleSignIn = async () => {
    try {
      dismiss();
      await signInWithGoogle();
    } catch {
      // AuthContext surfaces the failure; nothing useful to add here.
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-7 relative text-center"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 p-1"
          aria-label="Close sign-in prompt"
        >
          <FiX size={20} />
        </button>

        <img src="/logo.png" alt="" className="w-20 h-20 rounded-xl object-cover mx-auto mb-4 shadow-sm" />

        <h2 id="login-modal-title" className="text-xl font-bold mb-1">
          Welcome to {settings.restaurantName}
        </h2>
        <p className="text-gray-600 text-sm mb-6">
          Sign in to place orders, track them live and collect with a QR code.
        </p>

        <button
          onClick={handleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg py-3 px-4 font-medium hover:bg-gray-50 transition"
        >
          <GoogleMark />
          Sign in with Google
        </button>

        <button onClick={dismiss} className="mt-4 text-sm text-gray-500 hover:text-gray-700">
          Continue browsing
        </button>
      </div>
    </div>
  );
}

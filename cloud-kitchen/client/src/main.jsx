import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SettingsProvider } from './context/SettingsContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <CartProvider>
            <App />
            <Toaster
              position="top-right"
              // The navbar is a sticky 64px bar, so offset below it: toasts used
              // to sit on top of the nav links and swallow their clicks.
              containerStyle={{ top: 76, right: 16 }}
              gutter={8}
              toastOptions={{
                duration: 2000,
                success: { duration: 1800 },
                error: { duration: 3500 },
                style: { maxWidth: '340px' },
              }}
            />
          </CartProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

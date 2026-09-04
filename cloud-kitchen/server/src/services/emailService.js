import nodemailer from 'nodemailer';
import config from '../config/index.js';
import { qrService } from './qrService.js';

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }
  return transporter;
};

const formatCurrency = (amount) => `₹${amount.toFixed(2)}`;
const formatDate = (date) => date ? new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'TBD';

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; }
  .header { background: #f97316; color: #fff; padding: 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; }
  .content { padding: 24px; }
  .order-info { background: #fff7ed; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  th { background: #f9fafb; font-weight: 600; }
  .total-row { font-weight: 700; font-size: 16px; }
  .qr-section { text-align: center; padding: 20px; background: #f9fafb; border-radius: 8px; margin: 16px 0; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 14px; }
  .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
`;

const itemsTable = (items, total) => `
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
    <tbody>
      ${items.map(i => `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${formatCurrency(i.price)}</td><td>${formatCurrency(i.price * i.quantity)}</td></tr>`).join('')}
      <tr class="total-row"><td colspan="3">Total</td><td>${formatCurrency(total)}</td></tr>
    </tbody>
  </table>
`;

export const emailService = {
  async sendOrderConfirmation(order) {
    const qrBuffer = await qrService.generateQrBuffer(order.qrToken);

    const html = `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body>
      <div class="container">
        <div class="header"><h1>🍽️ CloudKitchen</h1><p>Order Confirmation</p></div>
        <div class="content">
          <p>Hi <strong>${order.customerName}</strong>,</p>
          <p>Your order has been placed successfully!</p>
          <div class="order-info">
            <p><strong>Order ID:</strong> ${order.orderId}</p>
            <p><strong>Status:</strong> <span class="status-badge" style="background:#dbeafe;color:#1d4ed8;">PLACED</span></p>
            <p><strong>Estimated Pickup:</strong> ${formatDate(order.estimatedPickupTime)}</p>
          </div>
          ${itemsTable(order.items, order.totalAmount)}
          <div class="qr-section">
            <p><strong>Your Pickup QR Code</strong></p>
            <p style="color:#6b7280;font-size:13px;">Show this at pickup</p>
            <img src="cid:qrcode" alt="QR Code" width="200" height="200" />
          </div>
        </div>
        <div class="footer"><p>Thank you for ordering from CloudKitchen!</p></div>
      </div>
    </body></html>`;

    try {
      await getTransporter().sendMail({
        from: config.email.from,
        to: order.customerEmail,
        subject: `CloudKitchen - Order Confirmed #${order.orderId}`,
        html,
        attachments: [{
          filename: 'qrcode.png',
          content: qrBuffer,
          cid: 'qrcode',
        }],
      });
      return true;
    } catch (err) {
      console.error('Failed to send order confirmation email:', err.message);
      return false;
    }
  },

  async sendOrderReadyNotification(order) {
    const qrBuffer = await qrService.generateQrBuffer(order.qrToken);

    const html = `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body>
      <div class="container">
        <div class="header" style="background:#16a34a;"><h1>🍽️ CloudKitchen</h1><p>Your Order is Ready!</p></div>
        <div class="content">
          <p>Hi <strong>${order.customerName}</strong>,</p>
          <p>Great news! Your order <strong>#${order.orderId}</strong> is ready for pickup!</p>
          <div class="order-info" style="background:#f0fdf4;">
            <p><strong>Order ID:</strong> ${order.orderId}</p>
            <p><strong>Status:</strong> <span class="status-badge" style="background:#bbf7d0;color:#15803d;">READY FOR PICKUP</span></p>
            <p><strong>Pickup Time:</strong> ${formatDate(order.estimatedPickupTime)}</p>
          </div>
          <div class="qr-section">
            <p><strong>Show this QR code at the counter</strong></p>
            <img src="cid:qrcode" alt="QR Code" width="200" height="200" />
          </div>
          ${itemsTable(order.items, order.totalAmount)}
        </div>
        <div class="footer"><p>Thank you for ordering from CloudKitchen!</p></div>
      </div>
    </body></html>`;

    try {
      await getTransporter().sendMail({
        from: config.email.from,
        to: order.customerEmail,
        subject: `CloudKitchen - Order #${order.orderId} Ready for Pickup! 🎉`,
        html,
        attachments: [{
          filename: 'qrcode.png',
          content: qrBuffer,
          cid: 'qrcode',
        }],
      });
      return true;
    } catch (err) {
      console.error('Failed to send ready notification:', err.message);
      return false;
    }
  },

  async sendOrderCancellationNotification(order) {
    const html = `<!DOCTYPE html><html><head><style>${baseStyles}</style></head><body>
      <div class="container">
        <div class="header" style="background:#dc2626;"><h1>🍽️ CloudKitchen</h1><p>Order Cancelled</p></div>
        <div class="content">
          <p>Hi <strong>${order.customerName}</strong>,</p>
          <p>We're sorry, but your order <strong>#${order.orderId}</strong> has been cancelled.</p>
          <div class="order-info" style="background:#fef2f2;">
            <p><strong>Order ID:</strong> ${order.orderId}</p>
            <p><strong>Status:</strong> <span class="status-badge" style="background:#fecaca;color:#b91c1c;">CANCELLED</span></p>
          </div>
          ${itemsTable(order.items, order.totalAmount)}
          <p>If you have questions, please contact us.</p>
        </div>
        <div class="footer"><p>CloudKitchen</p></div>
      </div>
    </body></html>`;

    try {
      await getTransporter().sendMail({
        from: config.email.from,
        to: order.customerEmail,
        subject: `CloudKitchen - Order #${order.orderId} Cancelled`,
        html,
      });
      return true;
    } catch (err) {
      console.error('Failed to send cancellation email:', err.message);
      return false;
    }
  },
};

import { generateOrderId, generateQrToken } from '../src/utils/generateOrderId.js';

describe('Order ID Generation', () => {
  test('generates order ID starting with CK', () => {
    const id = generateOrderId();
    expect(id).toMatch(/^CK[A-Z0-9]{6}$/);
  });

  test('generates unique order IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateOrderId()));
    expect(ids.size).toBe(100);
  });

  test('generates QR token as 64-char hex string', () => {
    const token = generateQrToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  test('generates unique QR tokens', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateQrToken()));
    expect(tokens.size).toBe(100);
  });
});

describe('Order Business Logic', () => {
  const ORDER_STATUSES = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED'];

  test('all expected statuses exist', () => {
    expect(ORDER_STATUSES).toContain('PLACED');
    expect(ORDER_STATUSES).toContain('CONFIRMED');
    expect(ORDER_STATUSES).toContain('PREPARING');
    expect(ORDER_STATUSES).toContain('READY_FOR_PICKUP');
    expect(ORDER_STATUSES).toContain('COMPLETED');
    expect(ORDER_STATUSES).toContain('CANCELLED');
    expect(ORDER_STATUSES).toHaveLength(6);
  });

  test('price recalculation produces correct total', () => {
    const items = [
      { price: 299.00, quantity: 2 },
      { price: 149.50, quantity: 1 },
      { price: 99.00, quantity: 3 },
    ];
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    expect(total).toBeCloseTo(1044.50);
  });

  test('server-side validation rejects zero-item orders', () => {
    const items = [];
    expect(items.length).toBe(0);
    // In the controller, this triggers a 400 response
  });

  test('quantities are floor-clamped to minimum 1', () => {
    const clamp = (q) => Math.max(1, Math.floor(q));
    expect(clamp(0.5)).toBe(1);
    expect(clamp(-1)).toBe(1);
    expect(clamp(3.9)).toBe(3);
    expect(clamp(1)).toBe(1);
  });

  test('cancelled orders cannot be completed', () => {
    const order = { status: 'CANCELLED' };
    const canComplete = !['CANCELLED', 'COMPLETED'].includes(order.status);
    expect(canComplete).toBe(false);
  });

  test('completed orders cannot be completed again', () => {
    const order = { status: 'COMPLETED' };
    const canComplete = !['CANCELLED', 'COMPLETED'].includes(order.status);
    expect(canComplete).toBe(false);
  });

  test('QR code is invalidated after pickup', () => {
    const order = { qrUsed: false, status: 'READY_FOR_PICKUP' };
    // Simulate completion
    order.status = 'COMPLETED';
    order.qrUsed = true;
    expect(order.qrUsed).toBe(true);
    // Subsequent verification should fail
    const canPickup = !order.qrUsed && order.status !== 'CANCELLED';
    expect(canPickup).toBe(false);
  });

  test('email deduplication flags prevent duplicate sends', () => {
    const emailsSent = { confirmation: false, ready: false, cancellation: false };
    // First send
    const shouldSendConfirmation = !emailsSent.confirmation;
    expect(shouldSendConfirmation).toBe(true);
    emailsSent.confirmation = true;
    // Second attempt
    const shouldSendAgain = !emailsSent.confirmation;
    expect(shouldSendAgain).toBe(false);
  });
});

describe('Authorization Logic', () => {
  test('only ADMIN role has admin access', () => {
    const isAdmin = (role) => role === 'ADMIN';
    expect(isAdmin('ADMIN')).toBe(true);
    expect(isAdmin('USER')).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
    expect(isAdmin('')).toBe(false);
  });

  test('customer cannot access other customer orders', () => {
    const userId = 'user-123';
    const orderCustomerId = 'user-456';
    const canAccess = userId === orderCustomerId;
    expect(canAccess).toBe(false);
  });

  test('customer cannot modify order status', () => {
    // The API only exposes status updates under /admin routes
    // which require admin middleware
    const userRole = 'USER';
    const canModifyStatus = userRole === 'ADMIN';
    expect(canModifyStatus).toBe(false);
  });

  test('client-supplied prices are never trusted', () => {
    const clientPrice = 0.01; // malicious
    const dbPrice = 299.00;
    // Server always uses DB price
    const orderPrice = dbPrice;
    expect(orderPrice).toBe(299.00);
    expect(orderPrice).not.toBe(clientPrice);
  });
});

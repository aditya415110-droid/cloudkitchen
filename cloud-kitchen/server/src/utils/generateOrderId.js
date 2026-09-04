import { randomBytes } from 'crypto';

export const generateOrderId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  let id = 'CK';
  for (const b of bytes) {
    id += chars[b % chars.length];
  }
  return id;
};

export const generateQrToken = () => {
  return randomBytes(32).toString('hex');
};

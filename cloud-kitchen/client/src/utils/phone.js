/**
 * Indian mobile handling. Mirrors server/src/utils/phone.js — keep both in step.
 *
 * Decide by length rather than stripping a leading "91" blindly: a real number
 * such as 9123423498 starts with 91 and must be accepted untouched.
 */

/** Indian mobiles are 10 digits beginning 6, 7, 8 or 9. */
const BARE = /^[6-9]\d{9}$/;

/** Reduce any accepted format to the bare 10 digits. Junk is returned as-is. */
export const normalisePhone = (value) => {
  const digits = String(value ?? '').replace(/[^\d]/g, '');

  if (BARE.test(digits)) return digits;
  if (/^91[6-9]\d{9}$/.test(digits)) return digits.slice(2);
  if (/^0[6-9]\d{9}$/.test(digits)) return digits.slice(1);
  if (/^0091[6-9]\d{9}$/.test(digits)) return digits.slice(4);

  return digits;
};

export const isValidPhone = (value) => BARE.test(normalisePhone(value));

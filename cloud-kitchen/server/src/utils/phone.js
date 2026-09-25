/**
 * Indian mobile number handling.
 *
 * The earlier version stripped a leading "91" unconditionally, which broke every
 * genuine number that happens to start with 91 - 9123423498 became 23423498 and
 * was rejected. Adding a second 91 appeared to "fix" it, which is how the bug
 * was found. Decide by length instead: a bare, already-valid number is accepted
 * untouched, and a prefix is only removed when what remains is exactly a valid
 * 10-digit subscriber number.
 */

/** Indian mobiles are 10 digits beginning 6, 7, 8 or 9. */
const BARE = /^[6-9]\d{9}$/;

/** Reduce any accepted format to the bare 10 digits. Junk is returned as-is. */
export const normalisePhone = (value) => {
  const digits = String(value ?? '').replace(/[^\d]/g, '');

  if (BARE.test(digits)) return digits;                      // 9123423498
  if (/^91[6-9]\d{9}$/.test(digits)) return digits.slice(2);  // +91 or 91 prefix
  if (/^0[6-9]\d{9}$/.test(digits)) return digits.slice(1);   // STD 0 prefix
  if (/^0091[6-9]\d{9}$/.test(digits)) return digits.slice(4); // 0091 prefix

  return digits;
};

export const isValidPhone = (value) => BARE.test(normalisePhone(value));

export { BARE as PHONE_PATTERN };

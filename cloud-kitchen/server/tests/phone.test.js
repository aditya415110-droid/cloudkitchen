/**
 * Indian mobile validation, shared by the client and enforced on the server.
 */
import { normalisePhone, isValidPhone } from '../src/utils/phone.js';

const normalise = normalisePhone;
const isValid = isValidPhone;

describe('Indian mobile normalisation', () => {
  test('a bare 10-digit number is unchanged', () => {
    expect(normalise('9876543210')).toBe('9876543210');
  });

  test('strips the +91 country code and spaces', () => {
    expect(normalise('+91 98765 43210')).toBe('9876543210');
  });

  test('strips a leading zero', () => {
    expect(normalise('09876543210')).toBe('9876543210');
  });

  test('strips a bare 91 prefix', () => {
    expect(normalise('919876543210')).toBe('9876543210');
  });

  test('strips hyphens', () => {
    expect(normalise('98765-43210')).toBe('9876543210');
  });
});

describe('Indian mobile validation', () => {
  test.each([
    ['9876543210', 'starts with 9'],
    ['8876543210', 'starts with 8'],
    ['7876543210', 'starts with 7'],
    ['6876543210', 'starts with 6'],
    ['+91 98765 43210', 'with country code'],
    ['09876543210', 'with leading zero'],
  ])('accepts %s (%s)', (value) => {
    expect(isValid(value)).toBe(true);
  });

  test.each([
    ['1234567890', 'starts with 1'],
    ['5876543210', 'starts with 5'],
    ['0876543210', 'starts with 0 after stripping'],
    ['987654321', 'only nine digits'],
    ['98765432101', 'eleven digits'],
    ['98765abcde', 'contains letters'],
    ['', 'empty'],
    [null, 'null'],
    [undefined, 'undefined'],
  ])('rejects %s (%s)', (value) => {
    expect(isValid(value)).toBe(false);
  });

  test('a landline-style number is rejected', () => {
    expect(isValid('02212345678')).toBe(false);
  });

  test('normalisation cannot turn an invalid number valid', () => {
    // Stripping the leading 0 leaves 876543210 - nine digits, still invalid.
    expect(isValid('0876543210')).toBe(false);
  });
});

describe('regression: numbers that themselves start with 91', () => {
  test('a real 10-digit number beginning 91 is accepted untouched', () => {
    // Previously the leading "91" was stripped, leaving 8 digits, and the
    // number was rejected. Users worked around it by typing 91 twice.
    expect(normalise('9123423498')).toBe('9123423498');
    expect(isValid('9123423498')).toBe(true);
  });

  test('the same number with a country code still resolves to it', () => {
    expect(normalise('919123423498')).toBe('9123423498');
    expect(normalise('+91 91234 23498')).toBe('9123423498');
    expect(normalise('09123423498')).toBe('9123423498');
  });

  test('a doubled country code is not accepted', () => {
    expect(isValid('91919123423498')).toBe(false);
  });

  test('every 10-digit number starting 91 round-trips unchanged', () => {
    for (const n of ['9100000000', '9123423498', '9199999999']) {
      expect(normalise(n)).toBe(n);
      expect(isValid(n)).toBe(true);
    }
  });
});

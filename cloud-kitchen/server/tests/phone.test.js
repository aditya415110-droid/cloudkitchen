/**
 * Indian mobile validation, mirrored on the client and enforced on the server.
 * The client check is a convenience; these rules are what actually guard the DB.
 */

/** Strip spacing and any +91 / 91 / 0 prefix, leaving the bare subscriber number. */
const normalise = (value) =>
  String(value || '').replace(/[\s-]/g, '').replace(/^(\+91|0091|91|0)/, '');

const isValid = (value) => /^[6-9]\d{9}$/.test(normalise(value));

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

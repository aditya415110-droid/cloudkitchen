import mongoose from 'mongoose';
import MenuItem from '../src/models/MenuItem.js';

/**
 * Add-on pricing is decided entirely on the server: the client sends only which
 * extra and how many. These cover the clamping and the money arithmetic.
 */

const makeItem = (addOns = []) => new MenuItem({
  name: 'Burger',
  description: 'A burger',
  category: 'Mains',
  price: 300,
  addOns,
});

const cheese = { label: 'Extra Cheese', price: 25, maxQuantity: 3, enabled: true };
const sauce = { label: 'Garlic Sauce', price: 15, maxQuantity: 2, enabled: true };

/** Mirrors the controller: resolve requested extras against the item. */
const resolve = (item, requested) => requested
  .map(({ addOnId, quantity }) => {
    const offered = item.addOns.id(addOnId);
    if (!offered || !offered.enabled) return null;
    const n = Math.min(Math.max(0, Math.floor(Number(quantity) || 0)), offered.maxQuantity || 0);
    return n > 0 ? { label: offered.label, price: offered.price, quantity: n } : null;
  })
  .filter(Boolean);

const lineTotal = (price, qty, addOns) =>
  price * qty + addOns.reduce((sum, a) => sum + a.price * a.quantity, 0);

describe('add-on definition', () => {
  test('an item can carry several extras', () => {
    const item = makeItem([cheese, sauce]);
    expect(item.addOns).toHaveLength(2);
    expect(item.addOns[0].label).toBe('Extra Cheese');
  });

  test('an extra needs a label and a price', () => {
    const errors = makeItem([{ maxQuantity: 2 }]).validateSync()?.errors || {};
    expect(Object.keys(errors).join()).toMatch(/label|price/);
  });

  test('maxQuantity defaults to 5 and is capped at 20', () => {
    expect(makeItem([{ label: 'Dip', price: 10 }]).addOns[0].maxQuantity).toBe(5);
    const tooMany = makeItem([{ label: 'Dip', price: 10, maxQuantity: 50 }]).validateSync();
    expect(tooMany?.errors?.['addOns.0.maxQuantity']).toBeDefined();
  });

  test('a negative price is rejected', () => {
    expect(makeItem([{ label: 'Dip', price: -5 }]).validateSync()?.errors?.['addOns.0.price']).toBeDefined();
  });

  test('items with no extras are still valid', () => {
    expect(makeItem([]).validateSync()?.errors?.addOns).toBeUndefined();
  });
});

describe('resolving a customer request', () => {
  test('prices come from the item, never the request', () => {
    const item = makeItem([cheese]);
    const [got] = resolve(item, [{ addOnId: item.addOns[0]._id, quantity: 2, price: 0.01, label: 'Free!' }]);
    expect(got).toEqual({ label: 'Extra Cheese', price: 25, quantity: 2 });
  });

  test('quantity is clamped to maxQuantity', () => {
    const item = makeItem([cheese]);
    expect(resolve(item, [{ addOnId: item.addOns[0]._id, quantity: 99 }])[0].quantity).toBe(3);
  });

  test('zero and negative quantities drop the extra entirely', () => {
    const item = makeItem([cheese]);
    expect(resolve(item, [{ addOnId: item.addOns[0]._id, quantity: 0 }])).toHaveLength(0);
    expect(resolve(item, [{ addOnId: item.addOns[0]._id, quantity: -3 }])).toHaveLength(0);
  });

  test('a disabled extra cannot be ordered', () => {
    const item = makeItem([{ ...cheese, enabled: false }]);
    expect(resolve(item, [{ addOnId: item.addOns[0]._id, quantity: 2 }])).toHaveLength(0);
  });

  test('an unknown add-on id is ignored', () => {
    const item = makeItem([cheese]);
    expect(resolve(item, [{ addOnId: new mongoose.Types.ObjectId(), quantity: 2 }])).toHaveLength(0);
  });

  test('a fractional quantity is floored', () => {
    const item = makeItem([cheese]);
    expect(resolve(item, [{ addOnId: item.addOns[0]._id, quantity: 2.9 }])[0].quantity).toBe(2);
  });
});

describe('line totals', () => {
  test('two burgers with cheese and sauce', () => {
    const item = makeItem([cheese, sauce]);
    const chosen = resolve(item, [
      { addOnId: item.addOns[0]._id, quantity: 2 },  // 2 x 25
      { addOnId: item.addOns[1]._id, quantity: 1 },  // 1 x 15
    ]);
    // 300 x 2 + 50 + 15
    expect(lineTotal(item.price, 2, chosen)).toBe(665);
  });

  test('no extras leaves the total unchanged', () => {
    const item = makeItem([cheese]);
    expect(lineTotal(item.price, 2, resolve(item, []))).toBe(600);
  });

  test('a clamped request is charged at the clamped amount', () => {
    const item = makeItem([cheese]);
    const chosen = resolve(item, [{ addOnId: item.addOns[0]._id, quantity: 99 }]);
    // Charged for 3, not 99.
    expect(lineTotal(item.price, 1, chosen)).toBe(375);
  });
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => {});
});

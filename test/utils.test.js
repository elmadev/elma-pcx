import { arrayEqual } from '../src/utils';

describe.each([
  [new Uint8Array([0]), new Uint8Array([0]), true],
  [new Uint8Array([0, 1]), new Uint8Array([0]), false],
  [new Uint8Array([0]), new Uint8Array([0, 1]), false],
  [new Uint8Array([]), new Uint8Array([]), true],
])('Array equals', (a, b, val) => {
  test(`Array equals`, () => {
    expect(arrayEqual(a, b)).toEqual(val);
  });
});

/**
 * Checks whether two arrays are equal to each other
 * @param a - array a
 * @param b - array b 
 * @returns {boolean}
 */
export function arrayEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) {
    return false;
  }
  const length = a.length;
  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

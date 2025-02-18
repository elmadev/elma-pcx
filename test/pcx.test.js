import fs from 'fs';
import { PCX, writePCX, DefaultLGRPalette, Transparency } from '../src';

test('PCX read/write keeps file identity', () => {
  const file = fs.readFileSync('./test/assets/pcx/snp00000.pcx');
  const file2 = fs.readFileSync('./test/assets/pcx/snp00040.pcx');
  const pcx = new PCX(file);
  const pcx2 = new PCX(file2);
  const file3 = writePCX(
    pcx.getPixels(),
    pcx.width,
    pcx.height,
    pcx.getPalette()
  );
  const pcx3 = new PCX(file3);
  expect(pcx.getPalette()).toEqual(DefaultLGRPalette);
  expect(pcx.getPalette()).toEqual(pcx3.getPalette());
  expect(pcx.getPixels()).toEqual(pcx3.getPixels());
  expect(pcx.getPixels()).not.toEqual(pcx2.getPixels());
});

describe.each([
  ['crashHeader', 'Invalid PCX file'],
  ['crashVersion', 'Only Version 3.0 PCX files are supported'],
  ['crashEncoding', 'Invalid PCX encoding'],
  ['crashBPP', 'Only 8bpp PCX files are supported'],
  ['crashBitplanes', 'Only single bitplane PCX files are supported (Extended VGA)'],
])('Invalid PCX Files', (filename, errorMessage) => {
  test(`Invalid PCX File ${filename}`, () => {
    const file = `./test/assets/pcx/${filename}.pcx`;
    expect(() => {
      new PCX(fs.readFileSync(file));
    }).toThrow(errorMessage);
  });
});

test('PCX without a palette', () => {
  const pcx = new PCX(fs.readFileSync('./test/assets/pcx/noPalette.pcx'));
  expect(() => pcx.getPalette()).toThrow();
});

test('Prevent writing invalid pcx files', () => {
  const pixels = new Uint8Array([0, 1, 2, 3]);
  expect(() => writePCX(pixels, 2, 2)).not.toThrow();
  expect(() => writePCX(pixels, 3, 2)).toThrow();
  expect(() => writePCX(pixels, 2, 2, DefaultLGRPalette)).not.toThrow();
  expect(() => writePCX(pixels, 2, 2, DefaultLGRPalette.slice(1))).toThrow();
});

test('Force compression to take a break at each scanline', () => {
  const pcx = new PCX(fs.readFileSync('./test/assets/pcx/crossScanline.pcx'));
  expect(() => pcx.getPixels()).toThrow();
});

describe.each([
  [Transparency.Solid, [0, 0], [148, 104, 96, 255]],
  [Transparency.Palette, [0, 1919], [0, 0, 0, 0]],
  [Transparency.TopLeft, [0, 0], [148, 104, 96, 0]],
  [Transparency.TopRight, [0, 1919], [0, 0, 0, 0]],
  [Transparency.BottomLeft, [1079, 0], [0, 80, 172, 0]],
  [Transparency.BottomRight, [1079, 1919], [104, 40, 0, 0]],
])('Transparency', (transparency, coord, rgba) =>
  test(`Transparency ${transparency}`, () => {
    const pcx = new PCX(fs.readFileSync('./test/assets/pcx/snp00062.pcx'));
    const pixels = pcx.getImage(pcx.getPalette(), transparency);
    const pixel = coord[0] * pcx.width + coord[1];
    expect(pixels[4 * pixel + 0]).toEqual(rgba[0]);
    expect(pixels[4 * pixel + 1]).toEqual(rgba[1]);
    expect(pixels[4 * pixel + 2]).toEqual(rgba[2]);
    expect(pixels[4 * pixel + 3]).toEqual(rgba[3]);
  })
);

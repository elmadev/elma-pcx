import fs from 'fs';
import pngjs from 'pngjs';
import { Sprite, ABC8, DefaultLGRPalette } from '../src';

test('Directly Opening a SPR File', () => {
  const getSpr = async (filename, buffname, buff2name) => {
    const file = fs.readFileSync(filename);
    const spr = Sprite.fromBuffer(file);
    const img = spr.getImage();
    const buf = new Uint8ClampedArray(fs.readFileSync(buffname));
    expect(img).toEqual(buf);
    const img2 = spr.getImage(DefaultLGRPalette);
    const buf2 = new Uint8ClampedArray(fs.readFileSync(buff2name));
    expect(img2).toEqual(buf2);
  };
  getSpr(
    './test/assets/abc/char.spr',
    './test/assets/abc/char.buf',
    './test/assets/abc/char2.buf'
  );
});

test('Loading and saving same Spr file', () => {
  const getSpr = async (filename) => {
    const file = fs.readFileSync(filename);
    const spr = Sprite.fromBuffer(file);
    const buf = spr.toBuffer();
    expect(file.buffer).toEqual(buf.buffer);
  };
  getSpr('./test/assets/abc/char.spr');
});

test('Directly Opening a SPR File', () => {
  const checkSpr = async (filename) => {
    const file = fs.readFileSync(filename);
    const spr = Sprite.fromBuffer(file);
    // prettier-ignore
    const spr2 = Sprite.fromData(new Uint8Array([
      0xFF, 0xFF, 0x19, 0xFF, 0x19, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0x19, 0xFF, 0x19, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0x19, 0xFF, 0x19, 0xFF, 0xFF,
      0xFF, 0x19, 0x19, 0x19, 0x19, 0x19, 0x19, 0xFF,
      0xFF, 0xFF, 0xFF, 0x19, 0xFF, 0x19, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0x19, 0xFF, 0x19, 0xFF, 0xFF,
      0xFF, 0xFF, 0x19, 0x19, 0x19, 0x19, 0x19, 0x19,
      0xFF, 0xFF, 0xFF, 0xFF, 0x19, 0xFF, 0x19, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0x19, 0xFF, 0x19, 0xFF]), 
    [
      false, false, true, false, true, false, false, false,
      false, false, true, false, true, false, false, false,
      false, false, false, true, false, true, false, false,
      false, true, true, true, true, true, true, false,
      false, false, false, true, false, true, false, false,
      false, false, false, true, false, true, false, false,
      false, false, true, true, true, true, true, true,
      false, false, false, false, true, false, true, false,
      false, false, false, false, true, false, true, false
    ], 8, 9);

    expect(spr.width).toEqual(spr2.width);
    expect(spr.height).toEqual(spr2.height);
    expect(spr.pixels).toEqual(spr2.pixels);
    expect(spr.transparency).toEqual(spr2.transparency);
  };
  checkSpr('./test/assets/abc/char.spr');
});

test('SPR File invalid array dimensions', () => {
  const checkSpr = async () => {
    const spr = Sprite.fromData(new Uint8Array([0xff]), [false], 1, 1);
    spr.pixels = new Uint8Array([0, 1]);
    expect(() => spr.toBuffer()).toThrow(
      'Array dimensions do not correspond with width and height!'
    );
    expect(() =>
      Sprite.fromData(new Uint8Array([0xff, 0xff]), [false], 1, 1)
    ).toThrow('Array dimensions do not correspond with width and height!');
    expect(() =>
      Sprite.fromData(new Uint8Array([0xff]), [false, true], 1, 1)
    ).toThrow('Array dimensions do not correspond with width and height!');
  };
  checkSpr();
});

describe.each([
  ['invalid_header', 'Invalid Sprite file header'],
  ['invalid_transparency_code', 'Invalid Sprite transparency data'],
  ['invalid_transparency_header', 'Invalid Sprite transparency header'],
  [
    'invalid_transparency_length_odd',
    'Invalid Sprite transparency length 79 - must be an even number',
  ],
  [
    'invalid_transparency_length_too_short',
    'Sprite transparency data incomplete!',
  ],
])('Invalid SPR Files', (filename, errorMessage) => {
  test(`Invalid SPR File ${filename}`, () => {
    const file = `./test/assets/abc/${filename}.spr`;
    expect(() => {
      Sprite.fromBuffer(fs.readFileSync(file));
    }).toThrow(errorMessage);
  });
});

describe.each([
  ['small_invalid_header', 'Invalid ABC8 file header'],
  ['small_invalid_letter_header', 'Invalid ABC8 Letter header'],
])('Invalid ABC Files', (filename, errorMessage) => {
  test(`Invalid ABC File ${filename}`, () => {
    const file = `./test/assets/abc/${filename}.abc`;
    expect(() => {
      ABC8.fromBuffer(fs.readFileSync(file));
    }).toThrow(errorMessage);
  });
});

test('Opening an ABC File', () => {
  const getAbc = async (filename) => {
    if (!fs.existsSync(`./temp/${filename}/`)) {
      fs.mkdirSync(`./temp/${filename}/`);
    }
    const file = fs.readFileSync(`./test/assets/abc/${filename}.abc`);
    const abc = ABC8.fromBuffer(file);
    for (let i = 0; i < abc.letters.length; i++) {
      const letter = abc.letters[i];
      const spr = letter.sprite;
      const img = spr.getImage(DefaultLGRPalette);
      const png = new pngjs.PNG({ width: spr.width, height: spr.height });
      png.data = Buffer.from(img);
      const buff = pngjs.PNG.sync.write(png);
      fs.writeFileSync(`temp/${filename}/${letter.code}_${letter.y}.png`, buff);
    }
  };
  getAbc('small');
  getAbc('medium');
  getAbc('large');
  getAbc('kisbetu1');
  getAbc('kisbetu2');
  getAbc('menu');
});

test('Loading and saving same Abc file', () => {
  const checkAbc = async (filename) => {
    const file = fs.readFileSync(filename);
    const abc = ABC8.fromBuffer(file);
    const buf = abc.toBuffer();
    expect(file.buffer).toEqual(buf.buffer);
  };
  checkAbc('./test/assets/abc/small.abc');
});
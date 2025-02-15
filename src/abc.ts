import { arrayEqual } from './utils';

const SPRITE_TRANSPARENCY_HEADER = new Uint8Array([
  0x53, 0x50, 0x52, 0x49, 0x54, 0x45, 0x00,
]);

export class Sprite {
  public width: number = 0;
  public height: number = 0;
  public size: number | null = null;
  public pixels: Uint8Array = new Uint8Array();
  public transparency: boolean[] = [];

  /**
   * Create a Sprite from a raw file buffer
   * @param {Uint8Array | Buffer} buffer - raw file buffer
   */
  public static fromBuffer(buffer: Uint8Array | Buffer) {
    const sprite = new Sprite();
    const byteView = new Uint8Array(buffer);
    const dataView = new DataView(
      byteView.buffer,
      byteView.byteOffset,
      byteView.byteLength
    );
    if (byteView[0] != 0x2d) {
      throw new Error('Invalid Sprite file header');
    }

    sprite.width = dataView.getInt16(1, true);
    sprite.height = dataView.getInt16(3, true);
    sprite.pixels = byteView.slice(5, 5 + sprite.width * sprite.height);

    let offset = 5 + sprite.width * sprite.height;
    if (
      !arrayEqual(
        byteView.slice(offset, offset + 7),
        SPRITE_TRANSPARENCY_HEADER
      )
    ) {
      throw new Error('Invalid Sprite transparency header');
    }
    offset += 7;
    const transparencyLength = dataView.getUint16(offset, true);
    offset += 2;
    if (transparencyLength % 2 !== 0) {
      throw new Error(
        `Invalid Sprite transparency length ${transparencyLength} - must be an even number`
      );
    }

    sprite.size = offset + transparencyLength;
    sprite.transparency = new Array(sprite.width * sprite.height);
    let pixel = 0;
    while (offset < sprite.size) {
      const code = byteView[offset++];
      const length = byteView[offset++];
      if (code !== 0x4e && code !== 0x4b) {
        throw new Error('Invalid Sprite transparency data');
      }
      const solid = code === 0x4b;
      sprite.transparency.fill(solid, pixel, pixel + length);
      pixel += length;
    }
    if (pixel !== sprite.width * sprite.height) {
      throw new Error('Sprite transparency data incomplete!');
    }

    return sprite;
  }

  /**
   * Create a Sprite from image data
   * @param pixels - A flattened array of palette IDs
   * @param transparency - An array of booleans. True means the pixel is visible, false means the pixel is transparent
   * @param width - Image's width
   * @param height - Image's height
   */
  public static fromData(
    pixels: Uint8Array,
    transparency: boolean[],
    width: number,
    height: number
  ) {
    if (
      width * height !== pixels.length ||
      width * height !== transparency.length
    ) {
      throw new Error(
        'Array dimensions do not correspond with width and height!'
      );
    }
    const sprite = new Sprite();
    sprite.width = width;
    sprite.height = height;
    sprite.pixels = new Uint8Array(pixels);
    sprite.transparency = transparency;
    return sprite;
  }

  /**
   * Gets a colorized version of the sprite
   * @param palette - A 768-byte palette. If undefined, the palette ID will be used as greyscale
   * @returns {Uint8ClampedArray} Flattened RGBA pixel array of size 4*width*height
   */
  public getImage(palette: Uint8Array | undefined) {
    const nPixels = this.width * this.height;
    const image = new Uint8ClampedArray(4 * nPixels);
    for (let i = 0; i < nPixels; i++) {
      const paletteId = this.pixels[i];
      const colorOffset = 4 * i;
      if (palette) {
        const paletteOffset = 3 * paletteId;
        image[colorOffset] = palette[paletteOffset];
        image[colorOffset + 1] = palette[paletteOffset + 1];
        image[colorOffset + 2] = palette[paletteOffset + 2];
      } else {
        image[colorOffset] = paletteId;
        image[colorOffset + 1] = paletteId;
        image[colorOffset + 2] = paletteId;
      }
      image[colorOffset + 3] = this.transparency[i] ? 255 : 0;
    }
    return image;
  }

  /**
   * Returns the Sprite in a form that can be saved to a file
   * @returns {Uint8Array} - buffer to be stored to a file
   */
  public toBuffer() {
    const size = this.width * this.height;
    if (size !== this.pixels.length || size !== this.transparency.length) {
      throw new Error(
        'Array dimensions do not correspond with width and height!'
      );
    }
    const buffer = new Uint8Array(14 + 3 * size);
    const view = new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength
    );
    buffer[0] = 0x2d;
    view.setInt16(1, this.width, true);
    view.setInt16(3, this.height, true);
    buffer.set(this.pixels, 5);
    let offset = 5 + size;
    buffer.set(SPRITE_TRANSPARENCY_HEADER, offset);
    offset += 7;
    const transparencyOffset = offset;
    offset += 2;
    let pixel = 0;
    while (pixel < size) {
      const solid = this.transparency[pixel++];
      let length = 1;
      while (
        this.transparency[pixel] === solid &&
        pixel % this.width !== 0 &&
        length < 255
      ) {
        pixel++;
        length++;
      }
      const code = solid ? 0x4b : 0x4e;
      buffer[offset++] = code;
      buffer[offset++] = length;
    }
    view.setUint16(transparencyOffset, offset - transparencyOffset - 2, true);
    return buffer.slice(0, offset);
  }
}

const ABC8_HEADER = new Uint8Array([0x52, 0x41, 0x31, 0x00]);
const LETTER_HEADER = new Uint8Array([
  0x45, 0x47, 0x59, 0x4d, 0x49, 0x58, 0x00,
]);

export interface Letter {
  code: number;
  y: number;
  sprite: Sprite;
}

export class ABC8 {
  public letters: Letter[] = [];

  /**
   * Create the ABC8 from a raw file buffer
   * @param {Uint8Array | Buffer} buffer - raw file buffer
   */
  public static fromBuffer(buffer: Uint8Array | Buffer) {
    const abc8 = new ABC8();
    const byteView = new Uint8Array(buffer);
    const dataView = new DataView(
      byteView.buffer,
      byteView.byteOffset,
      byteView.byteLength
    );
    if (!arrayEqual(byteView.slice(0, 4), ABC8_HEADER)) {
      throw new Error('Invalid ABC8 file header');
    }
    const length = dataView.getInt16(4, true);
    let offset = 6;
    for (let i = 0; i < length; i++) {
      if (!arrayEqual(byteView.slice(offset, offset + 7), LETTER_HEADER)) {
        throw new Error('Invalid ABC8 Letter header');
      }
      offset += 7;
      const code = byteView[offset++];
      const y = dataView.getInt16(offset, true);
      offset += 2;
      const sprite = Sprite.fromBuffer(buffer.subarray(offset));
      offset += sprite.size!;
      abc8.letters.push({ code, y, sprite });
    }
    return abc8;
  }

  /**
   * Returns the ABC8 in a form that can be saved to a file
   * @returns {Uint8Array} - buffer to be stored to a file
   */
  public toBuffer() {
    let bufferSize = 6 + 10 * this.letters.length;
    const spriteBuffers = this.letters.map((letter) => {
      const buffer = letter.sprite.toBuffer();
      bufferSize += buffer.length;
      return buffer;
    });
    const buffer = new Uint8Array(bufferSize);
    const view = new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength
    );
    buffer.set(ABC8_HEADER, 0);
    view.setInt16(4, this.letters.length, true);
    let offset = 6;
    this.letters.forEach((letter, i) => {
      buffer.set(LETTER_HEADER, offset);
      offset += 7;
      buffer[offset++] = letter.code;
      view.setUint16(offset, letter.y, true);
      offset += 2;
      buffer.set(spriteBuffers[i], offset);
      offset += spriteBuffers[i].length;
    });
    return buffer;
  }
}

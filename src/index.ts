/**
 * Reduced subset of the implementation of PCX files as they are supported by Across and Elma
 * Only version 3.0, 8bpp, single bitplane PCX files are supported by these programs
 * The bitmap and palette are separated into two functions as often the palette comes from a different pcx file
 * When colorizing an image, you can specify the transparency as in Elma LGRs
 */

/**
 * Enum for transparency as used by LGR files
 *  - Solid: No transparency
 *  - Palette: Palette id 0 is transparent
 *  - TopLeft/TopRight/BottomLeft/BottomRight: selected pixel's palette id is transparent
 * @readonly
 */
export enum Transparency {
  Solid = 10,
  Palette = 11,
  TopLeft = 12,
  TopRight = 13,
  BottomLeft = 14,
  BottomRight = 15,
};

/**
 * PCX header data, restricted to the parameters that are not ignored by Elasto Mania
 * @interface
 */
interface PCXHeader {
  version: number;
  encoding: number;
  bpp: number;
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
  bitplanes: number;
  bpr: number;
}

export class PCX {
  public buffer: Uint8Array | Buffer;
  public byteView: Uint8Array;
  public header: PCXHeader;
  public width: number;
  public height: number;
  public _pixels: Uint8Array | null;

  /**
   *
   * @param {Uint8Array | Buffer} buffer - raw file buffer
   */
  constructor(buffer: Uint8Array | Buffer) {
    this.buffer = buffer;
    this.byteView = new Uint8Array(buffer);
    if (this.byteView[0] !== 0x0a) {
      throw new Error('Invalid PCX file');
    }
    this.header = {
      version: this.byteView[1],
      encoding: this.byteView[2],
      bpp: this.byteView[3],
      xmin: this._readLEWord(4),
      ymin: this._readLEWord(6),
      xmax: this._readLEWord(8),
      ymax: this._readLEWord(10),
      bitplanes: this.byteView[65],
      bpr: this._readLEWord(66),
    };
    if (this.header.version !== 5) {
      throw new Error('Only Version 3.0 PCX files are supported');
    }
    if (this.header.encoding !== 1) {
      throw new Error('Invalid PCX encoding');
    }
    if (this.header.bpp !== 8) {
      throw new Error('Only 8bpp PCX files are supported');
    }
    if (this.header.bitplanes !== 1) {
      throw new Error(
        'Only single bitplane PCX files are supported (Extended VGA)'
      );
    }
    this.width = this.header.xmax - this.header.xmin + 1;
    this.height = this.header.ymax - this.header.ymin + 1;
    this._pixels = null;
  }

  /**
   * Reads a 16-bit uint from the data buffer
   * @param {number} - byte offset of the raw data
   * @returns {number} 16-bit uint
   */
  _readLEWord(offset: number) {
    return this.byteView[offset] | (this.byteView[offset + 1] << 8);
  }

  /**
   * Gets the RGB palette data from the file
   * @returns {Uint8Array} Palette of length 768
   */
  getPalette() {
    if (this.byteView[this.buffer.byteLength - 769] !== 12) {
      throw new Error('Palette not found!');
    }
    return this.byteView.slice(this.buffer.byteLength - 768);
  }

  /**
   * Gets the file's bitmap pixel data
   * @returns {Uint8Array} Flattened pixel array of size width*height
   */
  getPixels() {
    if (!this._pixels) {
      this._pixels = this._decompressPCXData();
    }
    return this._pixels;
  }

  /**
   * Decompresses the raw data from the file to get the bitmap pixel data
   * @returns {Uint8Array} Flattened bitmap pixel data
   */
  _decompressPCXData() {
    const pixels = new Uint8Array(this.width * this.height);
    let offset = 128;
    for (let i = 0; i < this.height; i++) {
      let j = 0;
      while (j < this.header.bpr) {
        const byte1 = this.byteView[offset];
        offset++;
        let length = 1;
        let value = byte1;
        if ((byte1 & 0b11000000) == 0b11000000) {
          length = byte1 & 0b00111111;
          value = this.byteView[offset];
          offset++;
        }
        for (let x = 0; x < length; x++) {
          // skip buffer pixels
          if (j < this.width) {
            pixels[i * this.width + j] = value;
          }
          j++;
        }
      }
      if (this.header.bpr !== j) {
        throw new Error(
          'PCX images must have a decoding break at the end of each scanline'
        );
      }
    }
    return pixels;
  }

  /**
   * Calculates which palette id is transparent
   * @param {Transparency} transparency - An enum value from Transparency
   * @returns {number} The palette id that should be transparent
   */
  _getTransparencyPaletteId(transparency: Transparency) {
    switch (transparency) {
      case Transparency.Solid:
        return -1;
      case Transparency.Palette:
        return 0;
      case Transparency.TopLeft:
        return this.getPixels()[0];
      case Transparency.TopRight:
        return this.getPixels()[this.width - 1];
      case Transparency.BottomLeft:
        return this.getPixels()[this.height * (this.width - 1)];
      case Transparency.BottomRight:
        return this.getPixels()[this.height * this.width - 1];
    }
  }

  /**
   * Colorizes the bitmap with the provided palette, given a transparent palette id
   * @param {Uint8Array} palette - A palette from getPalette()
   * @param {number} transparentPaletteId - A palette id from _getTransparencyPaletteId()
   * @returns {Uint8Array} Flattened RGBA pixel array of size 4*width*height
   */
  _colorize(palette: Uint8Array, transparentPaletteId: number) {
    const colorPixels = new Uint8ClampedArray(this.width * this.height * 4);
    const pixels = this.getPixels();
    const size = this.width * this.height;
    for (let i = 0; i < size; i++) {
      const paletteId = pixels[i];
      const paletteOffset = 3 * paletteId;
      const colorOffset = 4 * i;
      colorPixels[colorOffset] = palette[paletteOffset];
      colorPixels[colorOffset + 1] = palette[paletteOffset + 1];
      colorPixels[colorOffset + 2] = palette[paletteOffset + 2];
      if (paletteId === transparentPaletteId) {
        colorPixels[colorOffset + 3] = 0;
      } else {
        colorPixels[colorOffset + 3] = 255;
      }
    }
    return colorPixels;
  }

  /**
   * Returns a colorized image from the image's pixels, using the provided palette and transparency options.
   * The image can be converted in the browser as follows:
   * @example
   * const imageData = new ImageData(pcxFile.getImage(), pcxFile.width, pcxFile.height)
   * const imageBitmap = await createImageBitmap(imageData)
   * @param {Uint8Array} palette - A palette from getPalette()
   * @param {Transparency} transparency - A transparency option from Transparency
   * @returns {Uint8Array} Flattened RGBA pixel array of size 4*width*height
   */
  getImage(palette: Uint8Array, transparency: Transparency) {
    const transparentPaletteId = this._getTransparencyPaletteId(transparency);
    const colorData = this._colorize(palette, transparentPaletteId);
    return colorData;
  }
}

/**
 * Writes a pcx image, following the conventions used in the Elasto Mania source code.
 * The width of the resulting pcx file is not necessarily a multiple of 2.
 * @param {Uint8Array} pixels - A bitmap with palette ids of size width*height
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {Uint8Array} palette - A 768-byte palette as provided by getPalette()
 * @returns {Uint8Array} file data buffer
 */
export const writePCX = (pixels: Uint8Array, width: number, height: number, palette?: Uint8Array | null) => {
  const headerBuffer = new Uint8Array(128);
  // header, version, encoding, bpp
  headerBuffer[0] = 0x0a;
  headerBuffer[1] = 5;
  headerBuffer[2] = 1;
  headerBuffer[3] = 8;
  // xmax, ymax
  headerBuffer[8] = (width - 1) & 0xff;
  headerBuffer[9] = ((width - 1) >> 8) & 0xff;
  headerBuffer[10] = (height - 1) & 0xff;
  headerBuffer[11] = ((height - 1) >> 8) & 0xff;
  // horzRes, vertRes as set by elma.exe
  headerBuffer[12] = 10;
  headerBuffer[14] = 10;
  // bitplanes
  headerBuffer[65] = 1;
  // bpr
  headerBuffer[66] = width & 0xff;
  headerBuffer[67] = (width >> 8) & 0xff;
  // paletteType as set by elma.exe
  headerBuffer[68] = 1;

  if(pixels.length !== width*height) {
    throw new Error('pixels.length does not match width*height!')
  }
  const compressedBuffer = new Uint8Array(2 * pixels.length);
  let i = 0;
  let j = 0;
  while (i < pixels.length) {
    const value = pixels[i++];
    let length = 1;
    while (pixels[i] === value && length < 63 && i % width != 0) {
      length++;
      i++;
    }
    if (length > 1 || value >= 0xc0) {
      compressedBuffer[j++] = 0xc0 | length;
    }
    compressedBuffer[j++] = value;
  }

  const buffer = new Uint8Array(128 + j + (palette ? 769 : 0));
  buffer.set(headerBuffer, 0);
  buffer.set(compressedBuffer.slice(0, j), 128);
  if (palette) {
    if (palette.length !== 768) {
      throw new Error('Invalid palette!');
    }
    const paletteOffset = 128 + j;
    buffer[paletteOffset] = 0x0c;
    buffer.set(palette, paletteOffset + 1);
  }

  return buffer;
};

export const DefaultLGRPalette = new Uint8Array([
  0, 0, 0, 120, 48, 0, 32, 0, 0, 180, 196, 172, 156, 0, 0, 164, 0, 0, 96, 96,
  56, 0, 8, 8, 8, 0, 8, 56, 0, 0, 104, 96, 104, 96, 104, 104, 156, 24, 8, 80, 8,
  72, 244, 112, 0, 80, 0, 0, 156, 40, 8, 180, 0, 0, 156, 40, 0, 120, 0, 0, 136,
  64, 16, 156, 16, 8, 40, 8, 0, 0, 128, 8, 0, 128, 0, 244, 228, 16, 128, 0, 0,
  56, 48, 48, 32, 32, 48, 0, 96, 0, 188, 204, 188, 0, 0, 48, 136, 40, 0, 64, 24,
  8, 180, 196, 180, 56, 16, 0, 40, 112, 180, 196, 96, 16, 0, 8, 0, 136, 180,
  212, 0, 104, 0, 104, 40, 0, 156, 104, 8, 136, 24, 0, 156, 156, 72, 220, 228,
  220, 0, 96, 8, 96, 0, 0, 128, 128, 128, 136, 136, 96, 120, 128, 148, 72, 64,
  32, 0, 212, 24, 96, 96, 96, 104, 96, 96, 148, 48, 0, 136, 48, 196, 120, 32, 0,
  156, 156, 96, 136, 156, 80, 136, 164, 204, 0, 48, 120, 0, 80, 0, 48, 156, 48,
  104, 112, 96, 72, 72, 72, 104, 112, 112, 188, 196, 180, 252, 112, 0, 0, 128,
  24, 96, 148, 196, 96, 148, 204, 96, 148, 148, 16, 96, 172, 164, 64, 8, 148,
  180, 212, 196, 0, 0, 0, 48, 0, 148, 0, 0, 172, 0, 0, 136, 48, 0, 0, 32, 0, 64,
  16, 0, 180, 188, 188, 0, 136, 8, 72, 96, 72, 0, 172, 0, 148, 16, 196, 244,
  212, 16, 120, 48, 16, 148, 40, 0, 196, 0, 8, 128, 128, 148, 148, 16, 0, 24, 8,
  0, 80, 24, 0, 8, 8, 80, 16, 56, 24, 180, 180, 172, 24, 96, 172, 156, 32, 136,
  56, 8, 0, 40, 56, 64, 128, 48, 8, 120, 164, 204, 120, 164, 112, 16, 0, 0, 188,
  180, 64, 236, 188, 56, 32, 32, 32, 164, 180, 172, 0, 120, 8, 80, 80, 80, 0,
  120, 0, 136, 0, 0, 24, 96, 180, 0, 120, 16, 104, 156, 204, 16, 112, 0, 104,
  156, 180, 204, 220, 196, 16, 112, 16, 88, 8, 0, 104, 0, 8, 8, 112, 0, 0, 112,
  8, 88, 0, 0, 72, 40, 0, 0, 112, 0, 104, 104, 96, 8, 96, 0, 104, 120, 120, 196,
  8, 8, 56, 64, 64, 0, 64, 0, 148, 104, 96, 56, 64, 32, 96, 0, 164, 228, 96, 8,
  16, 16, 8, 16, 16, 16, 32, 104, 180, 112, 156, 204, 180, 156, 48, 16, 24, 16,
  148, 16, 204, 32, 0, 8, 148, 56, 8, 24, 16, 72, 80, 136, 196, 80, 88, 88, 56,
  120, 188, 120, 16, 0, 64, 128, 188, 72, 128, 188, 148, 188, 212, 48, 136, 40,
  48, 120, 188, 120, 32, 8, 120, 8, 0, 80, 80, 56, 72, 0, 0, 64, 64, 64, 96, 96,
  88, 136, 24, 8, 16, 32, 8, 40, 0, 0, 72, 80, 64, 40, 48, 40, 16, 120, 8, 48,
  104, 188, 0, 16, 8, 88, 136, 196, 156, 8, 0, 96, 128, 80, 120, 120, 120, 72,
  136, 196, 56, 24, 0, 180, 8, 8, 120, 120, 72, 120, 96, 32, 8, 180, 8, 72, 128,
  196, 136, 72, 32, 0, 112, 32, 24, 104, 180, 88, 24, 16, 96, 64, 24, 188, 204,
  180, 136, 136, 148, 48, 112, 180, 24, 24, 24, 16, 56, 0, 120, 172, 204, 8, 16,
  24, 80, 212, 40, 104, 212, 244, 0, 96, 204, 104, 48, 16, 96, 96, 204, 104, 0,
  0, 80, 136, 188, 164, 156, 164, 148, 0, 80, 188, 32, 48, 8, 88, 172, 32, 112,
  24, 56, 72, 56, 0, 80, 172, 252, 164, 32, 220, 164, 24, 16, 96, 112, 8, 88,
  180, 32, 24, 24, 136, 252, 0, 40, 112, 188, 120, 136, 128, 236, 220, 72, 32,
  40, 64, 120, 48, 8, 104, 164, 196, 244, 164, 120, 236, 156, 120, 120, 64, 16,
  188, 16, 8, 96, 24, 0, 40, 16, 8, 64, 120, 188, 0, 16, 0, 64, 212, 24, 72,
  228, 8, 56, 40, 212, 32, 228, 40, 104, 148, 196, 0, 88, 172, 16, 128, 16, 196,
  204, 196, 8, 80, 16, 220, 244, 220, 236, 16, 48, 40, 16, 0, 40, 104, 180, 120,
  156, 220, 88, 16, 212, 48, 48, 80, 88, 148, 196, 220, 0, 0, 212, 212, 212, 0,
  8, 156, 0, 148, 196, 88, 80, 80, 72, 220, 40, 16, 80, 172, 228, 128, 96, 204,
  64, 24, 252, 252, 252,
]);

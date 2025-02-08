import fs from 'fs';
import { LGR } from 'elmajs';
import { PCX, Transparency, writePCX, DefaultLGRPalette } from '../src';

if (!fs.existsSync('./temp/')) {
  fs.mkdirSync('./temp/');
}
// Mimic the code in the readme, excluding browser-specific ImageData and createImageBitmap

test('Opening a PCX File via an LGR', () => {
  const getImageData = (lgr, filename) => {
    const pictureData = lgr.pictureData.find((picture) => picture.name.toLowerCase() === `${filename}.pcx`);
    const pictureList = lgr.pictureList.find((picture) => picture.name.toLowerCase() === filename);
    const pcx = new PCX(pictureData.data);
    return { pictureData, pictureList, pcx };
  };

  const getBarrelBitmap = async () => {
    const file = fs.readFileSync('./test/assets/default.lgr');
    const lgr = LGR.from(file);
    const q1bike = getImageData(lgr, 'q1bike');
    const lgrPalette = q1bike.pcx.getPalette();
    const barrel = getImageData(lgr, 'barrel');
    const pixelBitmap = barrel.pcx.getPixels();
    const pixelColors = barrel.pcx.getImage(lgrPalette, barrel.pictureList.transparency);
    //const imageData = new ImageData(pixelColors, barrel.pcx.width, barrel.pcx.height);
    //const imageBitmap = await createImageBitmap(imageData);
    //return { imageData, imageBitmap };
  };

  getBarrelBitmap();
});

test('Directly Opening a PCX File', () => {
  const getPcx = async (filename, transparency = Transparency.TopLeft) => {
    const file = fs.readFileSync(filename);
    const pcx = new PCX(file);

    const palette = pcx.getPalette();
    const pixelBitmap = pcx.getPixels();
    const pixelColors = pcx.getImage(palette, transparency);
    //const imageData = new ImageData(pixelColors, pcx.width, pcx.height);
    //const imageBitmap = await createImageBitmap(imageData);
    //return { imageData, imageBitmap };
  };
  getPcx('./test/assets/snp00000.pcx');
});

test('Writing a PCX File', () => {
  const writeFile = (filename, pixels, width, height, palette) => {
    const data = writePCX(pixels, width, height, palette);
    fs.writeFileSync(filename, data);
  };

  // Make a 2x2 image
  // Top row palette id 0 = [0, 0, 0]
  // Bottom row palette id 255 = [252, 252, 252]
  const filename = './temp/small.pcx';
  const width = 2;
  const height = 2;
  const pixels = new Uint8Array([0, 0, 255, 255]);
  const palette = DefaultLGRPalette;
  writeFile(filename, pixels, width, height, palette);
});

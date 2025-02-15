import fs from 'fs';
import pngjs from 'pngjs';
import { LGR } from 'elmajs';
import { PCX, Transparency, writePCX, DefaultLGRPalette, ABC8 } from '../src';

if (!fs.existsSync('./temp/')) {
  fs.mkdirSync('./temp/');
}
// Mimic the code in the readme, excluding browser-specific ImageData and createImageBitmap

test('Opening a PCX File via an LGR', () => {
  const getImageData = (lgr, filename) => {
    const pictureData = lgr.pictureData.find(
      (picture) => picture.name.toLowerCase() === `${filename}.pcx`
    );
    const pictureList = lgr.pictureList.find(
      (picture) => picture.name.toLowerCase() === filename
    );
    const pcx = new PCX(pictureData.data);
    return { pictureData, pictureList, pcx };
  };

  const getBarrelBitmap = async () => {
    const file = fs.readFileSync('./test/assets/pcx/default.lgr');
    const lgr = LGR.from(file);
    const q1bike = getImageData(lgr, 'q1bike');
    const lgrPalette = q1bike.pcx.getPalette();
    const barrel = getImageData(lgr, 'barrel');
    const pixelBitmap = barrel.pcx.getPixels();
    const pixelColors = barrel.pcx.getImage(
      lgrPalette,
      barrel.pictureList.transparency
    );
    return pixelColors;
  };

  getBarrelBitmap();
});

test('Directly Opening a PCX File', () => {
  const getPcx = async (filename, transparency = Transparency.Solid) => {
    const file = fs.readFileSync(filename);
    const pcx = new PCX(file);

    const palette = pcx.getPalette();
    const pixelBitmap = pcx.getPixels();
    const pixelColors = pcx.getImage(palette, transparency);
    return pixelColors;
  };
  getPcx('./test/assets/pcx/snp00000.pcx');
});

test('Writing a PCX File', () => {
  const writeFile = async (filename, pixels, width, height, palette) => {
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

/*Getting Image Data for a Browser Canvas

const getImage = (fileBuffer) => {
  const pcx = new PCX(fileBuffer);
  const pixelColors = pcx.getImage(palette, transparency);
  const imageData = new ImageData(pixelColors, pcx.width, pcx.height);
  const imageBitmap = await createImageBitmap(imageData);
  return { imageData, imageBitmap };
};*/

test('Extracting Image Data from an ABC8 File', () => {
  const getAbc = async (filename) => {
    if (!fs.existsSync(`./temp/${filename}/`)) {
      fs.mkdirSync(`./temp/${filename}/`);
    }
    const file = fs.readFileSync(`./test/assets/abc/${filename}.abc`);
    const abc = ABC8.fromBuffer(file);
    for (let i = 0; i < abc.letters.length; i++) {
      const letter = abc.letters[i];
      const sprite = letter.sprite;
      const img = sprite.getImage(DefaultLGRPalette);
      const png = new pngjs.PNG({ width: sprite.width, height: sprite.height });
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

# elma-pcx
.pcx NPM package for Elasto Mania and Action Supercross with 100% test coverage!

This package can also handle .abc and .spr files from these games.

# Install
`npm install elma-pcx`

# Usage
## Opening a PCX File via an LGR
```js
import fs from 'fs';
import { LGR } from "elmajs";
import { PCX } from "elma-pcx";

const getImageData = (lgr, filename) => {
  const pictureData = lgr.pictureData.find((picture) => picture.name.toLowerCase() === `${filename}.pcx`);
  const pictureList = lgr.pictureList.find((picture) => picture.name.toLowerCase() === filename);
  const pcx = new PCX(pictureData.data);
  return { pictureData, pictureList, pcx };
};

const getBarrelBitmap = async () => {
  const file = fs.readFileSync('default.lgr');
  const lgr = LGR.from(file);
  const q1bike = getImageData(lgr, 'q1bike');
  const lgrPalette = q1bike.pcx.getPalette();
  const barrel = getImageData(lgr, 'barrel');
  const pixelBitmap = barrel.pcx.getPixels();
  const pixelColors = barrel.pcx.getImage(lgrPalette, barrel.pictureList.transparency);
  return pixelColors;
};

getBarrelBitmap();
```

## Directly Opening a PCX File
```js
import fs from "fs";
import { PCX, Transparency } from "elma-pcx";

const getPcx = async (filename, transparency = Transparency.Solid) => {
  const file = fs.readFileSync(filename);
  const pcx = new PCX(file);

  const palette = pcx.getPalette();
  const pixelBitmap = pcx.getPixels();
  const pixelColors = pcx.getImage(palette, transparency);
  return pixelColors;
};
getPcx('snp00000.pcx');
```

## Writing a PCX File
```js
import fs from "fs";
import { writePCX, DefaultLGRPalette } from "elma-pcx";

const writeFile = (filename, pixels, width, height, palette) => {
  const data = writePCX(pixels, width, height, palette);
  fs.writeFileSync(filename, data);
};

// Make a 2x2 image
// Top row palette id 0 = [0, 0, 0]
// Bottom row palette id 255 = [252, 252, 252]
const filename = 'small.pcx';
const width = 2;
const height = 2;
const pixels = new Uint8Array([0, 0, 255, 255]);
const palette = DefaultLGRPalette;
writeFile(filename, pixels, width, height, palette);
```

## Getting Image Data for a Browser Canvas
```js
const getImage = (fileBuffer) => {
  const pcx = new PCX(fileBuffer);
  const pixelColors = pcx.getImage(palette, transparency);
  const imageData = new ImageData(pixelColors, pcx.width, pcx.height);
  const imageBitmap = await createImageBitmap(imageData);
  return { imageData, imageBitmap };
};
```

## Extracting Image Data from an ABC8 File
```js
import pngjs from 'pngjs';

const getAbc = async (filename) => {
  if (!fs.existsSync(`./${filename}/`)) {
    fs.mkdirSync(`./${filename}/`);
  }
  const file = fs.readFileSync(`./${filename}.abc`);
  const abc = ABC8.fromBuffer(file);
  for (let i = 0; i < abc.letters.length; i++) {
    const letter = abc.letters[i];
    const sprite = letter.sprite;
    const img = sprite.getImage(DefaultLGRPalette);
    const png = new pngjs.PNG({ width: sprite.width, height: sprite.height });
    png.data = Buffer.from(img);
    const buff = pngjs.PNG.sync.write(png);
    fs.writeFileSync(`./${filename}/${letter.code}_${letter.y}.png`, buff);
  }
};
getAbc('small');
getAbc('medium');
getAbc('large');
getAbc('kisbetu1');
getAbc('kisbetu2');
getAbc('menu');
```
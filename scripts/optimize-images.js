const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const input = path.join(__dirname, '..', 'public', 'wallpaper-pc.jpg');
const output = path.join(__dirname, '..', 'public', 'wallpaper-pc.webp');

async function convert() {
  const inputSize = fs.statSync(input).size;
  console.log(`Input: wallpaper-pc.jpg (${(inputSize / 1024).toFixed(0)} KB)`);

  await sharp(input)
    .webp({ quality: 75 })
    .toFile(output);

  const outputSize = fs.statSync(output).size;
  console.log(`Output: wallpaper-pc.webp (${(outputSize / 1024).toFixed(0)} KB)`);
  console.log(`Reduction: ${((1 - outputSize / inputSize) * 100).toFixed(1)}%`);
}

convert().catch(console.error);

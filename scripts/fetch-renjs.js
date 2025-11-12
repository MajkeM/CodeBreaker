// downloads renjs.js into vendor/renjs.js (node >=10)
const https = require('https');
const fs = require('fs');
const path = require('path');

const URL = 'https://renjs.net/downloads/releases/renjs.js';
const outDir = path.join(__dirname, '..', 'vendor');
const outFile = path.join(outDir, 'renjs.js');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

console.log('Downloading RenJS from', URL);

const file = fs.createWriteStream(outFile);
https.get(URL, (res) => {
  if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
    console.log('Redirected to', res.headers.location);
    return https.get(res.headers.location, (r2) => r2.pipe(file).on('finish', () => {
      console.log('Saved to', outFile);
    }));
  }
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Saved to', outFile);
  });
}).on('error', (err) => {
  fs.unlink(outFile, () => {});
  console.error('Download failed:', err.message);
  process.exit(1);
});

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function makePNG(width, height, r, g, b, a) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([type, data, len]);
    // CRC over type+data
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(Buffer.concat([type, data])) >>> 0, 0);
    return Buffer.concat([len, type, data, crc]);
  }
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 0);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  // IDAT: raw scanlines with filter byte 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type none
    for (let x = 0; x < width; x++) {
      const i = y * (stride + 1) + 1 + x * 4;
      raw[i] = r; raw[i+1] = g; raw[i+2] = b; raw[i+3] = a;
    }
  }
  const idat = zlib.deflateRawSync(raw);
  const iend = Buffer.alloc(0);
  return Buffer.concat([sig, chunk(Buffer.from('IHDR'), ihdr), chunk(Buffer.from('IDAT'), idat), chunk(Buffer.from('IEND'), iend)]);
}

const outDir = path.resolve(process.argv[2] || 'client/public/icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
// brand: watchin purple #7c4dff
const png192 = makePNG(192, 192, 0x7c, 0x4d, 0xff, 0xff);
const png512 = makePNG(512, 512, 0x7c, 0x4d, 0xff, 0xff);
fs.writeFileSync(path.join(outDir, 'android-chrome-192x192.png'), png192);
fs.writeFileSync(path.join(outDir, 'android-chrome-512x512.png'), png512);
console.log('wrote', outDir);

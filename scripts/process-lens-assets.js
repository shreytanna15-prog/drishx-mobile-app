const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function loadImageRGBA(inputPath) {
  const buf = fs.readFileSync(inputPath);
  const isPng =
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47;
  const isJpeg = buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8;

  if (isPng) {
    const png = PNG.sync.read(buf);
    return { width: png.width, height: png.height, data: png.data };
  }
  if (isJpeg) {
    const jpg = jpeg.decode(buf, { useTArray: true });
    return { width: jpg.width, height: jpg.height, data: jpg.data };
  }

  const ext = path.extname(inputPath).toLowerCase();
  throw new Error(`Unsupported image format for ${inputPath} (${ext})`);
}

/**
 * Keep the photorealistic lens fully opaque.
 * Only hide square photo corners / studio floor with a circular crop + outer feather.
 * Do not punch through dark glass with luma keying.
 */
function circularAlpha(width, height, x, y) {
  const cx = width / 2;
  const cy = height / 2 - height * 0.02;
  const maxR = Math.min(width, height) * 0.46;
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxR;
  if (dist > 1.08) return 0;
  if (dist > 0.92) return Math.round(255 * (1 - smoothstep(0.92, 1.08, dist)));
  return 255;
}

function studioToTransparentPng(input, output) {
  const { width, height, data } = loadImageRGBA(input);
  const png = new PNG({ width, height });
  let transparent = 0;
  let opaque = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = circularAlpha(width, height, x, y);
      png.data[i] = data[i];
      png.data[i + 1] = data[i + 1];
      png.data[i + 2] = data[i + 2];
      png.data[i + 3] = alpha;
      if (alpha < 10) transparent++;
      else if (alpha > 200) opaque++;
    }
  }

  fs.writeFileSync(output, PNG.sync.write(png));
  console.log(
    path.basename(output),
    `${width}x${height}`,
    `transparent=${transparent}`,
    `opaque=${opaque}`
  );
}

/** Lift dark studio fill to warm paper so the lens reads on a white card. */
function studioToLightPng(input, output) {
  const { width, height, data } = loadImageRGBA(input);
  const png = new PNG({ width, height });
  const paperR = 250;
  const paperG = 248;
  const paperB = 244;
  let transparent = 0;
  let opaque = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      const alpha = circularAlpha(width, height, x, y);

      let keep = Math.pow(smoothstep(6, 165, luma), 0.62);
      if (chroma > 16) {
        keep = Math.max(keep, smoothstep(12, 36, chroma));
      }

      png.data[i] = Math.round(paperR + (r - paperR) * keep);
      png.data[i + 1] = Math.round(paperG + (g - paperG) * keep);
      png.data[i + 2] = Math.round(paperB + (b - paperB) * keep);
      png.data[i + 3] = alpha;

      if (alpha < 10) transparent++;
      else if (alpha > 200) opaque++;
    }
  }

  fs.writeFileSync(output, PNG.sync.write(png));
  console.log(
    path.basename(output),
    `${width}x${height}`,
    `light transparent=${transparent}`,
    `opaque=${opaque}`
  );
}

const catalogDir = path.join(__dirname, '..', 'assets', 'images', 'catalog');
const webCatalogDir = path.join('D:/internship/drishx-web-app/public/images/catalog');

const sources = [
  ['singlevision-source.png', 'singlevision-lens.png'],
  ['kryptok-source.png', 'kryptok-lens.png'],
  ['progressive-source.png', 'progressive-lens.png'],
];

fs.mkdirSync(catalogDir, { recursive: true });
fs.mkdirSync(webCatalogDir, { recursive: true });

for (const [srcName, outName] of sources) {
  const input = path.join(catalogDir, srcName);
  if (!fs.existsSync(input)) {
    console.error(`Missing source: ${input}`);
    process.exitCode = 1;
    continue;
  }
  const mobileOut = path.join(catalogDir, outName);
  studioToTransparentPng(input, mobileOut);
  fs.copyFileSync(mobileOut, path.join(webCatalogDir, outName));

  // Avoid Android drawable collision with *.jpeg — light uses a distinct basename.
  const lightName = outName.replace(/-lens\.png$/, '-light.png');
  const mobileLight = path.join(catalogDir, lightName);
  studioToLightPng(input, mobileLight);
  fs.copyFileSync(mobileLight, path.join(webCatalogDir, lightName));
}

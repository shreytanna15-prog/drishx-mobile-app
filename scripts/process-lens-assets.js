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
 * Crop to the glass disc only (rim ~0.28–0.34 of the frame).
 * Wider than that keeps the bright studio wall on the left.
 */
function lensFrame(width, height) {
  return {
    cx: width / 2,
    cy: height / 2 - height * 0.02,
    maxR: Math.min(width, height) * 0.345,
  };
}

function circularAlpha(width, height, x, y) {
  const { cx, cy, maxR } = lensFrame(width, height);
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxR;
  if (dist > 1.08) return 0;
  if (dist > 0.97) return 1 - smoothstep(0.97, 1.08, dist);
  return 1;
}

/** Drop the table / caustic below the contact point. */
function floorKeep(width, height, y) {
  const { cy, maxR } = lensFrame(width, height);
  const start = cy + maxR * 0.86;
  const end = cy + maxR * 1.02;
  if (y <= start) return 1;
  if (y >= end) return 0;
  return 1 - smoothstep(start, end, y);
}

function lumaOf(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function chromaOf(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

/**
 * Studio backdrop is dark + low-chroma. Glass is highlights, rims, gold etch,
 * and the Kryptok segment edge. Punch the backdrop so the card shows through.
 */
function glassKeep(r, g, b) {
  const luma = lumaOf(r, g, b);
  const chroma = chromaOf(r, g, b);
  const highlight = Math.pow(smoothstep(52, 128, luma), 0.72);
  const color = smoothstep(10, 34, chroma);
  return Math.min(1, Math.max(highlight, color));
}

function writePng(output, png, extra) {
  fs.writeFileSync(output, PNG.sync.write(png));
  let transparent = 0;
  let opaque = 0;
  for (let i = 3; i < png.data.length; i += 4) {
    const a = png.data[i];
    if (a < 10) transparent++;
    else if (a > 200) opaque++;
  }
  console.log(
    path.basename(output),
    `${png.width}x${png.height}`,
    `transparent=${transparent}`,
    `opaque=${opaque}`,
    extra || ''
  );
}

/** Dark theme: keep specular glass, drop charcoal studio. Soften the hottest rim. */
function studioToTransparentPng(input, output) {
  const { width, height, data } = loadImageRGBA(input);
  const png = new PNG({ width, height });

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = lumaOf(r, g, b);
      const keep =
        glassKeep(r, g, b) *
        circularAlpha(width, height, x, y) *
        floorKeep(width, height, y);
      const hot = smoothstep(210, 255, luma);
      const shade = 1 - 0.22 * hot;

      png.data[i] = Math.round(r * shade);
      png.data[i + 1] = Math.round(g * shade);
      png.data[i + 2] = Math.round(b * shade);
      png.data[i + 3] = Math.round(255 * keep);
    }
  }

  writePng(output, png, 'dark');
}

/**
 * Light theme: same cutout, but pull bright rims toward silver-gray so the
 * glass edge reads on white instead of disappearing.
 */
function studioToLightPng(input, output) {
  const { width, height, data } = loadImageRGBA(input);
  const png = new PNG({ width, height });

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = lumaOf(r, g, b);
      const keep =
        glassKeep(r, g, b) *
        circularAlpha(width, height, x, y) *
        floorKeep(width, height, y);
      const rim = smoothstep(90, 230, luma);
      const target = 68;

      png.data[i] = Math.round(r * (1 - 0.68 * rim) + target * 0.68 * rim);
      png.data[i + 1] = Math.round(g * (1 - 0.68 * rim) + target * 0.68 * rim);
      png.data[i + 2] = Math.round(b * (1 - 0.68 * rim) + target * 0.68 * rim);
      png.data[i + 3] = Math.round(255 * keep);
    }
  }

  writePng(output, png, 'light');
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

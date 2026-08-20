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

function lensFrame(width, height) {
  return {
    cx: width / 2,
    cy: height / 2 - height * 0.012,
    maxR: Math.min(width, height) * 0.465,
  };
}

function circularAlpha(width, height, x, y) {
  const { cx, cy, maxR } = lensFrame(width, height);
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxR;
  if (dist > 1.05) return 0;
  if (dist > 0.95) return 1 - smoothstep(0.95, 1.05, dist);
  return 1;
}

function floorKeep(width, height, y) {
  const { cy, maxR } = lensFrame(width, height);
  const start = cy + maxR * 0.9;
  const end = cy + maxR * 1.12;
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
 * White studio → alpha. Keep a soft glass disc + gold/structure detail so
 * the cutout still reads on both light and dark cards.
 */
function glassAlphaWhiteStudio(r, g, b) {
  const luma = lumaOf(r, g, b);
  const chroma = chromaOf(r, g, b);

  // Flat white backdrop / table
  const pureWhite = smoothstep(236, 252, luma) * (1 - smoothstep(6, 22, chroma));
  if (pureWhite > 0.92) return 0;

  // Soft white that is still backdrop-ish
  const softWhite = smoothstep(220, 248, luma) * (1 - smoothstep(10, 30, chroma));

  // Warm metal rim / etchings
  const warm =
    smoothstep(14, 42, chroma) *
    (r >= g * 0.9 && r >= b * 0.82 ? 1 : 0.45) *
    smoothstep(55, 200, luma);

  // Darker structure lines / segment edges
  const structure = 1 - smoothstep(170, 230, luma);

  // Specular crescents
  const specular = Math.pow(smoothstep(150, 245, luma), 0.9) * smoothstep(4, 28, chroma + 6);

  // Soft body fill so the disc is not only a wire rim
  const body = 0.22 + 0.45 * (1 - softWhite) + 0.2 * structure;

  const detail = Math.max(warm, structure * 0.9, specular, chroma / 48);
  const keep = Math.min(1, Math.max(body, detail));

  return Math.max(0, keep * (1 - pureWhite) * (1 - softWhite * 0.55));
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

function processPixel(data, width, height, x, y, mode) {
  const i = (y * width + x) * 4;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const luma = lumaOf(r, g, b);
  const keep =
    glassAlphaWhiteStudio(r, g, b) *
    circularAlpha(width, height, x, y) *
    floorKeep(width, height, y);

  if (mode === 'dark') {
    // Slight lift so gold/highlights hold on charcoal cards
    const lift = 1 + 0.1 * smoothstep(40, 190, luma);
    return {
      r: Math.min(255, Math.round(r * lift)),
      g: Math.min(255, Math.round(g * lift)),
      b: Math.min(255, Math.round(b * lift)),
      a: Math.round(255 * keep),
    };
  }

  // Light: darken bright rims so the edge reads on white cards
  const rim = smoothstep(85, 235, luma);
  const target = 64;
  return {
    r: Math.round(r * (1 - 0.7 * rim) + target * 0.7 * rim),
    g: Math.round(g * (1 - 0.7 * rim) + target * 0.7 * rim),
    b: Math.round(b * (1 - 0.7 * rim) + target * 0.7 * rim),
    a: Math.round(255 * keep),
  };
}

function convert(input, output, mode) {
  const { width, height, data } = loadImageRGBA(input);
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = processPixel(data, width, height, x, y, mode);
      const i = (y * width + x) * 4;
      png.data[i] = px.r;
      png.data[i + 1] = px.g;
      png.data[i + 2] = px.b;
      png.data[i + 3] = px.a;
    }
  }
  writePng(output, png, mode);
}

const rootDir = path.join(__dirname, '..');
const lensImgsDir = path.join(rootDir, 'lens-imgs');
const catalogDir = path.join(rootDir, 'assets', 'images', 'catalog');
const webCatalogDir = path.join('D:/internship/drishx-web-app/public/images/catalog');

/**
 * Source JPEGs in lens-imgs/:
 *   sv-img → Single Vision (plain disc)
 *   pg-img → Progressive filename, but asset shows Kryptok bifocal segment
 *   kt-img → Kryptok filename, but asset shows Progressive zone markings
 *
 * Mapped by lens appearance so product cards show the correct optic type.
 * Rename the JPEGs if you prefer filename-based mapping, then re-run.
 */
const sources = [
  ['sv-img.jpeg', 'singlevision'],
  ['kt-img.jpeg', 'progressive'],
  ['pg-img.jpeg', 'kryptok'],
];

fs.mkdirSync(catalogDir, { recursive: true });
fs.mkdirSync(webCatalogDir, { recursive: true });

for (const [srcName, key] of sources) {
  const input = path.join(lensImgsDir, srcName);
  if (!fs.existsSync(input)) {
    console.error(`Missing source: ${input}`);
    process.exitCode = 1;
    continue;
  }

  const sourceCopy = path.join(catalogDir, `${key}-source.jpeg`);
  fs.copyFileSync(input, sourceCopy);
  fs.copyFileSync(input, path.join(webCatalogDir, `${key}-source.jpeg`));

  const mobileDark = path.join(catalogDir, `${key}-lens.png`);
  const mobileLight = path.join(catalogDir, `${key}-light.png`);

  convert(input, mobileDark, 'dark');
  convert(input, mobileLight, 'light');

  fs.copyFileSync(mobileDark, path.join(webCatalogDir, `${key}-lens.png`));
  fs.copyFileSync(mobileLight, path.join(webCatalogDir, `${key}-light.png`));
}

console.log('Done. Regenerated lens cutouts for mobile + web.');

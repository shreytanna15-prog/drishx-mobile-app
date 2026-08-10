const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function jpegBlackToPng(input, output) {
  const jpg = jpeg.decode(fs.readFileSync(input), { useTArray: true });
  const { width, height, data } = jpg;
  const png = new PNG({ width, height });
  let t = 0;
  let o = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const maxc = Math.max(r, g, b);
      const minc = Math.min(r, g, b);
      const chroma = maxc - minc;
      let alpha = Math.round(255 * smoothstep(12, 48, luma));
      if (chroma > 25 && luma > 25) {
        alpha = Math.max(alpha, Math.min(255, Math.round(180 + chroma)));
      }
      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.min(width, height) * 0.52;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxR;
      if (dist > 1.02) alpha = 0;
      else if (dist > 0.94) alpha = Math.round(alpha * (1 - (dist - 0.94) / 0.08));
      png.data[i] = r;
      png.data[i + 1] = g;
      png.data[i + 2] = b;
      png.data[i + 3] = alpha;
      if (alpha < 10) t++;
      else if (alpha > 200) o++;
    }
  }
  fs.writeFileSync(output, PNG.sync.write(png));
  console.log(path.basename(output), `${width}x${height}`, `transparent=${t}`, `opaque=${o}`);
}

const assets =
  'C:/Users/HP/.cursor/projects/d-internship-drishx-web-app/assets';
const map = [
  [
    'c__Users_HP_AppData_Roaming_Cursor_User_workspaceStorage_25de1e6e358c8b74da4e91a861449cc7_images_sv_img-40828b4a-31f9-47c0-aba0-8e1d73300525.png',
    'singlevision.png',
  ],
  [
    'c__Users_HP_AppData_Roaming_Cursor_User_workspaceStorage_25de1e6e358c8b74da4e91a861449cc7_images_kt_img-b43e144a-c964-4da2-a420-2c86491f4b6f.png',
    'kryptok.png',
  ],
  [
    'c__Users_HP_AppData_Roaming_Cursor_User_workspaceStorage_25de1e6e358c8b74da4e91a861449cc7_images_v2_img-822db44d-7e10-489a-8659-2817852e80d6.png',
    'progressive.png',
  ],
];

const mobile = path.join(__dirname, '..', 'assets', 'images', 'catalog');
const web = 'D:/internship/drishx-web-app/public/images/catalog';
fs.mkdirSync(mobile, { recursive: true });
fs.mkdirSync(web, { recursive: true });

for (const [srcName, outName] of map) {
  const src = path.join(assets, srcName);
  const out = path.join(mobile, outName);
  jpegBlackToPng(src, out);
  fs.copyFileSync(out, path.join(web, outName));
}

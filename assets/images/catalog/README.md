# Shop lens category images

Used by Shop / Wholesale / product cards. Studio backdrop is punched to alpha so the card color shows through the glass.

| Category | Source (`lens-imgs/`) | Dark | Light |
| --- | --- | --- | --- |
| Single Vision | `sv-img.jpeg` | `singlevision-lens.png` | `singlevision-light.png` |
| Progressive | `kt-img.jpeg` (progressive zone art) | `progressive-lens.png` | `progressive-light.png` |
| Kryptok | `pg-img.jpeg` (bifocal segment) | `kryptok-lens.png` | `kryptok-light.png` |

Sources are mapped by **lens appearance** (the JPEG filenames in `lens-imgs/` are swapped relative to optic type).

**Android note:** Do not name processed PNGs the same basename as the catalog JPEGs (`singlevision.jpeg` + `singlevision.png` fails the Android resource merger). Use the `-lens` / `-light` suffixes.

```bash
node scripts/process-lens-assets.js
```

Outputs are written to:
- `assets/images/catalog/` (mobile)
- `D:/internship/drishx-web-app/public/images/catalog/` (web)

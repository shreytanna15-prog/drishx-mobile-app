# Shop lens category images

Used by Shop / Wholesale category cards with a radial alpha fade.

| Category | Source | Dark (transparent) | Light |
| --- | --- | --- | --- |
| Single Vision | `singlevision-source.png` | `singlevision-lens.png` | `singlevision-light.png` |
| Kryptok | `kryptok-source.png` | `kryptok-lens.png` | `kryptok-light.png` |
| Progressive | `progressive-source.png` | `progressive-lens.png` | `progressive-light.png` |

**Android note:** Do not name processed PNGs the same basename as the catalog JPEGs (`singlevision.jpeg` + `singlevision.png` fails the Android resource merger). Use the `-lens` / `-light` suffixes.

Original dark JPEGs remain for home carousel / other catalog uses.

```bash
node scripts/process-lens-assets.js
```

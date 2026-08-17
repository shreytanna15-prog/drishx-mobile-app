# Shop lens category images

Used by Shop / Wholesale category cards. Studio backdrop is punched to alpha so the card color shows through the glass.

| Category | Source | Dark | Light |
| --- | --- | --- | --- |
| Single Vision | `singlevision-source.png` | `singlevision-lens.png` | `singlevision-light.png` |
| Kryptok | `kryptok-source.png` | `kryptok-lens.png` | `kryptok-light.png` |
| Progressive | `progressive-source.png` | `progressive-lens.png` | `progressive-light.png` |

**Android note:** Do not name processed PNGs the same basename as the catalog JPEGs (`singlevision.jpeg` + `singlevision.png` fails the Android resource merger). Use the `-lens` / `-light` suffixes.

```bash
node scripts/process-lens-assets.js
```

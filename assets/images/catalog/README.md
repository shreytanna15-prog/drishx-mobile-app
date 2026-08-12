# Shop lens category images

Processed circular-crop PNGs for Shop / Wholesale category cards.

| Category | Source (studio photo) | Processed output |
| --- | --- | --- |
| Single Vision | `singlevision-source.png` | `singlevision.png` |
| Kryptok | `kryptok-source.png` | `kryptok.png` |
| Progressive | `progressive-source.png` | `progressive.png` |

Re-process after replacing `*-source.png` files:

```bash
node scripts/process-lens-assets.js
```

Light theme uses `*-light.png` (dark studio fill lifted to warm paper). Dark theme uses the circular-crop originals.

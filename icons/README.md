# App icons

The final supplied TRAIN artwork is installed in these required sizes:

- `icon-192.png` — 192 × 192 pixels
- `icon-512.png` — 512 × 512 pixels
- `apple-touch-icon.png` — 180 × 180 pixels

The manifest uses the 192 px and 512 px files for both `any` and `maskable` purposes. `index.html` uses the 180 px file as the Apple touch icon. The build validates their PNG dimensions and copies this folder unchanged to `dist/icons/`.

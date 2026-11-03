# Image Resizer

Resize and crop images in batches right in your browser. Nothing is uploaded to any server. Well suited to Shopee and WooCommerce product photos, banners and stories.

**Try it:** https://hoangpham.is-a.dev/image-resizer/


## Features

- Many images at once: drag and drop, file picker or paste (Ctrl/Cmd + V)
- Aspect ratio: original, **1:1**, **4:3**, **3:4**, **16:9**, **9:16**
  - **Crop to fit:** trims the excess around the center of the image
  - **Fit the whole image, add background:** loses no detail, fills empty space with white
- Width: original, 800 / 1000 / 1200 / 1600px or custom; small images are never upscaled
- Format: original, JPG, WEBP, PNG (85% quality)
- File names include the new size (for example `t-shirt-1000x1000.jpg`); download one by one or as a ZIP
- Vietnamese / English interface, with dark mode

## How it works

Images are drawn onto a `<canvas>` using the new size and crop area, then exported with `canvas.toBlob()`. ZIP files are created by a custom `zip.js`. No build step: just HTML, CSS and JavaScript.

```bash
python3 -m http.server 8000
```

## License

MIT © Phạm Quốc Hoàng

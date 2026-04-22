/**
 * Komprimiert ein Bild clientseitig via Canvas API.
 * - Maximale längere Seite: 1200px
 * - Qualität: 0.75 (JPEG)
 * - Versucht max 500KB zu erreichen, sonst stufenweise weiter komprimieren.
 */
export async function compressImage(
  file: File,
  opts: { maxSize?: number; quality?: number; maxBytes?: number } = {},
): Promise<Blob> {
  const maxSize = opts.maxSize ?? 1200;
  const initialQuality = opts.quality ?? 0.75;
  const maxBytes = opts.maxBytes ?? 500 * 1024;

  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  let { width, height } = img;
  if (width > height && width > maxSize) {
    height = Math.round((height * maxSize) / width);
    width = maxSize;
  } else if (height >= width && height > maxSize) {
    width = Math.round((width * maxSize) / height);
    height = maxSize;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, width, height);

  let quality = initialQuality;
  let blob = await canvasToBlob(canvas, quality);
  // Stufenweise weiter komprimieren falls noch zu groß
  while (blob.size > maxBytes && quality > 0.4) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, quality);
  }
  return blob;
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      quality,
    );
  });
}
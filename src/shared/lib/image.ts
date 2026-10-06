/**
 * Center-crops an image file to the `width`×`height` ratio and returns a JPEG data URL.
 * Small images are not upscaled. Runs in the browser (canvas).
 */
export const cropImageFile = (file: File, width: number, height: number, quality = 0.82): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Choisissez une image (JPG, PNG ou WebP).'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const ratio = width / height;
      let sw = img.naturalWidth;
      let sh = img.naturalHeight;
      if (sw / sh > ratio) sw = sh * ratio;
      else sh = sw / ratio;
      const scale = Math.min(1, sw / width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d');
      URL.revokeObjectURL(url);
      if (!ctx) {
        reject(new Error('Votre navigateur ne peut pas préparer cette image.'));
        return;
      }
      ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image illisible.'));
    };
    img.src = url;
  });

/**
 * A photo made light enough to send (identity documents): longest side at most `maxSide`, JPEG
 * quality lowered until it weighs under `maxBytes`. Returns a data URL.
 */
export const shrinkImageFile = (file: File, maxSide = 1600, maxBytes = 700_000): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Choisissez une photo (JPG, PNG ou WebP).'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Votre navigateur ne peut pas préparer cette photo.'));
        return;
      }
      let side = maxSide;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        for (const quality of [0.85, 0.75, 0.65]) {
          const data = canvas.toDataURL('image/jpeg', quality);
          if ((data.length - data.indexOf(',') - 1) * 0.75 <= maxBytes) {
            resolve(data);
            return;
          }
        }
        side = Math.round(side * 0.8);
      }
      reject(new Error('Photo trop lourde : reprenez-la en plus petit.'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Photo illisible.'));
    };
    img.src = url;
  });

/** Image types accepted for photos, read from the first bytes (the file name and its declared type can lie). */
export const IMAGE_TYPES = { 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WebP' } as const;

export async function sniffImageType(file: File): Promise<keyof typeof IMAGE_TYPES | null> {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

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

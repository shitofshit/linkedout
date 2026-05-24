const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.85;

export type PreparedImage = {
  mimeType: string;
  data: string;
};

export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    return { mimeType: file.type || 'image/jpeg', data: await fileToBase64(file) };
  }

  const { width, height } = bitmap;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return { mimeType: file.type || 'image/jpeg', data: await fileToBase64(file) };
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) {
    return { mimeType: file.type || 'image/jpeg', data: await fileToBase64(file) };
  }

  return { mimeType: 'image/jpeg', data: await blobToBase64(blob) };
}

function fileToBase64(file: File): Promise<string> {
  return blobToBase64(file);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('FileReader produced non-string result'));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

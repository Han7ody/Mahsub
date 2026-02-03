/**
 * Image compression utilities for avatars
 * Compresses images client-side before upload to reduce file size and load times
 */

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: 'image/jpeg' | 'image/webp';
}

/**
 * Compress an image file to reduce size
 * @param file - Original image file
 * @param options - Compression options
 * @returns Compressed file
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxWidth = 400,
    maxHeight = 400,
    quality = 0.85,
    mimeType = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw with white background (for transparency)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          // Create new file with compressed data
          const ext = mimeType === 'image/webp' ? 'webp' : 'jpg';
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, `.${ext}`),
            { type: mimeType }
          );

          resolve(compressedFile);
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Compress avatar image with optimal settings
 * 400x400px, 85% quality JPEG - good balance of quality and size
 */
export async function compressAvatar(file: File): Promise<File> {
  // Skip if already small enough (< 100KB)
  if (file.size < 100 * 1024) {
    return file;
  }

  return compressImage(file, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.85,
    mimeType: 'image/jpeg',
  });
}

/**
 * Compress receipt image with optimal settings
 * Receipts need higher resolution than avatars for readability
 * 1200px max width, 80% quality JPEG
 * Only compresses if file is larger than threshold (500KB)
 */
export async function compressReceipt(file: File, sizeThreshold: number = 500 * 1024): Promise<File> {
  // Skip if already small enough
  if (file.size < sizeThreshold) {
    return file;
  }

  return compressImage(file, {
    maxWidth: 1200,
    maxHeight: 1600,
    quality: 0.80,
    mimeType: 'image/jpeg',
  });
}

import imageCompression from 'browser-image-compression';

/**
 * Compress an image file before uploading to server
 * @param file - The file to compress
 * @returns Compressed file or original file if not an image
 */
export async function compressImage(file: File): Promise<File> {
  // Only compress images, return PDFs and other files unchanged
  if (!file.type.startsWith('image/')) {
    return file;
  }

  try {
    const options = {
      maxSizeMB: 0.8, // Target size under 800KB
      maxWidthOrHeight: 1600, // Maintain HD quality for screenshots
      useWebWorker: true,
    };

    const compressedFile = await imageCompression(file, options);
    
    // Preserve original filename
    return new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Image compression failed:', error);
    // Fallback to original file on error
    return file;
  }
}

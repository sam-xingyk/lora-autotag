
import { CropArea, ImageAsset } from './types';

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); 
    image.src = url;
  });

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropArea, // Expected in percentages 0-100
  rotation = 0,
  targetWidth?: number,
  targetHeight?: number
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // Calculate pixel values from percentages
  const pxX = (pixelCrop.x / 100) * image.naturalWidth;
  const pxY = (pixelCrop.y / 100) * image.naturalHeight;
  const pxWidth = (pixelCrop.width / 100) * image.naturalWidth;
  const pxHeight = (pixelCrop.height / 100) * image.naturalHeight;

  // Set canvas size to final output size
  // If no target size provided, default to the crop size
  canvas.width = targetWidth || pxWidth;
  canvas.height = targetHeight || pxHeight;

  // Fill background with black (standard for padding/extension)
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Calculate Destination Coordinates
  // Logic: Fix in center, extend outwards (padding) if target > source.
  // Also maintain aspect ratio if scaling down.
  
  let destW = canvas.width;
  let destH = canvas.height;
  let destX = 0;
  let destY = 0;

  if (targetWidth && targetHeight) {
    // Calculate scale to fit source into dest
    const scaleX = canvas.width / pxWidth;
    const scaleY = canvas.height / pxHeight;
    
    // Use the smaller scale to ensure it fits (contain strategy)
    let scale = Math.min(scaleX, scaleY);

    // CRITICAL CHANGE: If scale > 1, it means Source < Target (we have extra space).
    // The requirement is "Extend outwards", implying we should NOT upscale/stretch the image.
    // We strictly stick to 1:1 pixel mapping (scale = 1) in this case, adding padding.
    if (scale > 1) {
        scale = 1;
    }

    destW = pxWidth * scale;
    destH = pxHeight * scale;
    
    // Center the image
    destX = (canvas.width - destW) / 2;
    destY = (canvas.height - destH) / 2;
  }

  // Draw the cropped area onto the canvas
  ctx.drawImage(
    image,
    pxX,
    pxY,
    pxWidth,
    pxHeight,
    destX,
    destY,
    destW,
    destH
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg');
  });
}

export function getCenteredCrop(
  imgWidth: number, 
  imgHeight: number, 
  aspectRatio?: number, 
  targetW?: number, 
  targetH?: number
): CropArea {
  if (!aspectRatio) {
    return { x: 0, y: 0, width: 100, height: 100 };
  }

  // Logic: 
  // If target dimensions are provided (fixed pixel crop) AND the image is large enough,
  // we default to a 1:1 scaling crop (exact pixels).
  // If image is too small, or no target pixels provided, we maximize the crop area (resize behavior).

  if (targetW && targetH && imgWidth >= targetW && imgHeight >= targetH) {
    // Calculate percentages based on exact target pixels
    const widthPct = (targetW / imgWidth) * 100;
    const heightPct = (targetH / imgHeight) * 100;
    
    return {
      x: (100 - widthPct) / 2,
      y: (100 - heightPct) / 2,
      width: widthPct,
      height: heightPct
    };
  }

  // Fallback: Maximize crop area maintaining aspect ratio
  // Even if image is smaller than target, we select the full image (100%)
  // The padding logic is handled in getCroppedImg
  const imgRatio = imgWidth / imgHeight;
  let widthPct, heightPct;

  if (imgRatio > aspectRatio) {
    // Image is wider than target. Height is 100%, Width is scaled.
    heightPct = 100;
    // Target width in pixels = imgHeight * aspectRatio
    // Width Pct = (TargetWidth / imgWidth) * 100
    widthPct = ((imgHeight * aspectRatio) / imgWidth) * 100;
  } else {
    // Image is taller than target. Width is 100%, Height is scaled.
    widthPct = 100;
    // Target height in pixels = imgWidth / aspectRatio
    // Height Pct = (TargetHeight / imgHeight) * 100
    heightPct = ((imgWidth / aspectRatio) / imgHeight) * 100;
  }

  return {
    x: (100 - widthPct) / 2,
    y: (100 - heightPct) / 2,
    width: widthPct,
    height: heightPct
  };
}

export async function createZip(images: ImageAsset[]) {
  // @ts-ignore
  const zip = new window.JSZip();

  for (const img of images) {
    const blob = img.croppedBlob || await (await fetch(img.previewUrl)).blob();
    // Add image
    // Determine extension
    const ext = img.originalFile.name.split('.').pop() || 'jpg';
    const safeName = img.fileName.endsWith(`.${ext}`) ? img.fileName : `${img.fileName}.${ext}`;
    
    zip.file(safeName, blob);
    
    // Add text
    // STRICT REQUIREMENT: Use only the "Integrated" caption (img.caption)
    const txtName = safeName.replace(/\.[^/.]+$/, "") + ".txt";
    const content = img.caption ? img.caption.trim() : "";
    zip.file(txtName, content);
  }

  return zip.generateAsync({ type: "blob" });
}

export function saveZip(blob: Blob, filename: string) {
    // @ts-ignore
    window.saveAs(blob, filename);
}

/**
 * signatureCompressor — Compresses canvas signature to JPEG with size limits.
 * Target: < 800KB output for stable Safari submission.
 */

const MAX_WIDTH = 800;
const MAX_HEIGHT = 400;
const JPEG_QUALITY = 0.6;
const MAX_SIZE_KB = 1000;

/**
 * Compress a canvas element to a JPEG data URL.
 * If result > MAX_SIZE_KB, resizes canvas to 70% and re-exports.
 * 
 * @param {HTMLCanvasElement} canvas - The signature canvas
 * @returns {string} Compressed JPEG data URL
 */
export function compressSignatureCanvas(canvas) {
  if (!canvas) return null;

  // Step 1: Draw onto a size-limited offscreen canvas
  let { width, height } = getScaledDimensions(canvas.width, canvas.height);
  let offscreen = drawToOffscreen(canvas, width, height);
  let dataUrl = offscreen.toDataURL("image/jpeg", JPEG_QUALITY);

  // Step 2: If still too big, resize to 70% and retry
  const sizeKb = estimateDataUrlSizeKb(dataUrl);
  if (sizeKb > MAX_SIZE_KB) {
    const reducedWidth = Math.round(width * 0.7);
    const reducedHeight = Math.round(height * 0.7);
    offscreen = drawToOffscreen(canvas, reducedWidth, reducedHeight);
    dataUrl = offscreen.toDataURL("image/jpeg", JPEG_QUALITY);
    console.log(`[signatureCompressor] Resized from ${width}x${height} to ${reducedWidth}x${reducedHeight}, now ${estimateDataUrlSizeKb(dataUrl)} KB`);
  }

  return dataUrl;
}

function getScaledDimensions(srcWidth, srcHeight) {
  let width = srcWidth;
  let height = srcHeight;

  // Account for devicePixelRatio in canvas dimensions
  const dpr = window.devicePixelRatio || 1;
  const logicalW = srcWidth / dpr;
  const logicalH = srcHeight / dpr;

  width = logicalW;
  height = logicalH;

  if (width > MAX_WIDTH) {
    height = Math.round(height * (MAX_WIDTH / width));
    width = MAX_WIDTH;
  }
  if (height > MAX_HEIGHT) {
    width = Math.round(width * (MAX_HEIGHT / height));
    height = MAX_HEIGHT;
  }

  return { width, height };
}

function drawToOffscreen(sourceCanvas, targetWidth, targetHeight) {
  const offscreen = document.createElement("canvas");
  offscreen.width = targetWidth;
  offscreen.height = targetHeight;
  const ctx = offscreen.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
  return offscreen;
}

function estimateDataUrlSizeKb(dataUrl) {
  // data:image/jpeg;base64,XXXX — base64 is ~33% overhead
  const base64Part = dataUrl.split(",")[1] || "";
  return Math.round((base64Part.length * 3) / 4 / 1024);
}
'use client';

import { determineOrientation } from '@/lib/page-utils';
import type { PageOrientation } from '@/types/book';
import imageCompression from 'browser-image-compression';
import * as exifr from 'exifr';

const TARGET_LONG_EDGE = 2048;
const THUMB_LONG_EDGE = 480;
const NORMALIZED_DPI = 300;

const HEIC_MIME_TYPES = new Set(['image/heic', 'image/heif']);

const loadImage = (blob: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });

const rotateCanvas = (image: CanvasImageSource, width: number, height: number, orientation: number) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  switch (orientation) {
    case 2:
      canvas.width = width;
      canvas.height = height;
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      break;
    case 3:
      canvas.width = width;
      canvas.height = height;
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
      break;
    case 4:
      canvas.width = width;
      canvas.height = height;
      ctx.translate(0, height);
      ctx.scale(1, -1);
      break;
    case 5:
      canvas.width = height;
      canvas.height = width;
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6:
      canvas.width = height;
      canvas.height = width;
      ctx.translate(height, 0);
      ctx.rotate(0.5 * Math.PI);
      break;
    case 7:
      canvas.width = height;
      canvas.height = width;
      ctx.translate(height, 0);
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(-1, 1);
      break;
    case 8:
      canvas.width = height;
      canvas.height = width;
      ctx.translate(0, width);
      ctx.rotate(-0.5 * Math.PI);
      break;
    case 1:
    default:
      canvas.width = width;
      canvas.height = height;
  }

  ctx.drawImage(image, 0, 0);
  return canvas;
};

const scaleCanvas = (canvas: HTMLCanvasElement, targetLongEdge: number) => {
  const { width, height } = canvas;
  const longerSide = Math.max(width, height);
  if (longerSide <= targetLongEdge) {
    return canvas;
  }

  const scale = targetLongEdge / longerSide;
  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = Math.round(width * scale);
  scaledCanvas.height = Math.round(height * scale);
  const ctx = scaledCanvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
  return scaledCanvas;
};

const createThumbnail = (canvas: HTMLCanvasElement) => {
  const thumbnail = scaleCanvas(canvas, THUMB_LONG_EDGE);
  return thumbnail.toDataURL('image/jpeg', 0.75);
};

const convertHeicIfNeeded = async (file: File): Promise<Blob> => {
  if (!HEIC_MIME_TYPES.has(file.type) && !file.name.toLowerCase().endsWith('.heic')) {
    return file;
  }
  const heic2any = (await import('heic2any')).default;
  const converted = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.92,
  });
  if (Array.isArray(converted)) {
    return converted[0] as Blob;
  }
  return converted as Blob;
};

const compressIfNeeded = async (blob: Blob): Promise<Blob> => {
  if (blob.size < 4 * 1024 * 1024) {
    return blob;
  }
  const file = new File([blob], 'temp.jpg', { type: blob.type || 'image/jpeg' });
  const compressed = await imageCompression(file, {
    maxSizeMB: 3,
    maxWidthOrHeight: TARGET_LONG_EDGE,
    useWebWorker: true,
    preserveExif: false,
  });
  return compressed;
};

export interface NormalizedImage {
  width: number;
  height: number;
  orientation: PageOrientation;
  dataUrl: string;
  thumbnailUrl: string;
  dpi: number;
}

export const normalizeImageFile = async (file: File): Promise<NormalizedImage> => {
  const convertedBlob = await convertHeicIfNeeded(file);
  const processedBlob = await compressIfNeeded(convertedBlob);
  const buffer = await processedBlob.arrayBuffer();
  let orientationValue = 1;
  try {
    orientationValue = ((await (exifr as unknown as { orientation: (input: ArrayBuffer) => Promise<number | undefined> }).orientation(buffer)) ?? 1) as number;
  } catch {
    orientationValue = 1;
  }
  const image = await loadImage(processedBlob);
  const orientedCanvas = rotateCanvas(image, image.width, image.height, orientationValue);
  const scaledCanvas = scaleCanvas(orientedCanvas, TARGET_LONG_EDGE);
  const dataUrl = scaledCanvas.toDataURL('image/jpeg', 0.88);
  const thumbnailUrl = createThumbnail(scaledCanvas);
  const orientation = determineOrientation(scaledCanvas.width, scaledCanvas.height);

  return {
    width: scaledCanvas.width,
    height: scaledCanvas.height,
    orientation,
    dataUrl,
    thumbnailUrl,
    dpi: NORMALIZED_DPI,
  };
};

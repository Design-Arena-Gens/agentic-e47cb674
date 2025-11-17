'use client';

import { determineOrientation } from '@/lib/page-utils';

const TARGET_DPI = 192;
const BASE_DPI = 72;
const QUALITY = 0.88;

let pdfjs: typeof import('pdfjs-dist/legacy/build/pdf') | null = null;

const loadPdfJs = async () => {
  if (pdfjs) return pdfjs;
  const pdfModule = await import('pdfjs-dist/legacy/build/pdf');
  pdfModule.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.js';
  pdfjs = pdfModule;
  return pdfModule;
};

export interface PdfPageImage {
  dataUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}

export const renderPdfToImages = async (file: File): Promise<PdfPageImage[]> => {
  const { getDocument } = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;
  const result: PdfPageImage[] = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const scale = TARGET_DPI / BASE_DPI;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas not supported');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderTask = page.render({ canvasContext: context, viewport } as Parameters<typeof page.render>[0]);
    await renderTask.promise;
    const thumbnailScale = Math.min(1, 480 / Math.max(canvas.width, canvas.height));
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = Math.round(canvas.width * thumbnailScale);
    thumbCanvas.height = Math.round(canvas.height * thumbnailScale);
    const thumbCtx = thumbCanvas.getContext('2d');
    if (!thumbCtx) throw new Error('Canvas not supported');
    thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);

    result.push({
      dataUrl: canvas.toDataURL('image/jpeg', QUALITY),
      thumbnailUrl: thumbCanvas.toDataURL('image/jpeg', 0.75),
      width: canvas.width,
      height: canvas.height,
    });
  }

  return result;
};

export const detectOrientationFromDimensions = (width: number, height: number) =>
  determineOrientation(width, height);

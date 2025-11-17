'use client';

let tesseract: typeof import('tesseract.js') | null = null;

const loadTesseract = async () => {
  if (tesseract) return tesseract;
  tesseract = await import('tesseract.js');
  return tesseract;
};

export const runOcr = async (dataUrl: string): Promise<string | undefined> => {
  const { recognize } = await loadTesseract();
  try {
    const result = (await recognize(dataUrl, 'eng', { logger: () => undefined })) as {
      data?: { text?: string };
    };
    const text = result?.data?.text?.trim();
    return text && text.length > 0 ? text : undefined;
  } catch (error) {
    console.error('OCR failed', error);
    return undefined;
  }
};

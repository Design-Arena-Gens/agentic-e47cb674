'use client';

import JSZip from 'jszip';

const ZIP_MIME_TYPES = new Set([
  'application/zip',
  'application/x-zip-compressed',
]);

const PDF_EXTENSIONS = new Set(['.pdf']);

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.heic']);

export const isZipFile = (file: File): boolean =>
  ZIP_MIME_TYPES.has(file.type) || file.name.toLowerCase().endsWith('.zip');

export const isPdfFile = (file: File): boolean =>
  file.type === 'application/pdf' || hasExtension(file.name, PDF_EXTENSIONS);

export const isImageFile = (file: File): boolean =>
  file.type.startsWith('image/') || hasExtension(file.name, IMAGE_EXTENSIONS);

const hasExtension = (name: string, extensions: Set<string>): boolean => {
  const lower = name.toLowerCase();
  for (const ext of extensions) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
};

const guessMimeFromName = (name: string): string => {
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.gif')) return 'image/gif';
  if (name.endsWith('.bmp')) return 'image/bmp';
  if (name.endsWith('.tif') || name.endsWith('.tiff')) return 'image/tiff';
  if (name.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
};

export const expandFiles = async (files: File[]): Promise<File[]> => {
  const expanded: File[] = [];

  for (const file of files) {
    if (isZipFile(file)) {
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const innerFiles = Object.values(zip.files)
        .filter((entry) => !entry.dir)
        .sort((a, b) => a.name.localeCompare(b.name));

      for (const entry of innerFiles) {
        const blob = await entry.async('blob');
        const pathParts = entry.name.split('/');
        const baseName = pathParts[pathParts.length - 1] ?? entry.name;
        expanded.push(
          new File([blob], baseName, {
            type: blob.type || guessMimeFromName(baseName.toLowerCase()),
          }),
        );
      }
    } else {
      expanded.push(file);
    }
  }

  return expanded.sort((a, b) => a.name.localeCompare(b.name));
};

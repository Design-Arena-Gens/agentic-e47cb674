export type PageOrientation = 'portrait' | 'landscape' | 'square';

export interface LocalBookPage {
  id: string;
  index: number;
  name: string;
  width: number;
  height: number;
  dpi: number;
  orientation: PageOrientation;
  imageData: string;
  thumbnailData: string;
  ocrText?: string;
}

export interface BookMetadata {
  id: string;
  title: string;
  createdAt: string;
  pageCount: number;
  dominantOrientation: PageOrientation;
  doublePageSpreads: Array<[number, number]>;
  shortUrl: string;
  slug: string;
  thumbnail: string;
}

export interface BookRecord extends BookMetadata {
  pages: LocalBookPage[];
}

export interface CreateBookPayload {
  title: string;
  pages: LocalBookPage[];
}

export interface CreateBookResponse {
  id: string;
  slug: string;
  shortUrl: string;
  qrPng: string;
  metadata: BookMetadata;
}

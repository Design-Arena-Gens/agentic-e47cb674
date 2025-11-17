import { promises as fs } from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { nanoid } from 'nanoid';
import { buildDoublePageSpreads, calculateDominantOrientation } from '@/lib/page-utils';
import type { BookMetadata, BookRecord, CreateBookPayload, CreateBookResponse } from '@/types/book';
import { list, put } from '@vercel/blob';

const DATA_DIR = path.join(process.cwd(), 'data', 'books');

const getBaseUrl = () => {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.BASE_URL ?? 'http://localhost:3000';
};

const usingBlobStorage = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const ensureDirectory = async () => {
  if (usingBlobStorage()) {
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
};

export const saveBook = async (payload: CreateBookPayload): Promise<CreateBookResponse> => {
  await ensureDirectory();
  const id = nanoid(12);
  const slug = nanoid(8);
  const createdAt = new Date().toISOString();

  const pageCount = payload.pages.length;
  const dominantOrientation = calculateDominantOrientation(payload.pages);
  const doublePageSpreads = buildDoublePageSpreads(payload.pages);

  const metadata: BookMetadata = {
    id,
    title: payload.title,
    createdAt,
    pageCount,
    dominantOrientation,
    doublePageSpreads,
    shortUrl: '',
    slug,
    thumbnail: payload.pages[0]?.thumbnailData ?? '',
  };

  const record: BookRecord = {
    ...metadata,
    shortUrl: '',
    pages: payload.pages,
  };

  const baseUrl = getBaseUrl();
  const shortUrl = `${baseUrl}/book/${slug}`;
  metadata.shortUrl = shortUrl;
  record.shortUrl = shortUrl;

  const qrPng = await QRCode.toDataURL(shortUrl, {
    width: 512,
    errorCorrectionLevel: 'H',
    margin: 1,
    color: {
      dark: '#111111',
      light: '#ffffffff',
    },
  });

  if (usingBlobStorage()) {
    await put(`books/${slug}.json`, JSON.stringify(record), {
      contentType: 'application/json',
      access: 'public',
      addRandomSuffix: false,
    });
  } else {
    const filePath = path.join(DATA_DIR, `${slug}.json`);
    await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf8');
  }

  return {
    id,
    slug,
    shortUrl,
    qrPng,
    metadata,
  };
};

export const readBook = async (slug: string): Promise<BookRecord | null> => {
  try {
    if (usingBlobStorage()) {
      const { blobs } = await list({
        prefix: `books/${slug}.json`,
        limit: 1,
      });
      const blob = blobs[0];
      if (!blob) return null;
      const response = await fetch(blob.downloadUrl ?? blob.url);
      if (!response.ok) {
        return null;
      }
      const data = (await response.json()) as BookRecord;
      return data;
    }
    const filePath = path.join(DATA_DIR, `${slug}.json`);
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as BookRecord;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

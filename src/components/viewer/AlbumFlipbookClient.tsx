'use client';

import BookViewer from '@/components/viewer/BookViewer';
import type { LocalBookPage } from '@/types/book';

interface AlbumFlipbookClientProps {
  pages: LocalBookPage[];
  initialPage?: number;
}

export const AlbumFlipbookClient = ({ pages, initialPage }: AlbumFlipbookClientProps) => (
  <BookViewer pages={pages} initialPage={initialPage} />
);

export default AlbumFlipbookClient;

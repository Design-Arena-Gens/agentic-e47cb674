import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readBook } from '@/lib/book-store';
import { formatDateTime } from '@/lib/utils';
import { AlbumFlipbookClient } from '@/components/viewer/AlbumFlipbookClient';

interface BookPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const book = await readBook(params.slug);
  if (!book) {
    return {
      title: 'Album not found',
    };
  }
  return {
    title: `${book.title} · Digital Album`,
    description: `Interactive digital album with ${book.pageCount} pages`,
    openGraph: {
      title: book.title,
      description: `View ${book.pageCount} pages · ${book.dominantOrientation}`,
      images: book.thumbnail ? [{ url: book.thumbnail }] : undefined,
    },
  };
}

export default async function BookPage({ params }: BookPageProps) {
  const book = await readBook(params.slug);
  if (!book) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-16 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 lg:flex-row">
        <div className="flex-1">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-200/80">Digital Album</p>
          <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">{book.title}</h1>
          <p className="mt-4 max-w-xl text-base text-slate-300">
            {book.pageCount} pages · {book.dominantOrientation} orientation · Crafted {formatDateTime(book.createdAt)}
          </p>
          <div className="mt-6 space-y-3 rounded-3xl bg-white/5 p-6 text-sm text-slate-200 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <span>Book ID</span>
              <span className="font-mono text-xs uppercase tracking-wide text-blue-200">{book.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Spreads</span>
              <span>{book.doublePageSpreads.length}</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wide text-white/50">Share URL</span>
              <a href={book.shortUrl} className="mt-1 inline-flex gap-2 text-blue-200 hover:text-blue-100" target="_blank" rel="noreferrer">
                {book.shortUrl}
              </a>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <AlbumFlipbookClient pages={book.pages} />
        </div>
      </div>
    </div>
  );
}

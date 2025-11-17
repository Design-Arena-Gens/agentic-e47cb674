'use client';

import { useCallback, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { nanoid } from 'nanoid';
import { Expand, Loader2, UploadCloud } from 'lucide-react';
import Image from 'next/image';
import { BookViewer } from '@/components/viewer/BookViewer';
import { expandFiles, isImageFile, isPdfFile } from '@/lib/file-utils';
import { normalizeImageFile } from '@/lib/image-utils';
import { renderPdfToImages } from '@/lib/pdf-utils';
import { runOcr } from '@/lib/ocr';
import { buildDoublePageSpreads, calculateDominantOrientation } from '@/lib/page-utils';
import type { CreateBookResponse, LocalBookPage } from '@/types/book';
import { cn, formatDateTime } from '@/lib/utils';

interface StudioStatus {
  label: string;
  sublabel?: string;
  tone?: 'default' | 'warning' | 'success' | 'error';
}

export const BookStudio = () => {
  const [pages, setPages] = useState<LocalBookPage[]>([]);
  const [title, setTitle] = useState('Untitled Album');
  const [status, setStatus] = useState<StudioStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [includeOcr, setIncludeOcr] = useState(false);
  const [result, setResult] = useState<CreateBookResponse | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;
      setStatus({ label: 'Analyzing uploads…', sublabel: 'Expanding archives, sorting pages' });
      setIsProcessing(true);
      setResult(null);

      try {
        const expanded = await expandFiles(acceptedFiles);
        if (!expanded.length) {
          setStatus({ label: 'No supported assets detected', tone: 'warning' });
          return;
        }

        const newPages: LocalBookPage[] = [];
        let runningIndex = 0;

        for (const file of expanded) {
          if (isPdfFile(file)) {
            setStatus({ label: `Rendering ${file.name}`, sublabel: 'Extracting high-DPI page canvases' });
            const pdfPages = await renderPdfToImages(file);
            for (const [pageIndex, pdfPage] of pdfPages.entries()) {
              const ocrText = includeOcr ? await runOcr(pdfPage.dataUrl) : undefined;
              newPages.push({
                id: nanoid(),
                index: runningIndex,
                name: `${file.name.replace(/\.pdf$/i, '')}-${pageIndex + 1}`,
                width: pdfPage.width,
                height: pdfPage.height,
                dpi: 300,
                orientation: pdfPage.width > pdfPage.height ? 'landscape' : pdfPage.width === pdfPage.height ? 'square' : 'portrait',
                imageData: pdfPage.dataUrl,
                thumbnailData: pdfPage.thumbnailUrl,
                ocrText,
              });
              runningIndex += 1;
            }
          } else if (isImageFile(file)) {
            setStatus({ label: `Optimizing ${file.name}`, sublabel: 'Normalizing orientation & DPI' });
            const normalized = await normalizeImageFile(file);
            const ocrText = includeOcr ? await runOcr(normalized.dataUrl) : undefined;
            newPages.push({
              id: nanoid(),
              index: runningIndex,
              name: file.name,
              width: normalized.width,
              height: normalized.height,
              dpi: normalized.dpi,
              orientation: normalized.orientation,
              imageData: normalized.dataUrl,
              thumbnailData: normalized.thumbnailUrl,
              ocrText,
            });
            runningIndex += 1;
          } else {
            console.warn('Skipping unsupported file', file.name);
          }
        }

        if (!newPages.length) {
          setStatus({ label: 'Finished', sublabel: 'No convertible pages detected', tone: 'warning' });
          return;
        }

        setPages(newPages.map((page, index) => ({ ...page, index })));
        setStatus({ label: 'Ready', sublabel: `Loaded ${newPages.length} pages`, tone: 'success' });
      } catch (error) {
        console.error(error);
        setStatus({ label: 'Processing failed', sublabel: 'Please check your files and try again', tone: 'error' });
      } finally {
        setIsProcessing(false);
      }
    },
    [includeOcr],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/zip': ['.zip'],
      'image/*': ['.jpg', '.jpeg', '.png', '.heic', '.webp', '.gif', '.tif', '.tiff', '.bmp'],
    },
    maxSize: 1024 * 1024 * 100,
    multiple: true,
  });

  const stats = useMemo(() => {
    if (!pages.length) {
      return null;
    }
    const pageCount = pages.length;
    const dominantOrientation = calculateDominantOrientation(pages);
    const doublePageSpreads = buildDoublePageSpreads(pages);
    return {
      pageCount,
      dominantOrientation,
      doublePageSpreads,
    };
  }, [pages]);

  const handleCreate = useCallback(async () => {
    if (!pages.length) return;
    setIsGenerating(true);
    setStatus({ label: 'Publishing book…', sublabel: 'Finalizing metadata & QR code' });

    try {
      const payload = {
        title: title.trim() || 'Untitled Album',
        pages: pages.map((page, index) => ({
          ...page,
          index,
        })),
      };

      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Failed to create book: ${res.statusText}`);
      }

      const json = (await res.json()) as CreateBookResponse;
      setResult(json);
      setStatus({ label: 'Deployment ready', sublabel: 'Your QR code is live', tone: 'success' });
    } catch (error) {
      console.error(error);
      setStatus({ label: 'Unable to publish', sublabel: 'See console for details', tone: 'error' });
    } finally {
      setIsGenerating(false);
    }
  }, [pages, title]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
      <div className="space-y-6">
        <div
          {...getRootProps()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white/70 p-10 text-center shadow-sm transition hover:border-zinc-400 hover:bg-white',
            isDragActive && 'border-blue-400 bg-blue-50/80',
            isProcessing && 'cursor-progress opacity-70',
          )}
        >
          <input {...getInputProps()} />
          <UploadCloud className="mb-4 h-12 w-12 text-zinc-600" />
          <p className="text-lg font-semibold text-zinc-800">Drop images, PDFs, or ZIPs</p>
          <p className="mt-1 text-sm text-zinc-500">High-DPI page generation · Automatic ordering · HEIC &amp; PDF support</p>
          <p className="mt-6 text-xs uppercase tracking-wide text-zinc-400">
            {isProcessing ? 'Processing…' : 'Click to browse or drag files here'}
          </p>
        </div>

        <div className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex flex-1 flex-col text-sm font-medium text-zinc-600">
              Album title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="September Wedding 2024"
                className="mt-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200/60"
              />
            </label>
            <label className="inline-flex select-none items-center gap-2 text-sm font-medium text-zinc-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300 text-blue-500 focus:ring-blue-500"
                checked={includeOcr}
                onChange={(event) => setIncludeOcr(event.target.checked)}
              />
              Enable OCR
            </label>
          </div>

          {stats && (
            <div className="mt-6 grid gap-4 rounded-2xl bg-zinc-50 px-5 py-4 text-sm text-zinc-600 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">Pages</p>
                <p className="mt-1 text-xl font-semibold text-zinc-900">{stats.pageCount}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">Orientation</p>
                <p className="mt-1 text-xl font-semibold capitalize text-zinc-900">{stats.dominantOrientation}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">Spreads</p>
                <p className="mt-1 text-xl font-semibold text-zinc-900">{stats.doublePageSpreads.length}</p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleCreate}
            disabled={!pages.length || isGenerating}
            className={cn(
              'mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-600 hover:to-indigo-600 focus:outline-none focus:ring-4 focus:ring-blue-300/40 disabled:cursor-not-allowed disabled:from-zinc-200 disabled:to-zinc-200 disabled:text-zinc-500 disabled:shadow-none',
            )}
          >
            {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Expand className="h-5 w-5" />}
            {isGenerating ? 'Publishing…' : 'Generate live book'}
          </button>

          {status && (
            <div
              className={cn(
                'mt-4 rounded-2xl px-4 py-3 text-sm shadow-inner',
                status.tone === 'error' && 'bg-red-50 text-red-600',
                status.tone === 'success' && 'bg-emerald-50 text-emerald-600',
                status.tone === 'warning' && 'bg-amber-50 text-amber-600',
                (!status.tone || status.tone === 'default') && 'bg-zinc-100 text-zinc-600',
              )}
            >
              <p className="font-medium">{status.label}</p>
              {status.sublabel && <p className="text-xs text-inherit/80">{status.sublabel}</p>}
            </div>
          )}
        </div>

        {result && (
          <div className="rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5">
            <h3 className="text-lg font-semibold text-zinc-900">Ready to share</h3>
            <p className="mt-1 text-sm text-zinc-500">Scan the QR code or open the short link to launch the mobile book.</p>
            <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-inner ring-1 ring-black/5">
                <Image src={result.qrPng} alt="Book QR code" width={180} height={180} className="h-44 w-44 object-contain" unoptimized />
              </div>
              <div className="space-y-3 text-sm text-zinc-600">
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Short URL</p>
                  <a
                    href={result.shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex max-w-full items-center gap-2 break-all font-semibold text-blue-600 hover:underline"
                  >
                    {result.shortUrl}
                  </a>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Book ID</p>
                  <p className="mt-1 font-mono text-sm text-zinc-800">{result.id}</p>
                </div>
                {result.metadata?.createdAt && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Created</p>
                    <p className="mt-1">{formatDateTime(result.metadata.createdAt)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded-[35px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-[1px] shadow-2xl">
          <div className="rounded-[34px] bg-slate-950/70 p-6">
            <BookViewer pages={pages} />
          </div>
        </div>

        <div className="space-y-3 rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-black/5">
          <h3 className="text-base font-semibold text-zinc-900">Page stack</h3>
          <div className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
            {pages.map((page) => (
              <div
                key={page.id}
                className="flex items-center gap-4 rounded-2xl border border-transparent bg-zinc-50 p-3 transition hover:border-blue-200 hover:bg-white"
              >
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl shadow-sm">
                  <Image src={page.thumbnailData} alt="" fill className="object-cover" unoptimized sizes="64px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-800">
                    {page.index + 1}. {page.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {page.orientation} · {page.width}×{page.height}px · {page.dpi}dpi
                  </p>
                  {page.ocrText && <p className="mt-1 line-clamp-2 text-xs text-blue-600">{page.ocrText}</p>}
                </div>
                <span className="rounded-full bg-zinc-200 px-2 py-[2px] text-xs font-medium text-zinc-600">
                  #{page.index + 1}
                </span>
              </div>
            ))}
            {!pages.length && (
              <p className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-500">
                Upload files to populate the page stack. Pages are automatically arranged alphabetically; rename files for custom sequencing.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookStudio;

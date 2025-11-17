'use client';

import { cn } from '@/lib/utils';
import type { LocalBookPage } from '@/types/book';
import HTMLFlipBook from 'react-pageflip';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

interface BookViewerProps {
  pages: LocalBookPage[];
  className?: string;
  initialPage?: number;
}

const MOBILE_BREAKPOINT = 768;

export const BookViewer = ({ pages, className, initialPage = 0 }: BookViewerProps) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const { width, height } = useMemo(() => {
    if (isMobile) {
      return { width: 280, height: 380 };
    }
    const firstPage = pages[0];
    if (!firstPage) {
      return { width: 420, height: 560 };
    }
    const ratio = firstPage.height / firstPage.width;
    const baseWidth = 420;
    return {
      width: baseWidth,
      height: Math.round(baseWidth * ratio),
    };
  }, [isMobile, pages]);

  if (!pages.length) {
    return (
      <div className={cn('flex h-full w-full items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white/40 p-12 text-sm text-zinc-500 shadow-inner', className)}>
        Ready to preview your album
      </div>
    );
  }

  return (
    <div className={cn('relative w-full', className)}>
      <div className="pointer-events-none absolute inset-0 z-20 rounded-[30px] shadow-[inset_0px_0px_80px_rgba(0,0,0,0.35)]" />
      <div className="relative z-10 mx-auto max-w-full overflow-hidden rounded-[30px] bg-neutral-900/80 p-6 shadow-2xl">
        <HTMLFlipBook
          style={{}}
          drawShadow
          flippingTime={1200}
          usePortrait={isMobile}
          showPageCorners
          clickEventForward
          startZIndex={10}
          autoSize
          useMouseEvents
          swipeDistance={30}
          disableFlipByClick={false}
          width={width}
          height={height}
          size="stretch"
          minWidth={280}
          maxWidth={960}
          minHeight={360}
          maxHeight={900}
          maxShadowOpacity={0.5}
          showCover
          mobileScrollSupport
          className="flex justify-center"
          startPage={initialPage}
        >
          {pages.map((page) => (
            <div
              key={page.id}
              className="relative flex h-full w-full items-center justify-center bg-stone-100"
              data-density="hard"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-black/15 via-transparent to-black/25 opacity-70 mix-blend-multiply" />
              <Image
                src={page.imageData}
                alt={`Page ${page.index + 1}`}
                className="relative z-10 h-full w-full object-cover"
                draggable={false}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                unoptimized
              />
            </div>
          ))}
        </HTMLFlipBook>
      </div>
    </div>
  );
};

export default BookViewer;

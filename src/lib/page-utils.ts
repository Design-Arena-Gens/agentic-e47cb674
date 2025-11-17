import type { LocalBookPage, PageOrientation } from '@/types/book';

export const determineOrientation = (width: number, height: number): PageOrientation => {
  if (width === height) return 'square';
  return width > height ? 'landscape' : 'portrait';
};

export const calculateDominantOrientation = (pages: LocalBookPage[]): PageOrientation => {
  const counts: Record<PageOrientation, number> = {
    portrait: 0,
    landscape: 0,
    square: 0,
  };

  for (const page of pages) {
    counts[page.orientation] += 1;
  }

  return (Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] as PageOrientation) ?? 'portrait';
};

export const buildDoublePageSpreads = (pages: LocalBookPage[]): Array<[number, number]> => {
  const spreads: Array<[number, number]> = [];
  for (let i = 0; i < pages.length - 1; i += 2) {
    spreads.push([pages[i]!.index, pages[i + 1]!.index]);
  }
  return spreads;
};

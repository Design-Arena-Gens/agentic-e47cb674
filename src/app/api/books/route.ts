import { NextResponse } from 'next/server';
import { saveBook } from '@/lib/book-store';
import type { CreateBookPayload } from '@/types/book';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CreateBookPayload;
    if (!payload.pages?.length) {
      return NextResponse.json({ error: 'At least one page is required' }, { status: 400 });
    }
    const response = await saveBook(payload);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to create book', error);
    return NextResponse.json({ error: 'Failed to create book' }, { status: 500 });
  }
}

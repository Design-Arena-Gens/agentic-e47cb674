import { BookStudio } from '@/components/studio/BookStudio';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 pb-20">
      <div className="mx-auto w-full max-w-6xl px-6 pt-16 lg:px-10">
        <header className="mx-auto max-w-4xl text-center lg:text-left">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-500">Fluxfolio</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Transform images & PDFs into lifelike, mobile-ready books
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Upload photos, PDFs, or ZIP archives to generate a cinematic page-flip album in seconds. Each book gets a QR code and short link that opens instantly on any mobile browser.
          </p>
        </header>
        <section className="mt-14">
          <BookStudio />
        </section>
      </div>
    </main>
  );
}

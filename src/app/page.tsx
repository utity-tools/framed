export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <p className="text-sm font-medium tracking-widest text-zinc-600 uppercase dark:text-zinc-400">
        Framed
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-balance">
        Tap the label. Meet the artwork.
      </h1>
      <p className="text-lg leading-8 text-zinc-700 dark:text-zinc-300">
        NFC wall labels for art galleries. Visitors tap a card with their phone and read about the
        artwork in their own language: its story, the artist and, when the gallery allows it, the
        price.
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Coming soon.</p>
    </main>
  );
}

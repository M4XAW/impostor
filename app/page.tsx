import { GameEntry } from "@/components/game-entry";
import { getValidRoomCode } from "@/lib/room-code";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { join } = await searchParams;
  const joinCode = getValidRoomCode(join);

  return (
    <main className="relative isolate flex min-h-screen overflow-hidden bg-[#12151f] px-5 py-6 text-slate-100 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_18%,rgba(249,115,22,0.18),transparent_28%),radial-gradient(circle_at_84%_83%,rgba(168,85,247,0.18),transparent_30%)]" />
      <div className="mx-auto flex w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <a className="flex items-center gap-3" href="#accueil" aria-label="Impostor, accueil">
            <span className="grid size-10 place-items-center rounded-xl bg-orange-500 text-xl shadow-lg shadow-orange-950/40" aria-hidden="true">
              ◈
            </span>
            <span className="text-xl font-black tracking-tight">IMPOSTOR</span>
          </a>
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300">
            Jeu entre amis
          </span>
        </header>

        <section id="accueil" className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-sm font-semibold text-orange-300">
              De 3 à 6 joueurs
            </p>
            <h1 className="text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Trouve l&apos;imposteur.
              <span className="block bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent"> Protège ton secret.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
              Un mot commun, un intrus, et juste assez de bluff pour semer le doute. Créez une partie et lancez-vous en quelques secondes.
            </p>

            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4">
                <strong className="block text-xl text-white">3–6</strong>
                <span className="text-slate-400">joueurs</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4">
                <strong className="block text-xl text-white">5 min</strong>
                <span className="text-slate-400">par manche</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4">
                <strong className="block text-xl text-white">100 %</strong>
                <span className="text-slate-400">entre amis</span>
              </div>
            </div>
          </div>

          <GameEntry key={joinCode ?? "game-entry"} joinCode={joinCode} />
        </section>

        <footer className="flex flex-col gap-2 border-t border-white/10 pt-5 text-sm text-slate-500 sm:flex-row sm:justify-between">
          <p>Pas de compte, pas de téléchargement.</p>
          <p>Un bon mensonge vaut parfois mieux qu&apos;un bon alibi.</p>
        </footer>
      </div>
    </main>
  );
}

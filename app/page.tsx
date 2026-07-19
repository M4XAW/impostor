import { GameEntry } from "@/components/game-entry";
import { getValidRoomCode } from "@/lib/room-code";
import { RiSpyFill } from "@remixicon/react"
import Link from "next/link";

export default async function Home({ searchParams }: PageProps<"/">) {
    const { join } = await searchParams;
    const joinCode = getValidRoomCode(join);

    return (
        <main className="relative flex min-h-screen overflow-hidden px-5 py-6 sm:px-8 lg:px-12">
            <div className="mx-auto flex w-full max-w-6xl flex-col">
                <header className="flex items-center justify-between">
                    <Link className="flex items-center gap-3" href="/" aria-label="Impostor, accueil">
                        <span className="grid size-10 place-items-center rounded-xl bg-orange-500 text-xl shadow-lg shadow-orange-950/40" aria-hidden="true">
                            <RiSpyFill />
                        </span>
                        <span className="text-xl font-black tracking-tight">IMPOSTOR</span>
                    </Link>
                </header>
                <section className="grid place-items-center flex-1">
                    <GameEntry key={joinCode ?? "game-entry"} joinCode={joinCode} />
                </section>
            </div>
        </main>
    );
}

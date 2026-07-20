import type { GameSnapshot } from "@/types/game";

interface RoundGridProps {
    game: GameSnapshot;
    connectedPlayerPublicIds: string[] | null;
}

export function RoundGrid({ game, connectedPlayerPublicIds }: RoundGridProps) {
    const rowMap = new Map<string, { wordNumber: number; roundNumber: number }>();
    game.clues.forEach((clue) => {
        rowMap.set(`${clue.wordNumber}-${clue.roundNumber}`, {
            wordNumber: clue.wordNumber,
            roundNumber: clue.roundNumber,
        });
    });

    if (game.turn) {
        rowMap.set(`${game.turn.wordNumber}-${game.turn.roundNumber}`, {
            wordNumber: game.turn.wordNumber,
            roundNumber: game.turn.roundNumber,
        });
    }

    const rounds = [...rowMap.values()].sort(
        (first, second) =>
            first.wordNumber - second.wordNumber ||
            first.roundNumber - second.roundNumber,
    );

    return (
        <section className="mt-7 overflow-x-auto">
            <div className="grid min-w-2xl grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
                {game.players.map((player) => (
                    <article
                        key={player.publicId}
                        className={`overflow-hidden border bg-white/3 text-center transition-opacity ${connectedPlayerPublicIds?.includes(player.publicId) === false ? "opacity-40" : ""}`}
                    >
                        <div
                            className="grid h-14 place-items-center border-b text-3xl"
                            aria-hidden="true"
                        >
                            ◉
                        </div>

                        <div className="border-b px-3 py-2 font-semibold">
                            {player.name}
                            {player.isSelf ? " (toi)" : ""}
                            {connectedPlayerPublicIds?.includes(player.publicId) === false && (
                                <span className="sr-only"> — hors ligne</span>
                            )}
                        </div>

                        {rounds.map((round) => {
                            const clue = game.clues.find(
                                (item) =>
                                    item.playerPublicId === player.publicId &&
                                    item.wordNumber === round.wordNumber &&
                                    item.roundNumber === round.roundNumber,
                            );

                            const isActive =
                                game.turn?.currentPlayerPublicId === player.publicId &&
                                game.turn.wordNumber === round.wordNumber &&
                                game.turn.roundNumber === round.roundNumber;

                            return (
                                <div
                                    key={`${round.wordNumber}-${round.roundNumber}`}
                                    className={`min-h-12 border-b px-3 py-3 last:border-b-0 ${isActive ? "bg-orange-400/10 text-orange-300" : ""}`}
                                >
                                    {clue?.content ?? (isActive ? "À jouer" : "—")}
                                </div>
                            );
                        })}
                    </article>
                ))}
            </div>
        </section>
    );
}

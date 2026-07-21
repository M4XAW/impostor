import type { GameSnapshot } from "@/types/game";
import { buildRoundRows } from "@/lib/round-rows";
import { AvatarCircle } from "pixelarticons/react/AvatarCircle";
import { Fragment } from "react";

interface RoundGridProps {
    game: GameSnapshot;
    connectedPlayerPublicIds: string[] | null;
}

export function RoundGrid({ game, connectedPlayerPublicIds }: RoundGridProps) {
    const showAllWords = game.phase === "RESULTS" && (
        game.endReason === "NOT_ENOUGH_PLAYERS" ||
        game.result?.wordNumber === game.settings.wordCount
    );
    const rounds = buildRoundRows({
        clues: game.clues,
        phase: game.phase,
        roundCount: game.settings.roundCount,
        showAllWords,
        turn: game.turn,
        resultWordNumber: game.result?.wordNumber,
    });

    return (
        <section className="mt-7 overflow-x-auto">
            <table className="w-full min-w-max border-separate border-spacing-0 text-left">
                <caption className="sr-only">Récapitulatif des mots saisis</caption>
                <thead>
                    <tr>
                        <th
                            scope="col"
                            className="min-w-28 border bg-muted/20 px-3 py-3 font-medium"
                        >
                            Tour
                        </th>
                        {game.players.map((player) => (
                            <th
                                key={player.publicId}
                                scope="col"
                                className={`min-w-36 border-y border-r bg-white/3 px-3 py-3 font-normal transition-opacity ${connectedPlayerPublicIds?.includes(player.publicId) === false ? "opacity-40" : ""}`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="flex items-center gap-2">
                                        <AvatarCircle />
                                        {player.name}
                                        {player.isSelf ? " (toi)" : ""}
                                    </span>
                                    {connectedPlayerPublicIds?.includes(player.publicId) === false && (
                                        <span className="text-sm text-muted-foreground">
                                            [DÉCONNECTÉ]
                                        </span>
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rounds.map((round, index) => (
                        <Fragment key={`${round.wordNumber}-${round.roundNumber}`}>
                            {showAllWords && rounds[index - 1]?.wordNumber !== round.wordNumber && (
                                <tr>
                                    <th
                                        colSpan={game.players.length + 1}
                                        className="border-x border-b bg-muted px-3 py-2 font-medium"
                                    >
                                        Manche {round.wordNumber}
                                    </th>
                                </tr>
                            )}
                            <tr>
                                <th
                                    scope="row"
                                    className="border-x border-b bg-muted/20 px-3 py-2 font-normal"
                                >
                                    <span className="block text-xs text-muted-foreground">
                                        Tour {round.roundNumber}
                                    </span>
                                </th>
                                {game.players.map((player) => {
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
                                        <td
                                            key={player.publicId}
                                            className={`min-w-36 border-r border-b px-3 py-3 transition-opacity ${isActive ? "bg-orange-400/10 text-orange-300" : ""} ${connectedPlayerPublicIds?.includes(player.publicId) === false ? "opacity-40" : ""}`}
                                        >
                                            {clue?.content ?? (
                                                isActive
                                                    ? player.isSelf
                                                        ? "À ton tour"
                                                        : "En train de jouer"
                                                    : "Aucun mot saisi"
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        </Fragment>
                    ))}
                </tbody>
            </table>
        </section>
    );
}

import type { GameSnapshot } from "@/types/game";

interface RoundGridProps { game: GameSnapshot; }

export function RoundGrid({ game }: RoundGridProps) {
  const rowMap = new Map<string, { wordNumber: number; roundNumber: number }>();
  game.clues.forEach((clue) => rowMap.set(`${clue.wordNumber}-${clue.roundNumber}`, { wordNumber: clue.wordNumber, roundNumber: clue.roundNumber }));
  if (game.turn) rowMap.set(`${game.turn.wordNumber}-${game.turn.roundNumber}`, { wordNumber: game.turn.wordNumber, roundNumber: game.turn.roundNumber });
  const rows = [...rowMap.values()].sort((first, second) => first.wordNumber - second.wordNumber || first.roundNumber - second.roundNumber);

  return <section className="mt-7"><h2 className="font-bold">Manches</h2><div className="mt-3 overflow-x-auto rounded-xl border border-white/10"><table className="min-w-full border-collapse text-left text-sm"><thead className="bg-white/5 text-slate-300"><tr><th className="min-w-24 border-b border-white/10 px-3 py-3 font-semibold">Manche</th>{game.players.map((player) => <th key={player.id} className="min-w-32 border-b border-l border-white/10 px-3 py-3 font-semibold">{player.name}{player.id === game.currentPlayer.id ? " (toi)" : ""}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={`${row.wordNumber}-${row.roundNumber}`}><th className="border-b border-white/10 px-3 py-3 font-medium text-slate-400">Mot {row.wordNumber}<br />Tour {row.roundNumber}</th>{game.players.map((player) => { const clue = game.clues.find((item) => item.playerId === player.id && item.wordNumber === row.wordNumber && item.roundNumber === row.roundNumber); const isActive = game.turn?.currentPlayerId === player.id && game.turn.wordNumber === row.wordNumber && game.turn.roundNumber === row.roundNumber; return <td key={player.id} className={`border-b border-l border-white/10 px-3 py-3 ${isActive ? "bg-orange-400/10" : ""}`}>{clue?.content ?? (isActive ? <span className="text-orange-300">À jouer</span> : <span className="text-slate-600">—</span>)}</td>; })}</tr>)}</tbody></table></div></section>;
}

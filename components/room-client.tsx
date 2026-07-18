"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { io } from "socket.io-client";
import type { GameSnapshot } from "@/types/game";

interface RoomClientProps { code: string; }

export function RoomClient({ code }: RoomClientProps) {
  const [game, setGame] = useState<GameSnapshot | null>(null);
  const [error, setError] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok || typeof payload !== "object" || payload === null || !("phase" in payload)) {
      setError(typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string" ? payload.error : "Impossible de charger la partie.");
      return;
    }
    setGame(payload as GameSnapshot);
    setError("");
  }, [code]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 2000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
    };
  }, [refresh]);

  useEffect(() => {
    const socket = io({ path: "/socket.io" });
    socket.emit("room:watch", code);
    socket.on("room:changed", () => void refresh());
    return () => {
      socket.disconnect();
    };
  }, [code, refresh]);

  async function play(action: "start" | "beginVote" | "vote", targetId?: string) {
    const response = await fetch(`/api/rooms/${code}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...(targetId ? { targetId } : {}) }) });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) setError(typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string" ? payload.error : "Action impossible.");
    await refresh();
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(`${window.location.origin}/?join=${code}`);
    setIsCopied(true);
  }

  if (error && !game) return <main className="grid min-h-screen place-items-center bg-[#12151f] p-6 text-center text-white"><div><p className="text-lg">{error}</p><Link className="mt-5 inline-block text-orange-300 underline" href="/">Retour à l’accueil</Link></div></main>;
  if (!game) return <main className="grid min-h-screen place-items-center bg-[#12151f] text-slate-300">Chargement de la partie…</main>;

  const isHost = game.currentPlayer.isHost;
  return <main className="min-h-screen bg-[#12151f] px-5 py-8 text-slate-100"><div className="mx-auto max-w-3xl"><header className="flex items-center justify-between"><Link href="/" className="font-black tracking-tight">IMPOSTOR</Link><span className="rounded-full bg-white/5 px-3 py-1 font-mono text-sm">{game.code}</span></header><section className="mt-10 rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8"><p className="text-sm font-bold uppercase tracking-widest text-orange-300">{game.phase === "LOBBY" ? "Salon" : game.phase === "DISCUSSION" ? "Discussion" : game.phase === "VOTING" ? "Vote" : "Résultats"}</p><h1 className="mt-3 text-3xl font-black">{game.phase === "LOBBY" ? "En attente des joueurs" : game.phase === "DISCUSSION" ? game.currentPlayer.role === "IMPOSTOR" ? "Tu es l’imposteur" : `Ton mot : ${game.currentPlayer.word}` : game.phase === "VOTING" ? "Qui est l’imposteur ?" : "La manche est terminée"}</h1>
  {game.phase === "LOBBY" && <div className="mt-6 rounded-2xl bg-white/5 p-4"><p className="text-sm text-slate-400">Lien d’invitation</p><div className="mt-2 flex gap-2"><code className="min-w-0 flex-1 truncate text-sm text-slate-200">?join={game.code}</code><button className="rounded-lg bg-violet-500 px-3 py-1.5 text-sm font-bold" onClick={() => void copyInvite()}>{isCopied ? "Copié" : "Copier"}</button></div></div>}
  <ul className="mt-7 space-y-2">{game.players.map((player) => <li key={player.id} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3"><span>{player.name}{player.id === game.currentPlayer.id ? " (toi)" : ""}</span><span className="text-sm text-slate-400">{player.isHost ? "Hôte" : player.hasVoted ? "A voté" : ""}</span>{game.phase === "VOTING" && player.id !== game.currentPlayer.id && <button className="rounded-lg bg-white/10 px-3 py-1 text-sm hover:bg-white/20" onClick={() => void play("vote", player.id)}>Voter</button>}</li>)}</ul>
  {error && <p className="mt-4 text-sm text-rose-300" role="alert">{error}</p>}
  <div className="mt-7">{game.phase === "LOBBY" && isHost && <button disabled={game.players.length < 3} className="rounded-xl bg-orange-500 px-5 py-3 font-bold disabled:opacity-40" onClick={() => void play("start")}>Lancer la partie</button>}{game.phase === "DISCUSSION" && isHost && <button className="rounded-xl bg-violet-500 px-5 py-3 font-bold" onClick={() => void play("beginVote")}>Passer au vote</button>}</div></section></div></main>;
}

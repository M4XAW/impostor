"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ROOM_CODE_PATTERN } from "@/lib/room-code";

type EntryMode = "create" | "join";

interface GameEntryProps {
    joinCode?: string;
}

export function GameEntry({ joinCode }: GameEntryProps) {
    const [mode, setMode] = useState<EntryMode>(joinCode ? "join" : "create");
    const [roomCode, setRoomCode] = useState(joinCode ?? "");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setIsSubmitting(true);
        setMessage("");
        const response = await fetch("/api/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: formData.get("playerName"), ...(mode === "join" ? { code: roomCode } : {}) }),
        });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok || typeof payload !== "object" || payload === null || !("code" in payload) || typeof payload.code !== "string") {
            setMessage(typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string" ? payload.error : "Une erreur est survenue.");
            setIsSubmitting(false);
            return;
        }
        router.push(`/room/${payload.code}`);
    }

    const isCreating = mode === "create";

    return (
        <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/30 backdrop-blur sm:p-7" aria-labelledby="game-entry-title">
            <div className="mb-7 flex rounded-xl bg-white/5 p-1" role="tablist" aria-label="Accès à une partie">
                <button
                    className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition ${isCreating ? "bg-orange-500 text-white shadow-lg shadow-orange-950/30" : "text-slate-400 hover:text-white"}`}
                    type="button"
                    role="tab"
                    aria-selected={isCreating}
                    onClick={() => { setMode("create"); setMessage(""); }}
                >
                    Créer une partie
                </button>
                <button
                    className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition ${!isCreating ? "bg-violet-500 text-white shadow-lg shadow-violet-950/30" : "text-slate-400 hover:text-white"}`}
                    type="button"
                    role="tab"
                    aria-selected={!isCreating}
                    onClick={() => { setMode("join"); setMessage(""); }}
                >
                    Rejoindre
                </button>
            </div>

            <div className="mb-7">
                <h2 id="game-entry-title" className="text-2xl font-extrabold text-white">
                    {isCreating ? "Lance ta table" : "Entre dans la partie"}
                </h2>
                <p className="mt-2 text-slate-400">
                    {isCreating ? "Choisis ton pseudo : tu pourras inviter les autres juste après." : "Demande le code à la personne qui organise la partie."}
                </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
                <label className="block text-sm font-semibold text-slate-200" htmlFor="player-name">
                    Ton pseudo
                    <input
                        className="mt-2 w-full rounded-xl border border-white/10 bg-[#171b27] px-4 py-3.5 text-base text-white outline-none placeholder:text-slate-600 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                        id="player-name"
                        name="playerName"
                        placeholder="Ex. Camille"
                        required
                        maxLength={24}
                        autoComplete="nickname"
                    />
                </label>

                {!isCreating && (
                    <label className="block text-sm font-semibold text-slate-200" htmlFor="room-code">
                        Code de la partie
                        <input
                            className="mt-2 w-full rounded-xl border border-white/10 bg-[#171b27] px-4 py-3.5 font-mono tracking-[0.2em] text-white outline-none placeholder:tracking-normal placeholder:text-slate-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                            id="room-code"
                            name="roomCode"
                            placeholder="eUR-C7CDN"
                            required
                            pattern={ROOM_CODE_PATTERN.source}
                            value={roomCode}
                            onChange={(event) => setRoomCode(event.target.value)}
                            autoComplete="off"
                        />
                    </label>
                )}

                <button className={`w-full rounded-xl px-4 py-3.5 font-bold text-white transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-wait disabled:opacity-60 ${isCreating ? "bg-orange-500 hover:bg-orange-400 focus:ring-orange-400" : "bg-violet-500 hover:bg-violet-400 focus:ring-violet-400"}`} type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Connexion…" : isCreating ? "Créer la partie" : "Rejoindre la partie"}
                </button>
            </form>

            <p className="mt-5 min-h-5 text-center text-sm text-orange-300" aria-live="polite">{message}</p>
        </section>
    );
}

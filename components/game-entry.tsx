"use client";

import { type FormEventHandler, useState } from "react";
import { useRouter } from "next/navigation";
import { ROOM_CODE_PATTERN } from "@/lib/room-code";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader } from "./ui/card";

import { RiLoaderFill } from "@remixicon/react"

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

    const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
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
    };

    const isCreating = mode === "create";

    return (
        <Card className="max-w-sm w-full" aria-labelledby="game-entry-title">
            <CardHeader>
                <div className="flex gap-2 mb-4" role="tablist" aria-label="Accès à une partie">
                    <Button
                        className="flex-1"
                        type="button"
                        role="tab"
                        aria-selected={isCreating}
                        onClick={() => { setMode("create"); setMessage(""); }}
                    >
                        Créer une partie
                    </Button>
                    <Button
                        className="flex-1"
                        type="button"
                        role="tab"
                        aria-selected={!isCreating}
                        onClick={() => { setMode("join"); setMessage(""); }}
                    >
                        Rejoindre
                    </Button>
                </div>
                <div>
                    <h2 id="game-entry-title" className="text-2xl text-white">
                        {isCreating ? "Créer une partie" : "Rejoindre une partie"}
                    </h2>
                    <p className="mt-2 text-muted-foreground text-sm">
                        {isCreating ? "Choisis ton pseudo : tu pourras inviter les autres juste après." : "Demande le code à la personne qui organise la partie."}
                    </p>
                </div>
            </CardHeader>
            <CardContent>
                <form className="space-y-5" onSubmit={handleSubmit}>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="player-name" className="sr-only">Ton pseudo</FieldLabel>
                            <Input
                                id="player-name"
                                name="playerName"
                                type="text"
                                placeholder="Ex. Camille"
                                maxLength={24}
                                autoComplete="nickname"
                                required
                            />
                        </Field>

                        {!isCreating && (
                            <Field>
                                <FieldLabel htmlFor="room-code" className="sr-only">Code de la partie</FieldLabel>
                                <Input
                                    id="room-code"
                                    name="roomCode"
                                    type="text"
                                    placeholder="eUR-C7CDN"
                                    pattern={ROOM_CODE_PATTERN.source}
                                    value={roomCode}
                                    onChange={(e) => setRoomCode(e.target.value)}
                                    autoComplete="off"
                                    required
                                />
                            </Field>
                        )}

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <RiLoaderFill className="animate-spin" /> : isCreating ? "Créer la partie" : "Rejoindre la partie"}
                        </Button>
                    </FieldGroup>
                </form>
            </CardContent>

            {message && <p className="mt-5 min-h-5 text-center text-sm text-orange-300" aria-live="polite">{message}</p>}
        </Card>
    );
}

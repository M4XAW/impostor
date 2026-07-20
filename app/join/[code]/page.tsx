import { notFound } from "next/navigation";

import { GameEntry } from "@/components/game-entry";
import { getValidRoomCode } from "@/lib/room-code";

export default async function JoinRoomPage({ params }: PageProps<"/join/[code]">) {
    const { code: rawCode } = await params;
    const code = getValidRoomCode(rawCode);

    if (!code) notFound();

    return (
        <main className="grid flex-1 place-items-center px-5 pb-20 sm:px-8 lg:px-12">
            <GameEntry joinCode={code} />
        </main>
    );
}

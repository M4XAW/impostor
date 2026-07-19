import { GameEntry } from "@/components/game-entry";
import { getValidRoomCode } from "@/lib/room-code";

export default async function Home({ searchParams }: PageProps<"/">) {
    const { join } = await searchParams;
    const joinCode = getValidRoomCode(join);

    return (
        <main className="grid flex-1 place-items-center px-5 pb-20 sm:px-8 lg:px-12">
            <GameEntry key={joinCode ?? "game-entry"} joinCode={joinCode} />
        </main>
    );
}

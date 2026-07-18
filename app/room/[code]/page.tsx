import { notFound } from "next/navigation";
import { RoomClient } from "@/components/room-client";
import { getValidRoomCode } from "@/lib/room-code";

export default async function RoomPage({ params }: PageProps<"/room/[code]">) {
  const { code: rawCode } = await params;
  const code = getValidRoomCode(rawCode);
  if (!code) notFound();
  return <RoomClient code={code} />;
}

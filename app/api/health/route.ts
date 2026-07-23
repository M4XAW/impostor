import { logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  try {
    await prisma.room.findFirst({ select: { id: true } });

    return Response.json(
      { status: "ok", database: "available" },
      { headers },
    );
  } catch (error) {
    logError("health.database_unavailable", error);

    return Response.json(
      { status: "unavailable", database: "unavailable" },
      { status: 503, headers },
    );
  }
}

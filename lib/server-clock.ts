import type { ServerTiming } from "@/types/game";

export function estimateServerClockOffsetMs(
  clientSentAt: number,
  clientReceivedAt: number,
  serverTiming: ServerTiming,
) {
  const offset = (
    serverTiming.receivedAt - clientSentAt +
    serverTiming.sentAt - clientReceivedAt
  ) / 2;

  return Number.isFinite(offset) ? offset : 0;
}

export function getCountdownSeconds(endsAt: number, serverNow: number) {
  return Math.max(0, Math.ceil((endsAt - serverNow) / 1000));
}

export function getNextCountdownUpdateDelay(remainingMs: number) {
  if (remainingMs <= 0) return null;

  const remainder = remainingMs % 1000;
  const untilNextSecond = remainder === 0 ? 1000 : remainder;

  return Math.max(16, untilNextSecond + 5);
}

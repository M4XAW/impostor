import { EventEmitter } from "node:events";

const globalForRealtime = globalThis as unknown as { roomEvents?: EventEmitter };

const roomEvents = globalForRealtime.roomEvents ?? new EventEmitter();
globalForRealtime.roomEvents = roomEvents;

export function notifyRoomChanged(code: string) {
  roomEvents.emit(`room:${code}`);
}

export function subscribeToRoomChanges(code: string, listener: () => void) {
  const event = `room:${code}`;
  roomEvents.on(event, listener);
  return () => roomEvents.off(event, listener);
}

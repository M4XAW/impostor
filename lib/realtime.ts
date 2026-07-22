import { EventEmitter } from "node:events";
import type { PlayerActivityEvent } from "@/lib/player-activity";

export interface RoomChange {
  removedPlayerPublicId?: string;
  playerActivity?: PlayerActivityEvent;
}

const globalForRealtime = globalThis as unknown as { roomEvents?: EventEmitter };
const roomEvents = globalForRealtime.roomEvents ?? new EventEmitter();
const anyRoomChangeEvent = "room:changed";
globalForRealtime.roomEvents = roomEvents;

export function notifyRoomChanged(code: string, change: RoomChange = {}) {
  roomEvents.emit(`room:${code}`, change);
  roomEvents.emit(anyRoomChangeEvent, code);
}

export function subscribeToRoomChanges(code: string, listener: (change: RoomChange) => void) {
  const event = `room:${code}`;
  roomEvents.on(event, listener);
  return () => roomEvents.off(event, listener);
}

export function subscribeToAnyRoomChange(listener: (code: string) => void) {
  roomEvents.on(anyRoomChangeEvent, listener);
  return () => roomEvents.off(anyRoomChangeEvent, listener);
}

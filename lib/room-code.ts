export const ROOM_CODE_PATTERN = /^[A-Za-z0-9]{3,8}-[A-Za-z0-9]{4,8}$/;

export function getValidRoomCode(value: string | string[] | undefined): string | undefined {
  if (typeof value !== "string" || !ROOM_CODE_PATTERN.test(value)) {
    return undefined;
  }

  return value;
}

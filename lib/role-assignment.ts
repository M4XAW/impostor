import { randomInt } from "node:crypto";

type RandomIndex = (maxExclusive: number) => number;

export function selectImpostorPlayerIds(
  playerIds: readonly string[],
  impostorCount: number,
  randomIndex: RandomIndex = randomInt,
) {
  if (!Number.isInteger(impostorCount) || impostorCount < 1 || impostorCount >= playerIds.length) {
    throw new RangeError("The impostor count must leave at least one civilian.");
  }

  const shuffledPlayerIds = [...playerIds];

  for (let index = shuffledPlayerIds.length - 1; index > 0; index -= 1) {
    const selectedIndex = randomIndex(index + 1);
    [shuffledPlayerIds[index], shuffledPlayerIds[selectedIndex]] = [
      shuffledPlayerIds[selectedIndex],
      shuffledPlayerIds[index],
    ];
  }

  return shuffledPlayerIds.slice(0, impostorCount);
}

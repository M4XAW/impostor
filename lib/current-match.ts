interface MatchScopedItem {
  matchNumber: number;
}

export function selectVisibleMatchItems<T extends MatchScopedItem>(
  items: readonly T[],
  currentMatchNumber: number,
  showAllMatches: boolean,
) {
  if (showAllMatches) return [...items];

  return items.filter((item) => item.matchNumber === currentMatchNumber);
}

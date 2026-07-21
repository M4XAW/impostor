interface WordScopedItem {
  wordNumber: number;
}

export function selectVisibleWordItems<T extends WordScopedItem>(
  items: readonly T[],
  currentWordNumber: number,
  showAllWords: boolean,
) {
  if (showAllWords) return [...items];

  return items.filter((item) => item.wordNumber === currentWordNumber);
}

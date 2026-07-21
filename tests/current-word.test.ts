import assert from "node:assert/strict";
import test from "node:test";
import { selectVisibleWordItems } from "@/lib/current-word";

test("only items from the current word are selected", () => {
  const clues = [
    { id: "previous", wordNumber: 1 },
    { id: "current-first", wordNumber: 2 },
    { id: "current-second", wordNumber: 2 },
    { id: "future", wordNumber: 3 },
  ];

  assert.deepEqual(selectVisibleWordItems(clues, 2, false), [
    { id: "current-first", wordNumber: 2 },
    { id: "current-second", wordNumber: 2 },
  ]);
});

test("items from every word are selected for the final game summary", () => {
  const clues = [
    { id: "first", wordNumber: 1 },
    { id: "second", wordNumber: 2 },
  ];

  assert.deepEqual(selectVisibleWordItems(clues, 2, true), clues);
});

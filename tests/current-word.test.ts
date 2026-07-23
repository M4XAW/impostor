import assert from "node:assert/strict";
import test from "node:test";
import { selectVisibleMatchItems } from "@/lib/current-match";

test("only items from the current match are selected", () => {
  const clues = [
    { id: "previous", matchNumber: 1 },
    { id: "current-first", matchNumber: 2 },
    { id: "current-second", matchNumber: 2 },
    { id: "future", matchNumber: 3 },
  ];

  assert.deepEqual(selectVisibleMatchItems(clues, 2, false), [
    { id: "current-first", matchNumber: 2 },
    { id: "current-second", matchNumber: 2 },
  ]);
});

test("items from every match are selected for the final game summary", () => {
  const clues = [
    { id: "first", matchNumber: 1 },
    { id: "second", matchNumber: 2 },
  ];

  assert.deepEqual(selectVisibleMatchItems(clues, 2, true), clues);
});

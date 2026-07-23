import assert from "node:assert/strict";
import test from "node:test";
import { selectImpostorPlayerIds } from "@/lib/role-assignment";

test("roles are selected from a fresh shuffled player order", () => {
  const selectedIndexes = [0, 1, 0];
  let callIndex = 0;
  const randomIndex = (maxExclusive: number) => {
    const selectedIndex = selectedIndexes[callIndex] ?? 0;
    callIndex += 1;
    assert.ok(selectedIndex < maxExclusive);
    return selectedIndex;
  };

  assert.deepEqual(
    selectImpostorPlayerIds(["alice", "bob", "charlie", "diane"], 2, randomIndex),
    ["charlie", "diane"],
  );
});

test("role selection rejects an invalid impostor count", () => {
  assert.throws(
    () => selectImpostorPlayerIds(["alice", "bob"], 2),
    /leave at least one civilian/,
  );
});

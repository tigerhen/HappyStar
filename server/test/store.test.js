import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.HAPPY_STAR_DATA = mkdtempSync(join(tmpdir(), "hs-store-"));
const { readCollection, writeCollection, updateCollection } = await import("../src/store.js");

test("readCollection returns default when file missing", async () => {
  assert.deepEqual(await readCollection("events", []), []);
});

test("writeCollection then readCollection round-trips", async () => {
  await writeCollection("tasks", [{ id: "t1", points: 5 }]);
  assert.deepEqual(await readCollection("tasks", []), [{ id: "t1", points: 5 }]);
});

test("write is atomic: no leftover temp file", async () => {
  await writeCollection("rewards", [{ id: "r1" }]);
  const { readdirSync } = await import("node:fs");
  const files = readdirSync(process.env.HAPPY_STAR_DATA);
  assert.equal(files.some((f) => f.endsWith(".tmp")), false);
});

test("concurrent writes do not collide on the atomic temp file", async () => {
  await Promise.all(Array.from({ length: 20 }, (_, index) => writeCollection("events", [{ index }])));
  const value = await readCollection("events", []);
  assert.equal(value.length, 1);
  assert.equal(Number.isInteger(value[0].index), true);
});

test("updateCollection serializes concurrent read-modify-write operations", async () => {
  await writeCollection("config", { value: 0 });
  await Promise.all(Array.from({ length: 20 }, () => updateCollection("config", { value: 0 }, async (current) => {
    await new Promise((resolve) => setTimeout(resolve, 1));
    return { value: current.value + 1 };
  })));
  assert.deepEqual(await readCollection("config", null), { value: 20 });
});

rmSync(process.env.HAPPY_STAR_DATA, { recursive: true, force: true });

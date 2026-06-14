import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.HAPPY_STAR_DATA = mkdtempSync(join(tmpdir(), "hs-store-"));
const { readCollection, writeCollection } = await import("../src/store.js");

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

rmSync(process.env.HAPPY_STAR_DATA, { recursive: true, force: true });

import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPin, verifyPin, createSession, getSession, deleteSession } from "../src/auth.js";

test("hashPin produces salted hash that verifies", () => {
  const h = hashPin("1234");
  assert.notEqual(h, "1234");
  assert.equal(verifyPin("1234", h), true);
  assert.equal(verifyPin("0000", h), false);
});

test("sessions store and expire", () => {
  const id = createSession({ role: "child", childId: "haolin" }, 1000);
  assert.equal(getSession(id).role, "child");
  deleteSession(id);
  assert.equal(getSession(id), null);
});

test("expired session returns null", async () => {
  const id = createSession({ role: "parent" }, -1); // already expired
  assert.equal(getSession(id), null);
});
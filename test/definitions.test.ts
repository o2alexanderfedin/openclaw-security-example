import { test } from "node:test";
import assert from "node:assert/strict";
import { updateRecordTool } from "../src/tools/definitions.ts";

const valuePattern = updateRecordTool.parameterValidation!.value.pattern;

test("update_record value accepts plain text", () => {
  assert.equal(valuePattern.test("new display name"), true);
});

test("update_record value rejects a SQL keyword on the first line", () => {
  assert.equal(valuePattern.test("x; DROP TABLE users"), false);
});

test("update_record value rejects a SQL keyword after a line break", () => {
  assert.equal(valuePattern.test("x\nDROP TABLE users"), false);
  assert.equal(valuePattern.test("x\r\n; DELETE FROM users"), false);
});

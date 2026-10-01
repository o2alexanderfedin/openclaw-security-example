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

test("update_record value accepts words that only contain a SQL keyword", () => {
  for (const value of ["updated", "created", "Selection", "dropdown", "deleted item", "Executive", "altered"]) {
    assert.equal(valuePattern.test(value), true, value);
  }
});

test("update_record value still rejects whole SQL keywords", () => {
  for (const value of [
    "select * from users",
    "1; UPDATE users SET admin=1",
    "x;DROP TABLE users",
    "EXEC xp_cmdshell",
    "EXECUTE sp_who",
    "name\nDELETE FROM users",
    "(insert)",
  ]) {
    assert.equal(valuePattern.test(value), false, JSON.stringify(value));
  }
});

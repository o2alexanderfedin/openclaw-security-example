import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveAdminRequest } from "../src/admin-request.ts";
import { ALL_ROLES } from "../src/rbac/roles.ts";
import { ALL_TOOLS } from "../src/tools/definitions.ts";

const resolve = (body: { role?: unknown; tools?: unknown }) =>
  resolveAdminRequest(body, "admin", ALL_ROLES, ALL_TOOLS);

test("admin chat: caller cannot claim a wider role than the server grants", () => {
  const result = resolve({ role: "operator" });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.status, 403);
});

test("admin chat: caller cannot claim an unknown role", () => {
  assert.equal(resolve({ role: "root" }).ok, false);
});

test("admin chat: caller cannot request a tool its role does not allow", () => {
  const result = resolve({ tools: ["system_exec"] });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.status, 403);
});

test("admin chat: caller cannot supply its own tool definitions", () => {
  const result = resolve({ tools: [{ name: "system_exec", input_schema: {} }] });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.status, 400);
});

test("admin chat: tools must be a list", () => {
  assert.equal(resolve({ tools: "search" }).ok, false);
});

test("admin chat: no role and no tools uses the server role and no tools", () => {
  assert.deepEqual(resolve({}), { ok: true, role: "admin", tools: undefined });
  assert.deepEqual(resolve({ tools: [] }), { ok: true, role: "admin", tools: undefined });
});

test("admin chat: caller may narrow the role and pick allowed tools by name", () => {
  const result = resolve({ role: "user", tools: ["search"] });
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.role, "user");
  const search = ALL_TOOLS.find((t) => t.name === "search")!;
  assert.deepEqual(result.ok && result.tools, [
    { name: "search", description: search.description, input_schema: search.parameters },
  ]);
});

test("admin chat: a narrowed role cannot use tools of the server role", () => {
  assert.equal(resolve({ role: "user", tools: ["update_record"] }).ok, false);
});

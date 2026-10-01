/**
 * Decides which role and which tools an admin chat request may use.
 *
 * The role comes from the server (ADMIN_CHAT_ROLE). A caller may ask for a
 * narrower role, whose tools are a subset of the server role's tools, but
 * never a wider one. Tools are always the server's own definitions; a caller
 * may only pick some of them by name.
 */

import type { ToolConfig } from "@openclaw/llm-security";
import type { Role } from "./rbac/roles.js";

export interface AnthropicToolDefinition {
  name: string;
  description: string;
  input_schema: ToolConfig["parameters"];
}

export type AdminRequestResult =
  | { ok: true; role: string; tools: AnthropicToolDefinition[] | undefined }
  | { ok: false; status: number; error: string };

export function resolveAdminRequest(
  body: { role?: unknown; tools?: unknown },
  serverRole: string,
  roles: Role[],
  tools: ToolConfig[],
): AdminRequestResult {
  const granted = roles.find((r) => r.name === serverRole);
  if (!granted) {
    return { ok: false, status: 500, error: `Server role "${serverRole}" is not defined` };
  }

  let effective = granted;
  if (body.role !== undefined) {
    const requested = roles.find((r) => r.name === body.role);
    const isNarrower =
      requested !== undefined &&
      requested.allowedTools.every((name) => granted.allowedTools.includes(name));
    if (!requested || !isNarrower) {
      return { ok: false, status: 403, error: "Requested role is not allowed" };
    }
    effective = requested;
  }

  const requestedTools = body.tools ?? [];
  if (!Array.isArray(requestedTools) || !requestedTools.every((t) => typeof t === "string")) {
    return { ok: false, status: 400, error: "tools must be a list of tool names" };
  }

  const selected: AnthropicToolDefinition[] = [];
  for (const name of requestedTools as string[]) {
    const tool = tools.find((t) => t.name === name);
    if (!tool || !effective.allowedTools.includes(name)) {
      return { ok: false, status: 403, error: `Tool "${name}" is not allowed` };
    }
    selected.push({ name: tool.name, description: tool.description, input_schema: tool.parameters });
  }

  return { ok: true, role: effective.name, tools: selected.length > 0 ? selected : undefined };
}

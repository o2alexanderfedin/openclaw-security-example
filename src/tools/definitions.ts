/**
 * Tool definitions with security configurations.
 *
 * This demonstrates how to define tools with different security levels
 * and parameter validation rules for @openclaw/llm-security.
 */

import type { ToolConfig } from "@openclaw/llm-security";

/**
 * Search tool - allowed for all roles, no parameter restrictions
 */
export const searchTool: ToolConfig = {
  name: "search",
  description: "Search for information in the knowledge base",
  trustLevel: "user",
  timeout: 5000,
  rateLimitPerMinute: 60,
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query",
      },
    },
    required: ["query"],
  },
};

/**
 * Lookup data tool - allowed for all roles
 */
export const lookupDataTool: ToolConfig = {
  name: "lookup_data",
  description: "Look up specific data by ID",
  trustLevel: "user",
  timeout: 3000,
  rateLimitPerMinute: 100,
  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "Record ID to look up",
      },
    },
    required: ["id"],
  },
};

/**
 * Update record tool - admin+ only
 * Includes parameter validation to prevent SQL injection
 */
export const updateRecordTool: ToolConfig = {
  name: "update_record",
  description: "Update a record in the database",
  trustLevel: "admin",
  timeout: 10000,
  rateLimitPerMinute: 20,
  parameters: {
    type: "object",
    properties: {
      id: {
        type: "number",
        description: "Numeric record ID",
      },
      field: {
        type: "string",
        description: "Field name to update",
      },
      value: {
        type: "string",
        description: "New value (no SQL allowed)",
      },
    },
    required: ["id", "field", "value"],
  },
  parameterValidation: {
    // ID must be numeric
    id: {
      pattern: /^\d+$/,
      errorMessage: "ID must be numeric",
    },
    // Value must not contain SQL keywords on any line ("s" lets "." match line breaks)
    value: {
      pattern: /^(?!.*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)).*/is,
      errorMessage: "Value cannot contain SQL keywords",
    },
  },
};

/**
 * Delete record tool - admin+ only
 */
export const deleteRecordTool: ToolConfig = {
  name: "delete_record",
  description: "Delete a record from the database",
  trustLevel: "admin",
  timeout: 10000,
  rateLimitPerMinute: 10,
  parameters: {
    type: "object",
    properties: {
      id: {
        type: "number",
        description: "Numeric record ID to delete",
      },
    },
    required: ["id"],
  },
  parameterValidation: {
    id: {
      pattern: /^\d+$/,
      errorMessage: "ID must be numeric",
    },
  },
};

/**
 * System execute tool - operator only
 * Highly restricted with strict parameter validation
 */
export const systemExecTool: ToolConfig = {
  name: "system_exec",
  description: "Execute system commands (operators only)",
  trustLevel: "operator",
  timeout: 30000,
  rateLimitPerMinute: 5,
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "System command to execute",
      },
      args: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Command arguments",
      },
    },
    required: ["command"],
  },
  parameterValidation: {
    // Command must be from allowlist
    command: {
      pattern: /^(ls|pwd|echo|date|uptime)$/,
      errorMessage: "Only specific safe commands are allowed",
    },
    // Arguments must not contain shell metacharacters
    args: {
      pattern: /^[a-zA-Z0-9._\/-]+$/,
      errorMessage: "Arguments cannot contain shell metacharacters",
    },
  },
};

/**
 * All tool definitions for registration
 */
export const ALL_TOOLS = [
  searchTool,
  lookupDataTool,
  updateRecordTool,
  deleteRecordTool,
  systemExecTool,
];

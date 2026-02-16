/**
 * RBAC (Role-Based Access Control) configuration for the example application.
 *
 * This demonstrates how to use @openclaw/llm-security's RBACManager to control
 * which tools can be accessed by different user roles.
 */

export interface Role {
  name: string;
  description: string;
  allowedTools: string[];
}

/**
 * User role: Basic authenticated users
 * Can use read-only tools like search and lookup
 */
export const USER_ROLE: Role = {
  name: "user",
  description: "Basic authenticated user with read-only access",
  allowedTools: ["search", "lookup_data"],
};

/**
 * Admin role: Administrators
 * Can use read-only and write tools like update and delete
 */
export const ADMIN_ROLE: Role = {
  name: "admin",
  description: "Administrator with read and write access",
  allowedTools: ["search", "lookup_data", "update_record", "delete_record"],
};

/**
 * Operator role: System operators
 * Can use all tools including system-level operations
 */
export const OPERATOR_ROLE: Role = {
  name: "operator",
  description: "System operator with full access including system tools",
  allowedTools: ["search", "lookup_data", "update_record", "delete_record", "system_exec"],
};

/**
 * All defined roles in the system
 */
export const ALL_ROLES = [USER_ROLE, ADMIN_ROLE, OPERATOR_ROLE];

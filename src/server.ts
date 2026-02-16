/**
 * OpenClaw Security Example Server
 *
 * This example demonstrates three security tiers using @openclaw/llm-security:
 * 1. Public endpoint - Minimal policy (secret redaction only)
 * 2. Authenticated endpoint - Balanced policy (secrets + injection detection + PII)
 * 3. Admin endpoint - Strict policy (all security layers + RBAC + tool restrictions)
 */

import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import {
  createSecurityMiddleware,
  createMinimalPolicy,
  createBalancedPolicy,
  createStrictPolicy,
  wrapAnthropic,
  ToolRegistry,
  RBACManager,
  ParameterValidator,
} from "@openclaw/llm-security";
import type { SecurityPolicy } from "@openclaw/llm-security";
import { ALL_TOOLS } from "./tools/definitions.js";
import { ALL_ROLES } from "./rbac/roles.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize security components for strict policy
const toolRegistry = new ToolRegistry();
const rbacManager = new RBACManager();
const parameterValidator = new ParameterValidator();

// Register tools and roles
ALL_TOOLS.forEach((tool) => toolRegistry.registerTool(tool));
ALL_ROLES.forEach((role) => {
  role.allowedTools.forEach((toolName) => {
    rbacManager.grantPermission(role.name, toolName);
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

/**
 * PUBLIC CHAT ENDPOINT
 * Security Level: Minimal (secret redaction only)
 *
 * This endpoint uses createMinimalPolicy which only enables secret detection.
 * Good for public-facing features where you need basic credential protection
 * without additional overhead.
 */
app.post("/api/public/chat", createSecurityMiddleware(createMinimalPolicy()), async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const secureClient = wrapAnthropic(anthropic, createMinimalPolicy());

    const response = await secureClient.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: message }],
    });

    res.json({
      response: response.content,
      securityLevel: "minimal",
    });
  } catch (error) {
    console.error("Public chat error:", error);
    res.status(500).json({
      error: "Failed to process message",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * AUTHENTICATED CHAT ENDPOINT
 * Security Level: Balanced (secrets + injection detection + PII)
 *
 * This endpoint uses createBalancedPolicy which enables:
 * - Secret redaction (mode: redact)
 * - Prompt injection detection (mode: warn)
 * - Output filtering with content sanitization (mode: warn)
 * - Audit logging
 *
 * Good for authenticated users where you want core security without
 * blocking legitimate requests.
 */
app.post(
  "/api/authenticated/chat",
  createSecurityMiddleware(createBalancedPolicy()),
  async (req, res) => {
    try {
      const { message, userId = "default" } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const secureClient = wrapAnthropic(anthropic, createBalancedPolicy());

      const response = await secureClient.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `User ID: ${userId}\n\n${message}`,
          },
        ],
      });

      res.json({
        response: response.content,
        securityLevel: "balanced",
        userId,
      });
    } catch (error) {
      console.error("Authenticated chat error:", error);
      res.status(500).json({
        error: "Failed to process message",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * ADMIN CHAT ENDPOINT
 * Security Level: Strict (all security layers + RBAC + tool restrictions)
 *
 * This endpoint uses createStrictPolicy with auto-wiring enabled.
 * It demonstrates:
 * - All 8 security phases enabled
 * - Secret detection in reject mode (blocks on detection)
 * - Prompt injection in reject mode
 * - Network egress deny-by-default
 * - Tool sandboxing with RBAC and parameter validation
 * - Full audit logging
 *
 * Good for high-security operations where you need maximum protection.
 */
app.post("/api/admin/chat", createSecurityMiddleware(createStrictPolicy()), async (req, res) => {
  try {
    const { message, role = "admin", tools = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Create strict policy with tool security components
    const strictPolicy: SecurityPolicy = {
      ...createStrictPolicy(),
      toolSandboxing: {
        enabled: true,
        registry: toolRegistry,
        rbac: rbacManager,
        parameterValidator,
        defaultTrustLevel: "user",
        requireExplicitRegistration: true,
      },
    };

    const secureClient = wrapAnthropic(anthropic, strictPolicy);

    const response = await secureClient.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Role: ${role}\n\n${message}`,
        },
      ],
      tools: tools.length > 0 ? tools : undefined,
    });

    res.json({
      response: response.content,
      securityLevel: "strict",
      role,
      toolsAvailable: toolRegistry.listTools().map((t) => t.name),
    });
  } catch (error) {
    console.error("Admin chat error:", error);
    res.status(500).json({
      error: "Failed to process message",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * TOOLS ENDPOINT
 * List available tools and their permissions
 */
app.get("/api/tools", (req, res) => {
  const { role = "user" } = req.query;

  const allTools = toolRegistry.listTools();
  const allowedTools = allTools.filter((tool) =>
    rbacManager.checkPermission(role as string, tool.name),
  );

  res.json({
    role,
    allowedTools: allowedTools.map((t) => ({
      name: t.name,
      description: t.description,
      trustLevel: t.trustLevel,
    })),
    totalTools: allTools.length,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`OpenClaw Security Example Server running on http://localhost:${PORT}`);
  console.log("\nAvailable endpoints:");
  console.log(`  GET  /health                    - Health check`);
  console.log(`  POST /api/public/chat           - Public chat (minimal security)`);
  console.log(`  POST /api/authenticated/chat    - Authenticated chat (balanced security)`);
  console.log(`  POST /api/admin/chat            - Admin chat (strict security)`);
  console.log(`  GET  /api/tools?role=<role>     - List available tools for role`);
  console.log("\nSecurity levels:");
  console.log(`  Minimal:  Secret redaction only`);
  console.log(`  Balanced: Secrets + injection detection + PII + audit logging`);
  console.log(`  Strict:   All security layers + RBAC + tool restrictions + network control`);
});

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { type AuthContextError } from "@osiris-ai/sdk";
import { McpLogger } from "../utils/logger.js";
import {
  createAuthErrorResponse,
  createErrorResponse,
  createSuccessResponse,
  LOG_LEVELS,
} from "../utils/types.js";
import { OstiumMCP } from "../client.js";
import { UpdateSlSchema } from "../schema/index.js";

const logger = new McpLogger("ostium-mcp", LOG_LEVELS.INFO);

export function registerUpdateSlTools(
  server: McpServer,
  ostiumMCP: OstiumMCP
): void {
  logger.info("📝 Registering update SL tools...");

  server.tool(
    "update_sl",
    "Update stop loss",
    UpdateSlSchema,
    async ({ _pairIndex, _index, _newSL }) => {
      try {
        logger.toolCalled("update_sl", {
          _pairIndex,
          _index,
          _newSL,
        });

        const result = await ostiumMCP.updateSl({
          _pairIndex,
          _index,
          _newSL,
        });

        logger.toolCompleted("update_sl");
        return createSuccessResponse(
          `✅ Update SL successfully for pair ${_pairIndex}`,
          result
        );
      } catch (error) {
        return handleToolError("update_sl", error);
      }
    }
  );

  logger.info("✅ All update SL tools registered successfully");
}

/**
 * Centralized error handling for all tools
 */
function handleToolError(toolName: string, error: unknown): CallToolResult {
  if ((error as AuthContextError).authorizationUrl) {
    const authError = error as AuthContextError;
    logger.error("Authentication required", {
      tool: toolName,
      authUrl: authError.authorizationUrl,
    });

    return createAuthErrorResponse(
      `Google authentication required for ${toolName}. Please visit: ${authError.authorizationUrl}`,
      {
        authorizationUrl: authError.authorizationUrl,
        availableServices: authError.availableServices,
        missingService: authError.missingService,
        deploymentId: authError.deploymentId,
      }
    );
  }

  logger.error("Tool execution failed", {
    tool: toolName,
    error: error instanceof Error ? error.message : String(error),
  });

  return createErrorResponse(error);
}

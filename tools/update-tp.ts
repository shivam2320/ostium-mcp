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
import { UpdateTpSchema } from "../schema/index.js";

const logger = new McpLogger("ostium-mcp", LOG_LEVELS.INFO);

export function registerUpdateTpTools(
  server: McpServer,
  ostiumMCP: OstiumMCP
): void {
  logger.info("📝 Registering update TP tools...");

  server.tool(
    "update_tp",
    "Update take profit",
    UpdateTpSchema,
    async ({ _pairIndex, _index, _newTP }) => {
      try {
        logger.toolCalled("update_tp", {
          _pairIndex,
          _index,
          _newTP,
        });

        const result = await ostiumMCP.updateTp({
          _pairIndex,
          _index,
          _newTP,
        });

        logger.toolCompleted("update_tp");
        return createSuccessResponse(
          `✅ Update TP successfully for pair ${_pairIndex}`,
          result
        );
      } catch (error) {
        return handleToolError("update_tp", error);
      }
    }
  );

  logger.info("✅ All update TP tools registered successfully");
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

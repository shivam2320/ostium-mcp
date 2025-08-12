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
import { CloseTradeSchema } from "../schema/index.js";

const logger = new McpLogger("ostium-mcp", LOG_LEVELS.INFO);

export function registerCloseTradeTools(
  server: McpServer,
  ostiumMCP: OstiumMCP
): void {
  logger.info("📝 Registering close trade tools...");

  server.tool(
    "close_trade",
    "Close a trade",
    CloseTradeSchema,
    async ({ _pairIndex, _index, _closePercentage }) => {
      try {
        logger.toolCalled("close_trade", {
          _pairIndex,
          _index,
          _closePercentage,
        });

        const result = await ostiumMCP.closeTrade({
          _pairIndex,
          _index,
          _closePercentage,
        });

        logger.toolCompleted("close_trade");
        return createSuccessResponse(
          `✅ Close trade successfully for pair ${_pairIndex}`,
          result
        );
      } catch (error) {
        return handleToolError("close_trade", error);
      }
    }
  );

  logger.info("✅ All close trade tools registered successfully");
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

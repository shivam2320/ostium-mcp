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
    "Close an existing trading position partially or completely by specifying the trading pair, position index, and closure percentage (in basis points). Allows flexible position management with partial closures (e.g., 50% closure) or full position closure (100%).",
    CloseTradeSchema,
    async ({ from, to, _index, _closePercentage }) => {
      try {
        logger.toolCalled("close_trade", {
          from,
          to,
          _index,
          _closePercentage,
        });

        const result = await ostiumMCP.closeTrade({
          from,
          to,
          _index,
          _closePercentage,
        });

        logger.toolCompleted("close_trade");
        return result;
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

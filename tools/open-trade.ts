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
import { OpenTradeSchema } from "../schema/index.js";

const logger = new McpLogger("pendle-mcp", LOG_LEVELS.INFO);

export function registerOpenTradeTools(
  server: McpServer,
  ostiumMCP: OstiumMCP
): void {
  logger.info("📝 Registering open trade tools...");

  server.tool(
    "open_trade",
    "Open a trade",
    OpenTradeSchema,
    async ({ _trade, _type, _slippage }) => {
      try {
        logger.toolCalled("open_trade", {
          _trade,
          _type,
          _slippage,
        });

        const result = await ostiumMCP.openTrade({
          _trade,
          _type,
          _slippage,
        });

        logger.toolCompleted("open_trade");
        return createSuccessResponse(
          `✅ Open trade successfully for ${_trade.trader} on ${_trade.from}/${_trade.to}`,
          result
        );
      } catch (error) {
        return handleToolError("open_trade", error);
      }
    }
  );

  logger.info("✅ All open trade tools registered successfully");
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

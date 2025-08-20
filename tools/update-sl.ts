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
    "Update the stop loss level for an existing trading position by specifying the trading pair, position index, and new stop loss price. Essential for risk management, allowing traders to adjust loss-limiting levels to protect profits or limit further losses.",
    UpdateSlSchema,
    async ({ from, to, _index, _newSL }) => {
      try {
        logger.toolCalled("update_sl", {
          from,
          to,
          _index,
          _newSL,
        });

        const result = await ostiumMCP.updateSl({
          from,
          to,
          _index,
          _newSL,
        });

        logger.toolCompleted("update_sl");
        return createSuccessResponse(
          `✅ Update SL successfully for pair ${from}/${to || "USD"}`,
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

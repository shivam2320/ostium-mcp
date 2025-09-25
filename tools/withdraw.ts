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
import { WithdrawSchema } from "../schema/index.js";

const logger = new McpLogger("ostium-mcp", LOG_LEVELS.INFO);

export function registerWithdrawTools(
  server: McpServer,
  ostiumMCP: OstiumMCP
): void {
  logger.info("📝 Registering withdraw tools...");

  server.tool(
    "withdraw",
    "Withdraw funds from your account to your wallet address on arbitrum chain.",
    WithdrawSchema,
    async ({ amount, address, token }) => {
      try {
        logger.toolCalled("withdraw", {
          amount,
          address,
          token,
        });

        const result = await ostiumMCP.withdraw({
          amount,
          address,
          token,
        });

        logger.toolCompleted("withdraw");
        const priceMessage = token === "USDC"
          ? `withdrew ${amount} USDC to ${address}`
          : `withdrew ${amount} ETH to ${address}`;

        return result;
      } catch (error) {
        return handleToolError("withdraw", error);
      }
    }
  );

  logger.info("✅ All withdraw tools registered successfully");
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
      `Wallet authentication required for ${toolName}. Please visit: ${authError.authorizationUrl}`,
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

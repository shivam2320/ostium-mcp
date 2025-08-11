import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { McpLogger } from "../utils/logger.js";
import {
  createErrorResponse,
  createSuccessResponse,
  LOG_LEVELS,
} from "../utils/types.js";
import {
  GetPairDetailsSchema,
  GetOpenTradesSchema,
  GetLimitOrdersSchema,
  GetRecentHistorySchema,
  GetOrderByIdSchema,
  GetTradeByIdSchema,
} from "../schema/index.js";
import {
  getFormattedPairs,
  getFormattedPairDetails,
  getFormattedOpenTrades,
  getFormattedLimitOrders,
  getFormattedOrders,
  getFormattedRecentHistory,
  getFormattedOrderById,
  getFormattedTradeById,
} from "../utils/data.js";

const logger = new McpLogger("ostium-mcp", LOG_LEVELS.INFO);

export function registerDataTools(server: McpServer): void {
  logger.info("📝 Registering data tools...");

  server.tool("get_pairs", "Get all available trading pairs", {}, async () => {
    try {
      logger.toolCalled("get_pairs", {});
      const result = await getFormattedPairs();
      logger.toolCompleted("get_pairs");
      return createSuccessResponse("✅ Retrieved trading pairs", result);
    } catch (error) {
      return handleToolError("get_pairs", error);
    }
  });

  server.tool(
    "get_pair_details",
    "Get details for a specific trading pair",
    GetPairDetailsSchema,
    async ({ pairId }) => {
      try {
        logger.toolCalled("get_pair_details", { pairId });
        const result = await getFormattedPairDetails(pairId);
        logger.toolCompleted("get_pair_details");
        return createSuccessResponse(
          `✅ Retrieved pair details for ${pairId}`,
          result
        );
      } catch (error) {
        return handleToolError("get_pair_details", error);
      }
    }
  );

  server.tool(
    "get_open_trades",
    "Get open trades for a specific address",
    GetOpenTradesSchema,
    async ({ address }) => {
      try {
        logger.toolCalled("get_open_trades", { address });
        const result = await getFormattedOpenTrades(address);
        logger.toolCompleted("get_open_trades");
        return createSuccessResponse(
          `✅ Retrieved open trades for ${address}`,
          result
        );
      } catch (error) {
        return handleToolError("get_open_trades", error);
      }
    }
  );

  server.tool(
    "get_limit_orders",
    "Get limit orders for a specific address",
    GetLimitOrdersSchema,
    async ({ address }) => {
      try {
        logger.toolCalled("get_limit_orders", { address });
        const result = await getFormattedLimitOrders(address);
        logger.toolCompleted("get_limit_orders");
        return createSuccessResponse(
          `✅ Retrieved limit orders for ${address}`,
          result
        );
      } catch (error) {
        return handleToolError("get_limit_orders", error);
      }
    }
  );

  server.tool(
    "get_all_orders",
    "Get all orders from the system",
    {},
    async () => {
      try {
        logger.toolCalled("get_all_orders", {});
        const result = await getFormattedOrders();
        logger.toolCompleted("get_all_orders");
        return createSuccessResponse("✅ Retrieved all orders", result);
      } catch (error) {
        return handleToolError("get_all_orders", error);
      }
    }
  );

  server.tool(
    "get_recent_history",
    "Get recent trading history for a specific address",
    GetRecentHistorySchema,
    async ({ address, lastNOrders }) => {
      try {
        logger.toolCalled("get_recent_history", { address, lastNOrders });
        const result = await getFormattedRecentHistory(address, lastNOrders);
        logger.toolCompleted("get_recent_history");
        return createSuccessResponse(
          `✅ Retrieved recent history for ${address}`,
          result
        );
      } catch (error) {
        return handleToolError("get_recent_history", error);
      }
    }
  );

  server.tool(
    "get_order_by_id",
    "Get a specific order by ID",
    GetOrderByIdSchema,
    async ({ orderId }) => {
      try {
        logger.toolCalled("get_order_by_id", { orderId });
        const result = await getFormattedOrderById(orderId);
        logger.toolCompleted("get_order_by_id");
        return createSuccessResponse(`✅ Retrieved order ${orderId}`, result);
      } catch (error) {
        return handleToolError("get_order_by_id", error);
      }
    }
  );

  server.tool(
    "get_trade_by_id",
    "Get a specific trade by ID",
    GetTradeByIdSchema,
    async ({ tradeId }) => {
      try {
        logger.toolCalled("get_trade_by_id", { tradeId });
        const result = await getFormattedTradeById(tradeId);
        logger.toolCompleted("get_trade_by_id");
        return createSuccessResponse(`✅ Retrieved trade ${tradeId}`, result);
      } catch (error) {
        return handleToolError("get_trade_by_id", error);
      }
    }
  );

  logger.info("✅ All data tools registered successfully");
}

/**
 * Centralized error handling for all tools
 */
function handleToolError(toolName: string, error: unknown): CallToolResult {
  logger.error("Tool execution failed", {
    tool: toolName,
    error: error instanceof Error ? error.message : String(error),
  });

  return createErrorResponse(error);
}

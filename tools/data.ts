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

  server.tool(
    "get_pairs",
    "Retrieve a comprehensive list of all available trading pairs on the Ostium platform, including asset symbols, pair IDs, and trading status information. Essential for discovering which markets are available for trading.",
    {},
    async () => {
      try {
        logger.toolCalled("get_pairs", {});
        const result = await getFormattedPairs();
        logger.toolCompleted("get_pairs");
        return createSuccessResponse("✅ Retrieved trading pairs", result);
      } catch (error) {
        return handleToolError("get_pairs", error);
      }
    }
  );

  server.tool(
    "get_pair_details",
    "Retrieve detailed information for a specific trading pair including current prices, spread, trading fees, minimum trade sizes, leverage limits, and market statistics. Useful for market analysis and trade planning.",
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
    "Retrieve all currently active trading positions for user's wallet address, including position details like collateral, leverage, current P&L, take profit/stop loss levels, and position size.",
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
    "Retrieve all pending limit and stop orders for a specific wallet address, showing order details like trigger prices, order sizes, expiration times, and order status.",
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
    "Retrieve a comprehensive list of all orders across the entire Ostium platform, providing system-wide order book visibility and market activity overview.",
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
    "Retrieve recent trading history for a specific wallet address with configurable number of orders to fetch. Shows executed trades, timestamps, profits/losses, and trade outcomes for performance analysis.",
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
    "Retrieve detailed information for a specific order using its unique identifier, including order status, execution details, timestamps, and associated trade information.",
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
    "Retrieve comprehensive details for a specific trade using its unique identifier, including entry/exit prices, profit/loss calculations, trade duration, and execution history.",
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

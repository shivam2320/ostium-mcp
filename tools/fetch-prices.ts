import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { McpLogger } from "../utils/logger.js";
import {
  createErrorResponse,
  createSuccessResponse,
  LOG_LEVELS,
  OstiumPricesResponse,
  PriceFeedData,
} from "../utils/types.js";
import { GetAssetPriceSchema } from "../schema/index.js";

const logger = new McpLogger("ostium-mcp", LOG_LEVELS.INFO);

/**
 * Fetch all asset prices from Ostium API
 */
async function fetchAssetPrices(): Promise<OstiumPricesResponse> {
  const apiUrl =
    "https://metadata-backend.ostium.io/PricePublish/latest-prices";

  try {
    logger.info("Fetching asset prices from Ostium API", { url: apiUrl });

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status} ${response.statusText}`
      );
    }

    const data: OstiumPricesResponse = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid response format: expected array of price data");
    }

    logger.info("Successfully fetched asset prices", { count: data.length });
    return data;
  } catch (error) {
    logger.error("Failed to fetch asset prices", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Fetch price for a specific asset pair from Ostium API
 */
async function fetchSpecificAssetPrice(asset: string): Promise<PriceFeedData> {
  const apiUrl = `https://metadata-backend.ostium.io/PricePublish/latest-price?asset=${encodeURIComponent(
    asset
  )}`;

  try {
    logger.info("Fetching specific asset price from Ostium API", {
      url: apiUrl,
      asset,
    });

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status} ${response.statusText}`
      );
    }

    const data: PriceFeedData = await response.json();

    if (!data || typeof data !== "object") {
      throw new Error("Invalid response format: expected price data object");
    }

    logger.info("Successfully fetched specific asset price", {
      asset,
      symbol: `${data.from}/${data.to}`,
    });
    return data;
  } catch (error) {
    logger.error("Failed to fetch specific asset price", {
      asset,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Format price data for better readability
 */
function formatPriceData(prices: OstiumPricesResponse): any {
  return {
    totalAssets: prices.length,
    lastUpdated: new Date().toISOString(),
    prices: prices.map((price: PriceFeedData) => ({
      symbol: `${price.from}/${price.to}`,
      feedId: price.feed_id,
      prices: {
        bid: price.bid,
        mid: price.mid,
        ask: price.ask,
      },
      marketStatus: {
        isOpen: price.isMarketOpen,
        isDayTradingClosed: price.isDayTradingClosed,
        toggleIn:
          price.secondsToToggleIsDayTradingClosed > 0
            ? `${price.secondsToToggleIsDayTradingClosed} seconds`
            : null,
      },
      timestamp: new Date(price.timestampSeconds * 1000).toISOString(),
    })),
  };
}

/**
 * Format single price data for better readability
 */
function formatSinglePriceData(price: PriceFeedData): any {
  return {
    symbol: `${price.from}/${price.to}`,
    feedId: price.feed_id,
    prices: {
      bid: price.bid,
      mid: price.mid,
      ask: price.ask,
      spread: (price.ask - price.bid).toFixed(5),
    },
    marketStatus: {
      isOpen: price.isMarketOpen,
      isDayTradingClosed: price.isDayTradingClosed,
      toggleIn:
        price.secondsToToggleIsDayTradingClosed > 0
          ? `${price.secondsToToggleIsDayTradingClosed} seconds`
          : null,
    },
    timestamp: new Date(price.timestampSeconds * 1000).toISOString(),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Register the fetch prices tool
 */
export function registerFetchPricesTools(server: McpServer): void {
  logger.info("📈 Registering fetch prices tools...");

  server.tool(
    "fetch_asset_prices",
    "Retrieve real-time price data for all available trading assets on the Ostium platform, including current bid/ask prices, price changes, volume data, and market timestamps. Essential for market overview and price discovery.",
    {},
    async (): Promise<CallToolResult> => {
      try {
        logger.toolCalled("fetch_asset_prices", {});

        const rawPrices = await fetchAssetPrices();
        const formattedData = formatPriceData(rawPrices);

        logger.toolCompleted("fetch_asset_prices");
        return createSuccessResponse(
          "✅ Retrieved current asset prices",
          formattedData
        );
      } catch (error) {
        return handleToolError("fetch_asset_prices", error);
      }
    }
  );

  server.tool(
    "fetch_specific_asset_price",
    "Retrieve detailed real-time price information for a specific asset pair, including current price, bid/ask spread, 24h change, volume, and last update timestamp. Ideal for focused market analysis and trade execution planning.",
    GetAssetPriceSchema,
    async ({ asset }: { asset: string }): Promise<CallToolResult> => {
      try {
        logger.toolCalled("fetch_specific_asset_price", { asset });

        const rawPrice = await fetchSpecificAssetPrice(asset);
        const formattedData = formatSinglePriceData(rawPrice);

        logger.toolCompleted("fetch_specific_asset_price");
        return createSuccessResponse(
          `✅ Retrieved price for ${asset}`,
          formattedData
        );
      } catch (error) {
        return handleToolError("fetch_specific_asset_price", error);
      }
    }
  );

  logger.info("✅ Fetch prices tools registered successfully");
}

/**
 * Centralized error handling for price tools
 */
function handleToolError(toolName: string, error: unknown): CallToolResult {
  logger.error("Price tool execution failed", {
    tool: toolName,
    error: error instanceof Error ? error.message : String(error),
  });

  return createErrorResponse(error);
}

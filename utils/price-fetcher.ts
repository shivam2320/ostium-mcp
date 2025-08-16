import { McpLogger } from "./logger.js";
import { LOG_LEVELS, PriceFeedData } from "./types.js";

const logger = new McpLogger("price-fetcher", LOG_LEVELS.INFO);

/**
 * Fetch current market price for a trading pair
 * @param from - Source currency symbol (e.g., "BTC", "ETH", "EUR")
 * @param to - Target currency symbol (e.g., "USD", "EUR")
 * @returns Promise<PriceFeedData> - Price data including bid, ask, and mid prices
 */
export async function fetchPairPrice(
  from: string,
  to: string
): Promise<PriceFeedData> {
  const assetSymbol = `${from}${to}`;
  const apiUrl = `https://metadata-backend.ostium.io/PricePublish/latest-price?asset=${encodeURIComponent(
    assetSymbol
  )}`;

  try {
    logger.info("Fetching price for trading pair", {
      from,
      to,
      assetSymbol,
      url: apiUrl,
    });

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch price for ${from}/${to}: ${response.status} ${response.statusText}`
      );
    }

    const data: PriceFeedData = await response.json();

    if (!data || typeof data !== "object") {
      throw new Error(`Invalid price data received for ${from}/${to}`);
    }

    // Validate required price fields
    if (
      typeof data.mid !== "number" ||
      typeof data.bid !== "number" ||
      typeof data.ask !== "number"
    ) {
      throw new Error(
        `Invalid price format for ${from}/${to}: missing bid/ask/mid prices`
      );
    }

    logger.info("Successfully fetched price for trading pair", {
      from,
      to,
      bid: data.bid,
      mid: data.mid,
      ask: data.ask,
      isMarketOpen: data.isMarketOpen,
    });

    return data;
  } catch (error) {
    logger.error("Failed to fetch price for trading pair", {
      from,
      to,
      assetSymbol,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get current mid price for a trading pair
 * @param from - Source currency symbol
 * @param to - Target currency symbol
 * @returns Promise<string> - Mid price as string (formatted for blockchain)
 */
export async function getCurrentMidPrice(
  from: string,
  to: string
): Promise<string> {
  try {
    const priceData = await fetchPairPrice(from, to);

    if (!priceData.isMarketOpen) {
      logger.error("Market is currently closed for trading pair", {
        from,
        to,
        isDayTradingClosed: priceData.isDayTradingClosed,
      });
    }

    // Return the mid price as a string formatted for precision
    return priceData.mid.toString();
  } catch (error) {
    const errorMessage = `Failed to get mid price for ${from}/${to}: ${
      error instanceof Error ? error.message : String(error)
    }`;
    logger.error("getCurrentMidPrice failed", {
      from,
      to,
      error: errorMessage,
    });
    throw new Error(errorMessage);
  }
}

/**
 * Get current bid or ask price for a trading pair
 * @param from - Source currency symbol
 * @param to - Target currency symbol
 * @param side - "bid" or "ask"
 * @returns Promise<string> - Bid or ask price as string
 */
export async function getCurrentSidePrice(
  from: string,
  to: string,
  side: "bid" | "ask"
): Promise<string> {
  try {
    const priceData = await fetchPairPrice(from, to);
    const price = side === "bid" ? priceData.bid : priceData.ask;

    logger.info(`Retrieved ${side} price for trading pair`, {
      from,
      to,
      side,
      price,
    });

    return price.toString();
  } catch (error) {
    const errorMessage = `Failed to get ${side} price for ${from}/${to}: ${
      error instanceof Error ? error.message : String(error)
    }`;
    logger.error("getCurrentSidePrice failed", {
      from,
      to,
      side,
      error: errorMessage,
    });
    throw new Error(errorMessage);
  }
}

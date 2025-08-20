import { z } from "zod";

export const HelloToolSchema = {
  name: z.string().default("World").describe("Name to greet"),
};

export const HelloPromptSchema = {
  topic: z
    .string()
    .describe("The topic or subject for the hello prompt message"),
};

export const OpenTradeSchema = {
  _trade: z.object({
    collateral: z
      .string()
      .describe(
        "The amount of USDC collateral to use for opening this trade position"
      ),
    openPrice: z
      .string()
      .optional()
      .describe(
        "Specific price at which to open the trade (required for limit and stop orders, optional for market orders)"
      ),
    tp: z
      .string()
      .default("0")
      .describe(
        "Take profit price level - the target price at which to automatically close the position for profit"
      ),
    sl: z
      .string()
      .default("0")
      .describe(
        "Stop loss price level - the price at which to automatically close the position to limit losses"
      ),
    trader: z
      .string()
      .describe("The wallet address of the trader opening this position"),
    leverage: z
      .string()
      .describe(
        "The leverage multiplier to apply to this trade (e.g., '10' for 10x leverage)"
      ),
    from: z
      .string()
      .describe(
        "The base asset symbol for the trading pair (e.g., 'BTC' for a BTC/USD trade)"
      ),
    to: z
      .string()
      .default("USD")
      .describe(
        "The quote asset symbol for the trading pair (defaults to 'USD' - e.g., 'USD' for a BTC/USD trade)"
      ),
    index: z
      .string()
      .default("0")
      .describe(
        "The trade index identifier for this position (defaults to '0' for single positions)"
      ),
    buy: z
      .boolean()
      .default(true)
      .describe(
        "Trade direction: true for long/buy positions, false for short/sell positions (defaults to true)"
      ),
  }),
  _type: z
    .string()
    .default("0")
    .describe(
      "Order type: '0' for market order (execute immediately at current price), '1' for limit order (execute when price reaches specified level), '2' for stop order (trigger when price crosses specified level)"
    ),
  _slippage: z
    .string()
    .default("1500")
    .describe(
      "Maximum acceptable slippage tolerance in basis points (e.g., '1500' = 1.5% slippage tolerance, which is the default)"
    ),
};

export const CloseTradeSchema = {
  from: z
    .string()
    .describe(
      "The base asset symbol of the trading pair to close (e.g., 'BTC' for BTC/USD)"
    ),
  to: z
    .string()
    .default("USD")
    .describe("The quote asset symbol of the trading pair (defaults to 'USD')"),
  _index: z
    .string()
    .default("0")
    .describe(
      "The trade index identifier for the position to close (defaults to '0')"
    ),
  _closePercentage: z
    .string()
    .default("100")
    .describe(
      "The percentage of the position to close in basis points (e.g., '50' for 50%, '100' for full closure)"
    ),
};

export const UpdateTpSchema = {
  from: z
    .string()
    .describe(
      "The base asset symbol of the trading pair (e.g., 'BTC' for BTC/USD)"
    ),
  to: z
    .string()
    .default("USD")
    .describe("The quote asset symbol of the trading pair (defaults to 'USD')"),
  _index: z
    .string()
    .default("0")
    .describe(
      "The trade index identifier for the position to update (defaults to '0')"
    ),
  _newTP: z
    .string()
    .describe("The new take profit price level to set for this position"),
};

export const UpdateSlSchema = {
  from: z
    .string()
    .describe(
      "The base asset symbol of the trading pair (e.g., 'BTC' for BTC/USD)"
    ),
  to: z
    .string()
    .default("USD")
    .describe("The quote asset symbol of the trading pair (defaults to 'USD')"),
  _index: z
    .string()
    .default("0")
    .describe(
      "The trade index identifier for the position to update (defaults to '0')"
    ),
  _newSL: z
    .string()
    .describe("The new stop loss price level to set for this position"),
};

export const ModifyTradeSchema = {
  from: z
    .string()
    .describe(
      "The base asset symbol of the trading pair (e.g., 'BTC' for BTC/USD)"
    ),
  to: z
    .string()
    .default("USD")
    .describe("The quote asset symbol of the trading pair (defaults to 'USD')"),
  _index: z
    .string()
    .default("0")
    .describe(
      "The trade index identifier for the position to modify (defaults to '0')"
    ),
  _amount: z
    .string()
    .describe(
      "The amount to add or remove from the position (positive to increase, negative to decrease)"
    ),
};

export const GetPairDetailsSchema = {
  pairId: z
    .string()
    .describe(
      "The unique identifier for the trading pair (e.g., '1' for BTC/USD, '2' for ETH/USD)"
    ),
};

export const GetOpenTradesSchema = {
  address: z
    .string()
    .describe("The wallet address to retrieve open trading positions for"),
};

export const GetLimitOrdersSchema = {
  address: z
    .string()
    .describe("The wallet address to retrieve pending limit orders for"),
};

export const GetRecentHistorySchema = {
  address: z
    .string()
    .describe("The wallet address to retrieve trading history for"),
  lastNOrders: z
    .number()
    .default(10)
    .describe(
      "The number of recent orders to retrieve (defaults to 10, maximum recommended is 100)"
    ),
};

export const GetOrderByIdSchema = {
  orderId: z
    .string()
    .describe(
      "The unique identifier of the specific order to retrieve details for"
    ),
};

export const GetTradeByIdSchema = {
  tradeId: z
    .string()
    .describe(
      "The unique identifier of the specific trade to retrieve details for"
    ),
};

export const GetAssetPriceSchema = {
  asset: z
    .string()
    .describe("Asset pair symbol (e.g., EURUSD, BTCUSD, GBPUSD)"),
};

export interface OpenTradeParams {
  _trade: {
    collateral: string;
    openPrice?: string;
    tp: string;
    sl: string;
    trader: string;
    leverage: string;
    from: string;
    to?: string;
    index?: string;
    buy?: boolean;
  };
  _type: string;
  _slippage: string;
}

export interface CloseTradeParams {
  from: string;
  to?: string;
  _index?: string;
  _closePercentage: string;
}

export interface UpdateTpParams {
  from: string;
  to?: string;
  _index?: string;
  _newTP: string;
}

export interface UpdateSlParams {
  from: string;
  to?: string;
  _index?: string;
  _newSL: string;
}

export interface ModifyTradeParams {
  from: string;
  to?: string;
  _index?: string;
  _amount: string;
}

export interface GetPairDetailsParams {
  pairId: string;
}

export interface GetOpenTradesParams {
  address: string;
}

export interface GetLimitOrdersParams {
  address: string;
}

export interface GetRecentHistoryParams {
  address: string;
  lastNOrders?: number;
}

export interface GetOrderByIdParams {
  orderId: string;
}

export interface GetTradeByIdParams {
  tradeId: string;
}

import { z } from "zod";

export const HelloToolSchema = {
  name: z.string().default("World").describe("Name to greet"),
};

export const HelloPromptSchema = {
  topic: z.string(),
};

export const OpenTradeSchema = {
  _trade: z.object({
    collateral: z.string(),
    openPrice: z.string().optional(),
    tp: z.string(),
    sl: z.string(),
    trader: z.string(),
    leverage: z.string(),
    from: z.string(),
    to: z.string().default("USD"),
    index: z.string().default("0"),
    buy: z.boolean().default(true),
  }),
  _type: z.string(),
  _slippage: z.string(),
};

export const CloseTradeSchema = {
  from: z.string(),
  to: z.string().default("USD"),
  _index: z.string().default("0"),
  _closePercentage: z.string(),
};

export const UpdateTpSchema = {
  from: z.string(),
  to: z.string().default("USD"),
  _index: z.string().default("0"),
  _newTP: z.string(),
};

export const UpdateSlSchema = {
  from: z.string(),
  to: z.string().default("USD"),
  _index: z.string().default("0"),
  _newSL: z.string(),
};

export const ModifyTradeSchema = {
  from: z.string(),
  to: z.string().default("USD"),
  _index: z.string().default("0"),
  _amount: z.string(),
};

export const GetPairDetailsSchema = {
  pairId: z.string(),
};

export const GetOpenTradesSchema = {
  address: z.string(),
};

export const GetLimitOrdersSchema = {
  address: z.string(),
};

export const GetRecentHistorySchema = {
  address: z.string(),
  lastNOrders: z.number().default(10),
};

export const GetOrderByIdSchema = {
  orderId: z.string(),
};

export const GetTradeByIdSchema = {
  tradeId: z.string(),
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

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
    openPrice: z.string(),
    tp: z.string(),
    sl: z.string(),
    trader: z.string(),
    leverage: z.string(),
    pairIndex: z.string(),
    index: z.string().default("0"),
    buy: z.boolean().default(true),
  }),
  _type: z.string(),
  _slippage: z.string(),
};

export const CloseTradeSchema = {
  _pairIndex: z.string(),
  _index: z.string().default("0"),
  _amount: z.string(),
};

export const UpdateTpSchema = {
  _pairIndex: z.string(),
  _index: z.string().default("0"),
  _newTP: z.string(),
};

export const UpdateSlSchema = {
  _pairIndex: z.string(),
  _index: z.string().default("0"),
  _newSL: z.string(),
};

export const ModifyTradeSchema = {
  _pairIndex: z.string(),
  _index: z.string().default("0"),
  _amount: z.string(),
};

export interface OpenTradeParams {
  _trade: {
    collateral: string;
    openPrice: string;
    tp: string;
    sl: string;
    trader: string;
    leverage: string;
    pairIndex: string;
    index?: string;
    buy?: boolean;
  };
  _type: string;
  _slippage: string;
}

export interface CloseTradeParams {
  _pairIndex: string;
  _index?: string;
  _amount: string;
}

export interface UpdateTpParams {
  _pairIndex: string;
  _index?: string;
  _newTP: string;
}

export interface UpdateSlParams {
  _pairIndex: string;
  _index?: string;
  _newSL: string;
}

export interface ModifyTradeParams {
  _pairIndex: string;
  _index?: string;
  _amount: string;
}

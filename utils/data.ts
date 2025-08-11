import {
  getPairs,
  getPairDetails,
  getOpenTrades,
  getLimitOrders,
  getRecentHistory,
  getOrderById,
  getTradeById,
  getOrders,
} from "./subgraph.js";
import type {
  MappedOrder,
  MappedLimit,
  MappedPosition,
  MappedPair,
} from "./types.js";
import { mapOrder, mapLimit, mapPosition, mapPair } from "./formatter.js";

export const getFormattedPairs = async (): Promise<MappedPair[]> => {
  const pairs = await getPairs();
  return pairs.map(mapPair);
};

export const getFormattedPairDetails = async (
  pairId: string
): Promise<MappedPair> => {
  const pair = await getPairDetails(pairId);
  return mapPair(pair);
};

export const getFormattedOpenTrades = async (
  address: string
): Promise<MappedPosition[]> => {
  const trades = await getOpenTrades(address);
  return trades.map(mapPosition);
};

export const getFormattedLimitOrders = async (
  address: string
): Promise<MappedLimit[]> => {
  const orders = await getLimitOrders(address);
  return orders.map(mapLimit);
};

export const getFormattedOrders = async (): Promise<MappedOrder[]> => {
  const orders = await getOrders();
  return orders.map(mapOrder);
};

export const getFormattedRecentHistory = async (
  address: string,
  lastNOrders = 10
): Promise<MappedOrder[]> => {
  const orders = await getRecentHistory(address, lastNOrders);
  return orders.map(mapOrder);
};

export const getFormattedOrderById = async (
  orderId: string
): Promise<MappedOrder | null> => {
  const order = await getOrderById(orderId);
  return order ? mapOrder(order) : null;
};

export const getFormattedTradeById = async (
  tradeId: string
): Promise<MappedPosition | null> => {
  const trade = await getTradeById(tradeId);
  return trade ? mapPosition(trade) : null;
};

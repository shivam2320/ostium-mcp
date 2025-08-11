import { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import type { Pair, Trade, LimitOrder, Order, MetaData } from "./types";
import { SUBGRAPH_URL } from "./constants.js";

export const client = new GraphQLClient(SUBGRAPH_URL);

export const getPairs = async (): Promise<Pair[]> => {
  console.log("Fetching available pairs");
  const query = gql`
    query getPairs {
      pairs(first: 1000) {
        id
        from
        to
        feed
        overnightMaxLeverage
        longOI
        shortOI
        maxOI
        makerFeeP
        takerFeeP
        makerMaxLeverage
        curFundingLong
        curFundingShort
        curRollover
        totalOpenTrades
        totalOpenLimitOrders
        accRollover
        lastRolloverBlock
        rolloverFeePerBlock
        accFundingLong
        accFundingShort
        lastFundingBlock
        maxFundingFeePerBlock
        lastFundingRate
        hillInflectionPoint
        hillPosScale
        hillNegScale
        springFactor
        sFactorUpScaleP
        sFactorDownScaleP
        lastTradePrice
        maxLeverage
        group {
          id
          name
          minLeverage
          maxLeverage
          maxCollateralP
          longCollateral
          shortCollateral
        }
        fee {
          minLevPos
        }
      }
    }
  `;
  const result = await client.request<{ pairs: Pair[] }>(query);
  return result.pairs;
};

// Get pair details
export const getPairDetails = async (pairId: string): Promise<Pair> => {
  const query = gql`
    query getPairDetails($pair_id: ID!) {
      pair(id: $pair_id) {
        id
        from
        to
        overnightMaxLeverage
        longOI
        shortOI
        maxOI
        makerFeeP
        takerFeeP
        makerMaxLeverage
        curFundingLong
        curFundingShort
        curRollover
        totalOpenTrades
        totalOpenLimitOrders
        accRollover
        lastRolloverBlock
        rolloverFeePerBlock
        accFundingLong
        accFundingShort
        lastFundingBlock
        maxFundingFeePerBlock
        lastFundingRate
        hillInflectionPoint
        hillPosScale
        hillNegScale
        springFactor
        sFactorUpScaleP
        sFactorDownScaleP
        lastTradePrice
        maxLeverage
        group {
          id
          name
          minLeverage
          maxLeverage
          maxCollateralP
          longCollateral
          shortCollateral
        }
        fee {
          minLevPos
        }
      }
    }
  `;
  const result = await client.request<{ pair: Pair }>(query, {
    pair_id: pairId,
  });
  return result.pair;
};

// Get liquidation margin threshold
export const getLiqMarginThresholdP = async (
  client: GraphQLClient
): Promise<string> => {
  const query = gql`
    query metaDatas {
      metaDatas {
        liqMarginThresholdP
      }
    }
  `;
  const result = await client.request<{ metaDatas: MetaData[] }>(query);
  const value = result.metaDatas[0].liqMarginThresholdP;
  console.log(`Fetched get_liq_margin_threshold_p: ${value}%`);
  return value;
};

// Get open trades
export const getOpenTrades = async (address: string): Promise<Trade[]> => {
  const query = gql`
    query trades($trader: Bytes!) {
      trades(where: { isOpen: true, trader: $trader }) {
        tradeID
        collateral
        leverage
        highestLeverage
        openPrice
        stopLossPrice
        takeProfitPrice
        isOpen
        timestamp
        isBuy
        notional
        tradeNotional
        funding
        rollover
        trader
        index
        pair {
          id
          feed
          from
          to
          accRollover
          lastRolloverBlock
          rolloverFeePerBlock
          accFundingLong
          spreadP
          accFundingShort
          longOI
          shortOI
          maxOI
          maxLeverage
          hillInflectionPoint
          hillPosScale
          hillNegScale
          springFactor
          sFactorUpScaleP
          sFactorDownScaleP
          lastFundingBlock
          maxFundingFeePerBlock
          lastFundingRate
          maxLeverage
        }
      }
    }
  `;
  const result = await client.request<{ trades: Trade[] }>(query, {
    trader: address,
  });
  return result.trades;
};

// Get limit orders
export const getLimitOrders = async (trader: string): Promise<LimitOrder[]> => {
  const query = gql`
    query GetLimitOrders($trader: Bytes!) {
      limits(
        where: { trader: $trader, isActive: true }
        orderBy: initiatedAt
        orderDirection: asc
      ) {
        collateral
        leverage
        isBuy
        isActive
        id
        openPrice
        takeProfitPrice
        stopLossPrice
        trader
        initiatedAt
        limitType
        pair {
          id
          feed
          from
          to
          accRollover
          lastRolloverBlock
          rolloverFeePerBlock
          accFundingLong
          spreadP
          accFundingShort
          longOI
          shortOI
          lastFundingBlock
          maxFundingFeePerBlock
          lastFundingRate
        }
      }
    }
  `;
  const result = await client.request<{ limits: LimitOrder[] }>(query, {
    trader,
  });
  return result.limits;
};

// Get recent order history
export const getRecentHistory = async (
  trader: string,
  lastNOrders = 10
): Promise<Order[]> => {
  const query = gql`
    query ListOrdersHistory($trader: Bytes, $last_n_orders: Int) {
      orders(
        where: { trader: $trader, isPending: false }
        first: $last_n_orders
        orderBy: executedAt
        orderDirection: desc
      ) {
        id
        tradeID
        limitID
        trader
        orderType
        orderAction
        price
        priceAfterImpact
        priceImpactP
        collateral
        notional
        tradeNotional
        profitPercent
        totalProfitPercent
        amountSentToTrader
        isBuy
        initiatedAt
        executedAt
        initiatedTx
        executedTx
        initiatedBlock
        executedBlock
        leverage
        isPending
        isCancelled
        cancelReason
        devFee
        vaultFee
        oracleFee
        liquidationFee
        fundingFee
        rolloverFee
        closePercent
        pair {
          id
          from
          to
          feed
          longOI
          shortOI
          group {
            name
          }
        }
      }
    }
  `;
  const result = await client.request<{ orders: Order[] }>(query, {
    trader,
    last_n_orders: lastNOrders,
  });
  return result.orders.reverse();
};

// Get orders
export const getOrders = async (): Promise<Order[]> => {
  const query = gql`
    query GetOrders {
      orders(first: 1000) {
        id
        trader
        pair {
          id
          from
          to
          feed
        }
        tradeID
        limitID
        orderType
        orderAction
        price
        priceAfterImpact
        priceImpactP
        collateral
        notional
        tradeNotional
        profitPercent
        totalProfitPercent
        amountSentToTrader
        isBuy
        initiatedAt
        executedAt
        initiatedTx
        executedTx
        initiatedBlock
        executedBlock
        leverage
        isPending
        isCancelled
        cancelReason
        devFee
        vaultFee
        oracleFee
        liquidationFee
        fundingFee
        rolloverFee
        closePercent
      }
    }
  `;
  const result = await client.request<{ orders: Order[] }>(query);
  return result.orders;
};

// Get order by ID
export const getOrderById = async (orderId: string): Promise<Order | null> => {
  const query = gql`
    query GetOrder($order_id: ID!) {
      orders(where: { id: $order_id }) {
        id
        trader
        pair {
          id
          from
          to
          feed
        }
        tradeID
        limitID
        orderType
        orderAction
        price
        priceAfterImpact
        priceImpactP
        collateral
        notional
        tradeNotional
        profitPercent
        totalProfitPercent
        amountSentToTrader
        isBuy
        initiatedAt
        executedAt
        initiatedTx
        executedTx
        initiatedBlock
        executedBlock
        leverage
        isPending
        isCancelled
        cancelReason
        devFee
        vaultFee
        oracleFee
        liquidationFee
        fundingFee
        rolloverFee
        closePercent
      }
    }
  `;
  const result = await client.request<{ orders: Order[] }>(query, {
    order_id: orderId,
  });
  return result.orders.length > 0 ? result.orders[0] : null;
};

// Get trade by ID
export const getTradeById = async (tradeId: string): Promise<Trade | null> => {
  const query = gql`
    query GetTrade($trade_id: ID!) {
      trades(where: { id: $trade_id }) {
        id
        trader
        pair {
          id
          from
          to
          feed
        }
        index
        tradeID
        tradeType
        openPrice
        closePrice
        takeProfitPrice
        stopLossPrice
        collateral
        notional
        tradeNotional
        highestLeverage
        leverage
        isBuy
        isOpen
        closeInitiated
        funding
        rollover
        timestamp
      }
    }
  `;
  const result = await client.request<{ trades: Trade[] }>(query, {
    trade_id: tradeId,
  });
  return result.trades.length > 0 ? result.trades[0] : null;
};


export interface Group {
  id: string;
  name: string;
  minLeverage: string;
  maxLeverage: string;
  maxCollateralP: string;
  longCollateral: string;
  shortCollateral: string;
}

export interface Fee {
  minLevPos: string;
}

export interface Pair {
  id: string;
  from: string;
  to: string;
  feed: string;
  overnightMaxLeverage: string;
  longOI: string;
  shortOI: string;
  maxOI: string;
  makerFeeP: string;
  takerFeeP: string;
  totalOpenTrades: string;
  totalOpenLimitOrders: string;
  lastFundingRate: string;
  lastTradePrice: string;
  minLeverage: string;
  maxLeverage: string;
  maxCollateralP: string;
  fee: Fee;
}

export interface Trade {
  id?: string;
  tradeID: string;
  trader: string;
  pair: {
      id: string;
      from: string;
      to: string;
      feed: string;
      accRollover: string;
      lastRolloverBlock: string;
      rolloverFeePerBlock: string;
      accFundingLong: string;
      spreadP: string;
      accFundingShort: string;
  };
  index: string;
  tradeType?: string;
  openPrice: string;
  closePrice?: string;
  takeProfitPrice: string;
  stopLossPrice: string;
  collateral: string;
  notional: string;
  tradeNotional: string;
  highestLeverage: string;
  leverage: string;
  isBuy: boolean;
  isOpen: boolean;
  closeInitiated?: boolean;
  funding: string;
  rollover: string;
  timestamp: string;
}

export interface LimitOrder {
  id: string;
  trader: string;
  pair: {
      id: string;
      feed: string;
      from: string;
      to: string;
  };
  collateral: string;
  leverage: string;
  isBuy: boolean;
  isActive: boolean;
  openPrice: string;
  takeProfitPrice: string;
  stopLossPrice: string;
  initiatedAt: string;
  limitType: string;
  block?: string;
  executionStarted?: boolean;
  notional?: string;
  tradeNotional?: string;
  orderId?: string;
  uniqueId?: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  trader: string;
  pair: {
      id: string;
      from: string;
      to: string;
      feed: string;
  };
  tradeID?: string;
  limitID?: string;
  orderType: string;
  orderAction: string;
  price: string;
  priceAfterImpact?: string;
  priceImpactP?: string;
  collateral: string;
  notional: string;
  tradeNotional: string;
  profitPercent?: string;
  totalProfitPercent?: string;
  amountSentToTrader?: string;
  isBuy: boolean;
  initiatedAt: string;
  executedAt?: string;
  initiatedTx?: string;
  executedTx?: string;
  initiatedBlock?: string;
  executedBlock?: string;
  leverage: string;
  isPending: boolean;
  isCancelled: boolean;
  cancelReason?: string;
  devFee?: string;
  vaultFee?: string;
  oracleFee?: string;
  liquidationFee?: string;
  fundingFee?: string;
  rolloverFee?: string;
  closePercent?: string;
}

export interface MetaData {
  liqMarginThresholdP: string;
}

export interface MappedOrder {
  id: string;
  trader: string;
  vaultFee: number;
  tradeNotional: number;
  tradeID: string;
  totalProfitPercent: number;
  rolloverFee: number;
  profitPercent: number;
  priceImpactP: number;
  priceAfterImpact: number;
  price: number;
  orderType: string;
  orderAction: string;
  oracleFee: number;
  notional: number;
  liquidationFee: number;
  limitID: string | null;
  leverage: number;
  isBuy: boolean;
  initiatedTx: string;
  initiatedBlock: number;
  initiatedAt: bigint;
  fundingFee: number;
  executedTx: string;
  executedBlock: number;
  executedAt: bigint;
  devFee: number;
  collateral: number;
  closePercent: number;
  cancelReason: string | null;
  amountSentToTrader: number;
  pairId: string;
}

export interface MappedLimit {
  id: string;
  block: number;
  collateral: number;
  executionStarted: boolean;
  initiatedAt: bigint;
  isActive: boolean;
  isBuy: boolean;
  leverage: number;
  limitType: string;
  notional: number;
  openPrice: number;
  orderId: string;
  pairId: string;
  trader: string;
  tradeNotional: number;
  takeProfitPrice: number | null;
  stopLossPrice: number | null;
  uniqueId: string;
  updatedAt: Date;
}

export interface MappedPosition {
  id: string;
  isOpen: boolean;
  leverage: number;
  notional: number;
  openPrice: number;
  isBuy: boolean;
  index: number;
  highestLeverage: number;
  funding: number;
  collateral: number;
  pairId: string;
  rollover: number;
  stopLossPrice: number | null;
  takeProfitPrice: number | null;
  timestamp: Date | null;
  tradeID: string;
  tradeNotional: number;
  tradeType: string;
  trader: string;
}

export interface MappedPair {
  id: number;
  from: string;
  to: string;
  // Group data flattened to top level
  longOI: number;
  shortOI: number;
  maxOI: number;
  makerFeeP: number;
  takerFeeP: number;
  minLeverage: number;
  maxLeverage: number;
  maxCollateralP: number;
  minLevPos: number;
  lastFundingRate: number;
  lastFundingBlock: number;
  overnightMaxLeverage?: number;
}

export interface FormattedPair {
  id: number;
  from: string;
  to: string;
  group: string;
  longOI: number;
  shortOI: number;
  maxOI: number;
  makerFeeP: number;
  takerFeeP: number;
  minLeverage: number;
  maxLeverage: number;
  makerMaxLeverage: number;
  groupMaxCollateralP: number;
  minLevPos: number;
  lastFundingRate: number;
  curFundingLong: number;
  curFundingShort: number;
  lastFundingBlock: number;
  overnightMaxLeverage?: number;
  price?: number;
  isMarketOpen?: boolean;
  isDayTradingClosed?: boolean;
}

export interface FormattedTrade {
  tradeID: string;
  index: number;
  pair: {
      from: string;
      to: string;
  };
  isOpen: boolean;
  collateral: number;
  leverage: number;
  highestLeverage: number;
  direction: 'Long' | 'Short';
  openPrice: number;
  closePrice?: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  notional: number;
  funding: number;
  tradeType?: string;
}

export interface FormattedOrder {
  status: string;
  isCancelled: boolean;
  cancelReason?: string;
  collateral: number;
  leverage: number;
  direction: 'Long' | 'Short';
  orderType: string;
  orderAction: string;
  price: number;
  tradeID?: string;
}
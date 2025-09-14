import { BigNumber } from '@ethersproject/bignumber';
import { PRECISION_18, PRECISION_6, PRECISION_2 } from './constants';

export function normalize(value: string | null | undefined, decimals: number): number {
    if (!value) return 0;
    const precision = BigNumber.from(10).pow(decimals);
    const divided = BigNumber.from(value).mul(1000).div(precision).toNumber() / 1000;
    return divided;
}

export function safeDateFromSeconds(timestamp: string | null | undefined): Date | null {
    if (!timestamp) return null;
    try {
        return new Date(parseInt(timestamp) * 1000);
    } catch {
        return null;
    }
}

export function mapOrder(order: any) {
    return {
        id: order.id,
        trader: order.trader,
        vaultFee: normalize(order.vaultFee, 6),
        tradeNotional: normalize(order.tradeNotional, 6),
        tradeID: order.tradeID,
        totalProfitPercent: normalize(order.totalProfitPercent, 6),
        rolloverFee: normalize(order.rolloverFee, 6),
        profitPercent: normalize(order.profitPercent, 6),
        priceImpactP: normalize(order.priceImpactP, 18),
        priceAfterImpact: normalize(order.priceAfterImpact, 18),
        price: normalize(order.price, 18),
        orderType: order.orderType,
        orderAction: order.orderAction,
        oracleFee: normalize(order.oracleFee, 6),
        notional: normalize(order.notional, 6),
        liquidationFee: normalize(order.liquidationFee, 6),
        limitID: order.limitID ?? null,
        leverage: normalize(order.leverage, 2),
        isBuy: Boolean(order.isBuy),
        initiatedTx: order.initiatedTx,
        initiatedBlock: Number(order.initiatedBlock),
        initiatedAt: BigInt(order.initiatedAt || 0),
        fundingFee: normalize(order.fundingFee, 6),
        executedTx: order.executedTx,
        executedBlock: Number(order.executedBlock),
        executedAt: BigInt(order.executedAt || 0),
        devFee: normalize(order.devFee, 6),
        collateral: normalize(order.collateral, 6),
        closePercent: normalize(order.closePercent, 2),
        cancelReason: order.cancelReason ?? null,
        amountSentToTrader: normalize(order.amountSentToTrader, 6),
        pairId: order.pair.id,
        pair: `${order.pair.from}${order.pair.to}` 
    };
}

export function mapLimit(limit: any) {
    return {
        id: limit.id,
        block: Number(limit.block),
        collateral: normalize(limit.collateral, 6),
        executionStarted: Boolean(limit.executionStarted),
        initiatedAt: BigInt(limit.initiatedAt || 0),
        isActive: Boolean(limit.isActive),
        isBuy: Boolean(limit.isBuy),
        leverage: normalize(limit.leverage, 2),
        limitType: limit.limitType,
        notional: normalize(limit.notional, 6),
        openPrice: normalize(limit.openPrice, 18),
        orderId: limit.orderId,
        pairId: limit.pair.id,
        trader: limit.trader,
        tradeNotional: normalize(limit.tradeNotional, 6),
        takeProfitPrice: limit.takeProfitPrice !== undefined ? normalize(limit.takeProfitPrice, 18) : null,
        stopLossPrice: limit.stopLossPrice !== undefined ? normalize(limit.stopLossPrice, 18) : null,
        uniqueId: limit.uniqueId,
        updatedAt: safeDateFromSeconds(limit.updatedAt) ?? new Date(0),
    };
}

export function mapPosition(pos: any) {
    return {
        id: pos.id,
        isOpen: Boolean(pos.isOpen),
        leverage: normalize(pos.leverage, 2),
        notional: normalize(pos.notional, 6),
        openPrice: normalize(pos.openPrice, 18),
        isBuy: Boolean(pos.isBuy),
        index: Number(pos.index),
        highestLeverage: Number(pos.highestLeverage),
        funding: normalize(pos.funding, 18),
        collateral: normalize(pos.collateral, 6),
        pairId: pos.pair.id,
        rollover: normalize(pos.rollover, 18),
        stopLossPrice: pos.stopLossPrice !== undefined ? normalize(pos.stopLossPrice, 18) : null,
        takeProfitPrice: pos.takeProfitPrice !== undefined ? normalize(pos.takeProfitPrice, 18) : null,
        timestamp: safeDateFromSeconds(pos.timestamp),
        tradeID: pos.tradeID,
        tradeNotional: normalize(pos.tradeNotional, 6),
        tradeType: pos.tradeType,
        trader: pos.trader,
    };
}

export function mapPair(pair: any) {
    // console.log('takerFeeP', BigNumber.from(pair.takerFeeP).mul(1000).div(PRECISION_6).toNumber() / 1000);
    return {
        id: Number(pair.id),
        from: pair.from,
        to: pair.to,
        volume: pair.volume,
        lastTradePrice: normalize(pair.lastTradePrice, 18),
        minLeverage: normalize(pair.group.minLeverage, 2),
        maxLeverage: normalize(pair.group.maxLeverage, 2),
        maxCollateralP: normalize(pair.group.maxCollateralP, 2),
        longOI: normalize(pair.longOI, 18),
        shortOI: normalize(pair.shortOI, 18),
        maxOI: normalize(pair.maxOI, 6),
        makerFeeP: normalize(pair.makerFeeP, 6),
        takerFeeP: normalize(pair.takerFeeP, 6),
        minLevPos: normalize(pair.fee.minLevPos, 6),
        curFundingLong: pair.curFundingLong,
        curFundingShort: pair.curFundingShort,
        lastFundingRate: pair.lastFundingRate,
        lastFundingBlock: Number(pair.lastFundingBlock),
        overnightMaxLeverage: parseInt(pair.overnightMaxLeverage) !== 0 
            ? normalize(pair.overnightMaxLeverage, 2)
            : undefined
    };
} 
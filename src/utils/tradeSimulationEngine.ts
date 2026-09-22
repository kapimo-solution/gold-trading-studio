import { LiveSimulatedPosition, VirtualTradingAccount } from '../types';

const STORAGE_KEY = 'gold_virtual_account_v1';
const DEFAULT_CAPITAL = 10000; // $10,000 default balance

/**
 * Calculates optimal position lot size so risk in $ exactly matches riskPercent of capital (e.g. 2%).
 * Formula: 1 standard lot of XAU/USD = 100 troy oz.
 * Loss for 1.00 lot = distanceInPoints * 100$.
 * Lot = MaxRiskDollars / (distanceInPoints * 100)
 */
export function calculateOptimalLotForRisk(
  capital: number,
  riskPercent: number,
  entryPrice: number,
  stopLoss: number
): number {
  const distance = Math.abs(entryPrice - stopLoss);
  if (distance <= 0.1 || isNaN(distance) || capital <= 0) {
    return 0.1;
  }
  const maxRiskDollars = capital * (riskPercent / 100);
  const rawLot = maxRiskDollars / (distance * 100);
  // Cap between 0.01 and 100.00 lots, formatted to 2 decimals
  const boundedLot = Math.min(100, Math.max(0.01, rawLot));
  return parseFloat(boundedLot.toFixed(2));
}

/**
 * Calculates risk in dollars and percent of capital for a given lot size and SL
 */
export function calculatePositionRisk(
  lotSize: number,
  entryPrice: number,
  stopLoss: number,
  capital: number
): { riskDollars: number; riskPercent: number; isOverRiskLimit: boolean } {
  const distance = Math.abs(entryPrice - stopLoss);
  const riskDollars = distance * lotSize * 100;
  const riskPercent = capital > 0 ? (riskDollars / capital) * 100 : 0;
  const isOverRiskLimit = riskPercent > 2.05; // Strict 2% rule allowance margin
  return {
    riskDollars: parseFloat(riskDollars.toFixed(2)),
    riskPercent: parseFloat(riskPercent.toFixed(2)),
    isOverRiskLimit,
  };
}

/**
 * Calculates potential profit at TP targets
 */
export function calculatePotentialGain(
  lotSize: number,
  entryPrice: number,
  targetPrice: number
): number {
  const distance = Math.abs(targetPrice - entryPrice);
  return parseFloat((distance * lotSize * 100).toFixed(2));
}

export function loadVirtualAccount(initialCapital = DEFAULT_CAPITAL): VirtualTradingAccount {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.balance === 'number') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load virtual account from localStorage:', e);
  }

  const defaultAccount: VirtualTradingAccount = {
    initialBalance: initialCapital,
    balance: initialCapital,
    equity: initialCapital,
    maxRiskPercent: 2.0, // Strict 2% rule
    openPositions: [],
    closedPositions: [],
    totalRealizedPnl: 0,
    winCount: 0,
    lossCount: 0,
  };
  saveVirtualAccount(defaultAccount);
  return defaultAccount;
}

export function saveVirtualAccount(account: VirtualTradingAccount): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
  } catch (e) {
    console.warn('Failed to save virtual account to localStorage:', e);
  }
}

/**
 * Opens a new simulated position in the virtual account
 */
export function openSimulatedTrade(
  account: VirtualTradingAccount,
  params: {
    type: 'BUY' | 'SELL';
    lotSize: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    takeProfit3: number;
    signalId?: string;
  }
): { updatedAccount: VirtualTradingAccount; newPosition: LiveSimulatedPosition } {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const { riskDollars, riskPercent } = calculatePositionRisk(
    params.lotSize,
    params.entryPrice,
    params.stopLoss,
    account.balance
  );

  const newPosition: LiveSimulatedPosition = {
    id: `pos_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    signalId: params.signalId,
    type: params.type,
    lotSize: params.lotSize,
    entryPrice: params.entryPrice,
    stopLoss: params.stopLoss,
    takeProfit1: params.takeProfit1,
    takeProfit2: params.takeProfit2,
    takeProfit3: params.takeProfit3,
    openTimestamp: Date.now(),
    openTime: timeStr,
    status: 'OPEN',
    currentPrice: params.entryPrice,
    unrealizedPnlDollars: 0,
    unrealizedPnlPercent: 0,
    unrealizedPnlPoints: 0,
    riskDollars,
    riskPercent,
    isBreakevenProtected: false,
  };

  const updatedAccount: VirtualTradingAccount = {
    ...account,
    openPositions: [newPosition, ...account.openPositions],
  };

  saveVirtualAccount(updatedAccount);
  return { updatedAccount, newPosition };
}

/**
 * Updates all open positions with the latest live tick price, calculating live unrealized PnL,
 * and automatically triggers Stop Loss or Take Profit exits when touched.
 */
export function evaluatePositionsLivePrice(
  account: VirtualTradingAccount,
  livePrice: number
): {
  updatedAccount: VirtualTradingAccount;
  closedTrades: { position: LiveSimulatedPosition; reason: string; pnl: number }[];
} {
  if (!account.openPositions || account.openPositions.length === 0) {
    return { updatedAccount: account, closedTrades: [] };
  }

  const closedTrades: { position: LiveSimulatedPosition; reason: string; pnl: number }[] = [];
  const remainingOpen: LiveSimulatedPosition[] = [];
  let addedRealizedPnl = 0;
  let wonCountInc = 0;
  let lostCountInc = 0;

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  for (const pos of account.openPositions) {
    const isBuy = pos.type === 'BUY';
    const pointMove = isBuy ? livePrice - pos.entryPrice : pos.entryPrice - livePrice;
    const floatingPnlDollars = pointMove * pos.lotSize * 100;
    const floatingPnlPercent = account.balance > 0 ? (floatingPnlDollars / account.balance) * 100 : 0;

    // Check Auto-Exit triggers
    let shouldClose = false;
    let closeReason: 'SL' | 'TP1' | 'TP2' | 'TP3' | 'BREAKEVEN' = 'SL';
    let executedPrice = livePrice;

    if (isBuy) {
      if (livePrice <= pos.stopLoss) {
        shouldClose = true;
        closeReason = pos.isBreakevenProtected && pos.stopLoss >= pos.entryPrice ? 'BREAKEVEN' : 'SL';
        executedPrice = pos.stopLoss;
      } else if (livePrice >= pos.takeProfit2) {
        shouldClose = true;
        closeReason = 'TP2';
        executedPrice = pos.takeProfit2;
      }
    } else {
      // SELL position
      if (livePrice >= pos.stopLoss) {
        shouldClose = true;
        closeReason = pos.isBreakevenProtected && pos.stopLoss <= pos.entryPrice ? 'BREAKEVEN' : 'SL';
        executedPrice = pos.stopLoss;
      } else if (livePrice <= pos.takeProfit2) {
        shouldClose = true;
        closeReason = 'TP2';
        executedPrice = pos.takeProfit2;
      }
    }

    if (shouldClose) {
      const finalPointMove = isBuy ? executedPrice - pos.entryPrice : pos.entryPrice - executedPrice;
      const finalPnlDollars = parseFloat((finalPointMove * pos.lotSize * 100).toFixed(2));

      const closedPos: LiveSimulatedPosition = {
        ...pos,
        status: 'CLOSED',
        currentPrice: executedPrice,
        closePrice: executedPrice,
        closeTimestamp: Date.now(),
        closeTime: timeStr,
        closeReason,
        realizedPnlDollars: finalPnlDollars,
        unrealizedPnlDollars: 0,
        unrealizedPnlPoints: parseFloat(finalPointMove.toFixed(2)),
      };

      closedTrades.push({
        position: closedPos,
        reason: closeReason,
        pnl: finalPnlDollars,
      });

      addedRealizedPnl += finalPnlDollars;
      if (finalPnlDollars >= 0) wonCountInc++;
      else lostCountInc++;
    } else {
      // Still open, update floating metrics
      remainingOpen.push({
        ...pos,
        currentPrice: livePrice,
        unrealizedPnlPoints: parseFloat(pointMove.toFixed(2)),
        unrealizedPnlDollars: parseFloat(floatingPnlDollars.toFixed(2)),
        unrealizedPnlPercent: parseFloat(floatingPnlPercent.toFixed(2)),
      });
    }
  }

  const newBalance = parseFloat((account.balance + addedRealizedPnl).toFixed(2));
  const totalUnrealized = remainingOpen.reduce((sum, p) => sum + p.unrealizedPnlDollars, 0);
  const newEquity = parseFloat((newBalance + totalUnrealized).toFixed(2));

  const updatedAccount: VirtualTradingAccount = {
    ...account,
    balance: newBalance,
    equity: newEquity,
    openPositions: remainingOpen,
    closedPositions: [...closedTrades.map(c => c.position), ...account.closedPositions],
    totalRealizedPnl: parseFloat((account.totalRealizedPnl + addedRealizedPnl).toFixed(2)),
    winCount: account.winCount + wonCountInc,
    lossCount: account.lossCount + lostCountInc,
  };

  saveVirtualAccount(updatedAccount);
  return { updatedAccount, closedTrades };
}

/**
 * Manually closes an open position at current live price
 */
export function closePositionManual(
  account: VirtualTradingAccount,
  positionId: string,
  currentPrice: number
): { updatedAccount: VirtualTradingAccount; closedPosition: LiveSimulatedPosition | null } {
  const target = account.openPositions.find(p => p.id === positionId);
  if (!target) return { updatedAccount: account, closedPosition: null };

  const isBuy = target.type === 'BUY';
  const pointMove = isBuy ? currentPrice - target.entryPrice : target.entryPrice - currentPrice;
  const finalPnlDollars = parseFloat((pointMove * target.lotSize * 100).toFixed(2));

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const closedPos: LiveSimulatedPosition = {
    ...target,
    status: 'CLOSED',
    currentPrice,
    closePrice: currentPrice,
    closeTimestamp: Date.now(),
    closeTime: timeStr,
    closeReason: 'MANUAL',
    realizedPnlDollars: finalPnlDollars,
    unrealizedPnlDollars: 0,
    unrealizedPnlPoints: parseFloat(pointMove.toFixed(2)),
  };

  const newBalance = parseFloat((account.balance + finalPnlDollars).toFixed(2));
  const remainingOpen = account.openPositions.filter(p => p.id !== positionId);
  const totalUnrealized = remainingOpen.reduce((sum, p) => sum + p.unrealizedPnlDollars, 0);

  const updatedAccount: VirtualTradingAccount = {
    ...account,
    balance: newBalance,
    equity: parseFloat((newBalance + totalUnrealized).toFixed(2)),
    openPositions: remainingOpen,
    closedPositions: [closedPos, ...account.closedPositions],
    totalRealizedPnl: parseFloat((account.totalRealizedPnl + finalPnlDollars).toFixed(2)),
    winCount: finalPnlDollars >= 0 ? account.winCount + 1 : account.winCount,
    lossCount: finalPnlDollars < 0 ? account.lossCount + 1 : account.lossCount,
  };

  saveVirtualAccount(updatedAccount);
  return { updatedAccount, closedPosition: closedPos };
}

/**
 * Secures a position to Break-Even (moves SL to entry price, guaranteeing 0 loss)
 */
export function setPositionBreakeven(
  account: VirtualTradingAccount,
  positionId: string
): VirtualTradingAccount {
  const updatedOpen = account.openPositions.map(p => {
    if (p.id === positionId) {
      return {
        ...p,
        stopLoss: p.entryPrice,
        isBreakevenProtected: true,
        riskDollars: 0,
        riskPercent: 0,
      };
    }
    return p;
  });

  const updatedAccount: VirtualTradingAccount = {
    ...account,
    openPositions: updatedOpen,
  };

  saveVirtualAccount(updatedAccount);
  return updatedAccount;
}

/**
 * Resets the simulated trading account with a specified initial capital
 */
export function resetVirtualAccount(newCapital = DEFAULT_CAPITAL): VirtualTradingAccount {
  const fresh: VirtualTradingAccount = {
    initialBalance: newCapital,
    balance: newCapital,
    equity: newCapital,
    maxRiskPercent: 2.0,
    openPositions: [],
    closedPositions: [],
    totalRealizedPnl: 0,
    winCount: 0,
    lossCount: 0,
  };
  saveVirtualAccount(fresh);
  return fresh;
}

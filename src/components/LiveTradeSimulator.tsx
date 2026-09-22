import React, { useState } from 'react';
import {
  LiveSimulatedPosition,
  VirtualTradingAccount,
  TradeSignal,
} from '../types';
import {
  calculateOptimalLotForRisk,
  calculatePositionRisk,
  calculatePotentialGain,
} from '../utils/tradeSimulationEngine';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  DollarSign,
  Target,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  X,
  Lock,
} from 'lucide-react';

interface LiveTradeSimulatorProps {
  currentPrice: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  activeSignal?: TradeSignal | null;
  lotSize: number;
  onLotSizeChange: (newLot: number) => void;
  virtualAccount: VirtualTradingAccount;
  onOpenTrade: (params: {
    type: 'BUY' | 'SELL';
    lotSize: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    takeProfit3: number;
    signalId?: string;
  }) => void;
  onCloseTrade: (positionId: string) => void;
  onBreakevenTrade: (positionId: string) => void;
  onResetAccount: (capital: number) => void;
  symbolName?: string;
}

export const LiveTradeSimulator: React.FC<LiveTradeSimulatorProps> = ({
  currentPrice,
  entryPrice,
  stopLoss,
  takeProfit1,
  takeProfit2,
  takeProfit3,
  activeSignal,
  lotSize,
  onLotSizeChange,
  virtualAccount,
  onOpenTrade,
  onCloseTrade,
  onBreakevenTrade,
  onResetAccount,
  symbolName = 'XAU/USD (Or)',
}) => {
  const [customLotInput, setCustomLotInput] = useState<string>(lotSize.toString());
  const [showCapitalModal, setShowCapitalModal] = useState<boolean>(false);
  const [selectedCapital, setSelectedCapital] = useState<number>(virtualAccount.balance);
  const [tradeConfirmationNotice, setTradeConfirmationNotice] = useState<string | null>(null);

  // Suggested trade direction from activeSignal or market bias
  const tradeType: 'BUY' | 'SELL' = activeSignal ? activeSignal.type : entryPrice > stopLoss ? 'BUY' : 'SELL';
  const isBuy = tradeType === 'BUY';

  // Calculate strict 2% max loss metrics
  const maxAllowedRiskDollars = virtualAccount.balance * (virtualAccount.maxRiskPercent / 100);
  const { riskDollars, riskPercent, isOverRiskLimit } = calculatePositionRisk(
    lotSize,
    entryPrice,
    stopLoss,
    virtualAccount.balance
  );

  const gainTp1 = calculatePotentialGain(lotSize, entryPrice, takeProfit1);
  const gainTp2 = calculatePotentialGain(lotSize, entryPrice, takeProfit2);
  const gainTp3 = calculatePotentialGain(lotSize, entryPrice, takeProfit3);

  // Optimal lot calculation for strict 2% risk rule
  const optimal2PercentLot = calculateOptimalLotForRisk(
    virtualAccount.balance,
    virtualAccount.maxRiskPercent,
    entryPrice,
    stopLoss
  );

  const handleApplyOptimalLot = () => {
    onLotSizeChange(optimal2PercentLot);
    setCustomLotInput(optimal2PercentLot.toString());
  };

  const handleManualLotChange = (valStr: string) => {
    setCustomLotInput(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && parsed > 0) {
      onLotSizeChange(parseFloat(Math.min(100, Math.max(0.01, parsed)).toFixed(2)));
    }
  };

  const handleExecute1ClickTrade = () => {
    onOpenTrade({
      type: tradeType,
      lotSize,
      entryPrice: currentPrice || entryPrice,
      stopLoss,
      takeProfit1,
      takeProfit2,
      takeProfit3,
      signalId: activeSignal?.id,
    });
    setTradeConfirmationNotice(`Position ${tradeType} de ${lotSize} lot exécutée au cours de $${(currentPrice || entryPrice).toFixed(2)} !`);
    setTimeout(() => setTradeConfirmationNotice(null), 5000);
  };

  const openPositions = virtualAccount.openPositions || [];
  const closedPositions = virtualAccount.closedPositions || [];
  const totalFloatingPnl = openPositions.reduce((sum, p) => sum + p.unrealizedPnlDollars, 0);

  return (
    <div className="space-y-4">
      {/* POPUP CONFIRMATION NOTIFICATION */}
      {tradeConfirmationNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 flex items-center justify-between text-xs font-mono animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{tradeConfirmationNotice}</span>
          </div>
          <button
            onClick={() => setTradeConfirmationNotice(null)}
            className="text-emerald-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. VIRTUAL ACCOUNT STATUS BAR (SIMULATION COMPTE RÉEL MT5) */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0a1120] to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Account Metrics */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 font-sans text-xs">Compte Simulation MT5 :</span>
                  <button
                    onClick={() => setShowCapitalModal(true)}
                    className="text-[10px] text-cyan-400 underline hover:text-cyan-300 font-sans font-semibold"
                    title="Changer le capital du compte démo"
                  >
                    Modifier Capital
                  </button>
                </div>
                <div className="text-base sm:text-lg font-bold text-white tracking-tight">
                  ${virtualAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-800 hidden sm:block" />

            {/* Équité en Temps Réel */}
            <div>
              <span className="text-slate-400 font-sans text-xs">Équité Live :</span>
              <div
                className={`text-sm sm:text-base font-bold ${
                  virtualAccount.equity >= virtualAccount.balance ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ${virtualAccount.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="h-8 w-px bg-slate-800 hidden sm:block" />

            {/* PnL Flottant en Temps Réel */}
            <div>
              <span className="text-slate-400 font-sans text-xs">Gain/Perte Flottant :</span>
              <div
                className={`text-sm sm:text-base font-bold flex items-center space-x-1 ${
                  totalFloatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                <span>
                  {totalFloatingPnl >= 0 ? '+' : ''}${totalFloatingPnl.toFixed(2)}
                </span>
                <span className="text-[11px] opacity-80">
                  ({virtualAccount.balance > 0 ? ((totalFloatingPnl / virtualAccount.balance) * 100).toFixed(2) : 0}%)
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-800 hidden sm:block" />

            {/* Strict 2% Rule Indicator */}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Règle Risque Max : <strong>2% (${maxAllowedRiskDollars.toFixed(0)})</strong>
              </span>
            </div>
          </div>

          {/* Right Action: Reset Button */}
          <div className="flex items-center space-x-2">
            <button
              id="btn-reset-virtual-account"
              onClick={() => onResetAccount(virtualAccount.initialBalance || 10000)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all"
              title="Réinitialiser le compte de simulation au capital de départ"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Réinitialiser Compte</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. SÉLECTION DU LOT PERSONNALISÉ & GESTION DU RISQUE 2% */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-base">
                  Sélection du Lot & Gestion du Risque 2%
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  {symbolName}
                </span>
              </div>
              <p className="text-slate-400 text-xs">
                Saisissez votre taille de lot personnalisée ou cliquez sur le calcul automatique à 2% du capital.
              </p>
            </div>
          </div>

          {/* Button: Auto 2% Lot Calculation */}
          <button
            id="btn-apply-2percent-lot"
            onClick={handleApplyOptimalLot}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-mono font-black text-xs shadow-lg shadow-amber-950/40 transition-all active:scale-95"
            title="Calcule la taille de lot exacte pour risquer exactement 2% du capital"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>Calculer Lot à 2% ({optimal2PercentLot} lot = -${maxAllowedRiskDollars.toFixed(0)})</span>
          </button>
        </div>

        {/* Lot Selector Input + Quick Presets */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pt-1">
          {/* Custom Lot Numeric Input */}
          <div className="lg:col-span-4 flex items-center space-x-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-mono pl-1">Taille du Lot :</span>
            <input
              id="input-custom-lot-size"
              type="number"
              step="0.01"
              min="0.01"
              max="100"
              value={customLotInput}
              onChange={e => handleManualLotChange(e.target.value)}
              className="w-24 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg px-2.5 py-1 text-white font-mono font-bold text-sm text-center focus:outline-none"
            />
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => {
                  const n = Math.max(0.01, parseFloat((lotSize - 0.01).toFixed(2)));
                  onLotSizeChange(n);
                  setCustomLotInput(n.toString());
                }}
                className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs flex items-center justify-center transition-colors"
                title="-0.01 lot"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => {
                  const n = parseFloat((lotSize + 0.01).toFixed(2));
                  onLotSizeChange(n);
                  setCustomLotInput(n.toString());
                }}
                className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs flex items-center justify-center transition-colors"
                title="+0.01 lot"
              >
                +
              </button>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">lots</span>
          </div>

          {/* Quick Lot Buttons */}
          <div className="lg:col-span-8 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 font-mono pr-1">Raccourcis :</span>
            {[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0].map(s => (
              <button
                key={s}
                onClick={() => {
                  onLotSizeChange(s);
                  setCustomLotInput(s.toString());
                }}
                className={`px-2.5 py-1 rounded-lg font-mono text-xs font-semibold transition-all ${
                  lotSize === s
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                    : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {s} lot
              </button>
            ))}
          </div>
        </div>

        {/* OVER-RISK ALERT IF LOT EXCEEDS 2% */}
        {isOverRiskLimit && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-start space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="text-rose-300 font-semibold">
                Attention : Règle des 2% dépassée !
              </strong>
              <p className="text-[11px] text-rose-200 leading-relaxed">
                Avec <strong>{lotSize} lot</strong>, votre perte en cas de Stop Loss sera de{' '}
                <strong className="text-white">-${riskDollars.toFixed(0)} ({riskPercent.toFixed(1)}% de votre compte)</strong>.
                Pour protéger votre capital, cliquez sur le bouton ci-dessus pour ajuster automatiquement le lot à{' '}
                <button
                  onClick={handleApplyOptimalLot}
                  className="underline font-bold text-white hover:text-amber-300"
                >
                  {optimal2PercentLot} lot (2.0% max)
                </button>.
              </p>
            </div>
          </div>
        )}

        {/* Risk & Potential Profit Cards for Current Lot */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs pt-1">
          {/* Risk Card */}
          <div
            className={`p-3 rounded-xl border ${
              isOverRiskLimit
                ? 'bg-rose-950/40 border-rose-600/70 text-rose-300'
                : 'bg-slate-950/70 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Risque SL ({Math.abs(entryPrice - stopLoss).toFixed(1)} pts) :</span>
              <span className={`font-bold ${isOverRiskLimit ? 'text-rose-400' : 'text-amber-400'}`}>
                {riskPercent.toFixed(1)}%
              </span>
            </div>
            <div className="text-base font-bold text-rose-400">
              -${riskDollars.toFixed(0)}
            </div>
          </div>

          {/* TP1 Card */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Gain TP1 (1:2) :</span>
              <span className="text-emerald-400 font-bold">+{(gainTp1 / (virtualAccount.balance || 1) * 100).toFixed(1)}%</span>
            </div>
            <div className="text-base font-bold text-emerald-400">
              +${gainTp1.toFixed(0)}
            </div>
          </div>

          {/* TP2 Card */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Gain TP2 (1:3) :</span>
              <span className="text-emerald-400 font-bold">+{(gainTp2 / (virtualAccount.balance || 1) * 100).toFixed(1)}%</span>
            </div>
            <div className="text-base font-bold text-emerald-300">
              +${gainTp2.toFixed(0)}
            </div>
          </div>

          {/* TP3 Card */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Gain TP3 (1:5+) :</span>
              <span className="text-emerald-400 font-bold">+{(gainTp3 / (virtualAccount.balance || 1) * 100).toFixed(1)}%</span>
            </div>
            <div className="text-base font-bold text-emerald-200">
              +${gainTp3.toFixed(0)}
            </div>
          </div>
        </div>

        {/* 3. ONE-CLICK TRADE EXECUTION BUTTON */}
        <div className="pt-2">
          <button
            id="btn-execute-1click-trade"
            onClick={handleExecute1ClickTrade}
            className={`w-full py-3.5 px-4 rounded-xl font-mono font-black text-sm tracking-wide flex items-center justify-center space-x-3 shadow-2xl transition-all active:scale-[0.99] ${
              isBuy
                ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 shadow-emerald-950/50'
                : 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-500 hover:from-rose-500 hover:to-red-400 text-white shadow-rose-950/50'
            }`}
          >
            <Zap className="w-5 h-5 fill-current animate-pulse" />
            <span>
              ⚡ PRENDRE POSITION EN 1-CLIC : {isBuy ? 'ACHAT (LONG)' : 'VENTE (SHORT)'} {lotSize} LOT @ ${(currentPrice || entryPrice).toFixed(2)}
            </span>
          </button>
        </div>
      </div>

      {/* 4. LIVE OPEN POSITIONS TRACKER (SUIVI EN TEMPS RÉEL DU TRADE SIMULÉ) */}
      {openPositions.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-[#0a1526] to-slate-900 border border-cyan-500/40 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
              </span>
              <h4 className="font-bold text-white text-sm">
                Position Ouverte en Cours ({openPositions.length}) - Suivi des Gains Live
              </h4>
            </div>
            <span className="text-xs font-mono text-cyan-300">
              Cours Actuel : <strong>${currentPrice.toFixed(2)}</strong>
            </span>
          </div>

          <div className="space-y-3">
            {openPositions.map(pos => {
              const isPosBuy = pos.type === 'BUY';
              const pnl = pos.unrealizedPnlDollars;
              const isProfit = pnl >= 0;

              // Calculate progress towards TP or SL
              const totalRange = Math.abs(pos.takeProfit2 - pos.stopLoss);
              const progressPct = totalRange > 0
                ? Math.min(100, Math.max(0, ((currentPrice - pos.stopLoss) / totalRange) * 100))
                : 50;

              return (
                <div
                  key={pos.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isProfit
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : 'bg-rose-950/20 border-rose-500/40'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    {/* Position Details */}
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                            isPosBuy ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                          }`}
                        >
                          {pos.type} {pos.lotSize} LOT
                        </span>
                        <span className="text-xs font-mono text-white font-bold">
                          Entrée : ${pos.entryPrice.toFixed(2)}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          ({pos.openTime})
                        </span>
                        {pos.isBreakevenProtected && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold flex items-center space-x-1">
                            <ShieldCheck className="w-3 h-3 text-cyan-400" />
                            <span>0 Risque (BE)</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-300">
                        <span>
                          SL : <strong className="text-rose-400">${pos.stopLoss.toFixed(2)}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          TP1 : <strong className="text-emerald-400">${pos.takeProfit1.toFixed(2)}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          TP2 : <strong className="text-emerald-300">${pos.takeProfit2.toFixed(2)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Live Floating PnL Display */}
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-mono uppercase">
                          Gain / Perte Live
                        </div>
                        <div
                          className={`text-xl sm:text-2xl font-mono font-black tracking-tight ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? '+' : ''}${pnl.toFixed(2)}
                        </div>
                        <div
                          className={`text-xs font-mono font-bold ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? '+' : ''}{pos.unrealizedPnlPercent.toFixed(2)}% ({pos.unrealizedPnlPoints >= 0 ? '+' : ''}{pos.unrealizedPnlPoints.toFixed(1)} pts)
                        </div>
                      </div>

                      {/* Position Actions */}
                      <div className="flex items-center space-x-2">
                        {!pos.isBreakevenProtected && (
                          <button
                            id={`btn-be-${pos.id}`}
                            onClick={() => onBreakevenTrade(pos.id)}
                            className="px-3 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center space-x-1.5 transition-colors"
                            title="Déplacer le Stop Loss au prix d'entrée pour éliminer tout risque de perte"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Sécuriser BE</span>
                          </button>
                        )}

                        <button
                          id={`btn-close-${pos.id}`}
                          onClick={() => onCloseTrade(pos.id)}
                          className="px-3 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-mono font-bold flex items-center space-x-1.5 transition-colors shadow-md"
                          title="Clôturer immédiatement la position au prix actuel"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Clôturer Trade</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Visual Progress Bar to Target */}
                  <div className="mt-3 pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span className="text-rose-400">SL ${pos.stopLoss.toFixed(2)}</span>
                      <span className="text-amber-300">Actuel ${currentPrice.toFixed(2)}</span>
                      <span className="text-emerald-400">TP2 ${pos.takeProfit2.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isProfit ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. HISTORIQUE RÉCENT DES POSITIONS CLÔTURÉES DANS LE COMPTE SIMULATION */}
      {closedPositions.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-sans font-bold text-white text-xs">
              Derniers Trades Simulés Clôturés ({closedPositions.length}) :
            </span>
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="text-emerald-400 font-bold">{virtualAccount.winCount} Gagnants</span>
              <span className="text-rose-400 font-bold">{virtualAccount.lossCount} Perdants</span>
              <span className={virtualAccount.totalRealizedPnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                PnL Total : {virtualAccount.totalRealizedPnl >= 0 ? '+' : ''}${virtualAccount.totalRealizedPnl.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
            {closedPositions.slice(0, 5).map(pos => {
              const isProfit = (pos.realizedPnlDollars || 0) >= 0;
              return (
                <div
                  key={pos.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px]"
                >
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        pos.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {pos.type} {pos.lotSize}L
                    </span>
                    <span className="text-slate-300">
                      ${pos.entryPrice.toFixed(2)} → ${pos.closePrice?.toFixed(2) || '—'}
                    </span>
                    <span className="text-slate-500">
                      ({pos.closeReason === 'TP2' ? '🎯 TP2' : pos.closeReason === 'SL' ? '🛑 SL' : pos.closeReason === 'BREAKEVEN' ? '🛡 BE' : '✋ Manuel'})
                    </span>
                  </div>

                  <div className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isProfit ? '+' : ''}${pos.realizedPnlDollars?.toFixed(2)} ({pos.unrealizedPnlPoints ? (pos.unrealizedPnlPoints >= 0 ? `+${pos.unrealizedPnlPoints} pts` : `${pos.unrealizedPnlPoints} pts`) : ''})
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: CHANGER LE CAPITAL DU COMPTE */}
      {showCapitalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white text-base">
                Capital du Compte de Simulation
              </h4>
              <button
                onClick={() => setShowCapitalModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Choisissez le montant du capital pour simuler fidèlement les gains et pertes réels avec la règle des <strong>2% maximum de risque</strong> :
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[1000, 5000, 10000, 25000, 50000, 100000].map(cap => (
                <button
                  key={cap}
                  onClick={() => setSelectedCapital(cap)}
                  className={`p-2.5 rounded-xl font-mono text-xs font-bold transition-all ${
                    selectedCapital === cap
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  ${cap.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => {
                  onResetAccount(selectedCapital);
                  setShowCapitalModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
              >
                Appliquer Capital (${selectedCapital.toLocaleString()})
              </button>
              <button
                onClick={() => setShowCapitalModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

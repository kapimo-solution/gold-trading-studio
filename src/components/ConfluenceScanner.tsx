import React from 'react';
import {
  Zone,
  VolumeProfileData,
  AMDPhase,
  TradeSignal,
  IndicatorSettings,
  OTEZone,
  MarketStructure,
} from '../types';
import {
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Layers,
} from 'lucide-react';

interface ConfluenceScannerProps {
  amdPhase: AMDPhase | null;
  volumeProfile: VolumeProfileData | null;
  demandZones: Zone[];
  supplyZones: Zone[];
  signals: TradeSignal[];
  settings: IndicatorSettings;
  oteZone?: OTEZone | null;
  marketStructure?: MarketStructure;
}

export const ConfluenceScanner: React.FC<ConfluenceScannerProps> = ({
  amdPhase,
  volumeProfile,
  demandZones,
  supplyZones,
  signals,
  settings,
  oteZone,
  marketStructure,
}) => {
  const latestSignal = signals.length > 0 ? signals[signals.length - 1] : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
      {/* 1. AMD & Structure Card */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium text-[11px]">Structure & Cycle AMD</span>
          <span className="p-1 rounded bg-amber-500/10 text-amber-400 font-mono text-[10px]">
            {marketStructure?.trend || 'ICT P3'}
          </span>
        </div>
        <div>
          {amdPhase ? (
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold text-white text-sm">
                  {amdPhase.status === 'distributing'
                    ? '3. Distribution en cours'
                    : amdPhase.status === 'manipulated'
                    ? '2. Manipulation validée'
                    : '1. Accumulation'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tendance :{' '}
                <span className="text-emerald-300 font-medium">
                  {marketStructure?.trend === 'BULLISH'
                    ? 'Haussière (HH / HL)'
                    : marketStructure?.trend === 'BEARISH'
                    ? 'Baissière (LH / LL)'
                    : 'Consolidation / Range'}
                </span>
              </p>
            </div>
          ) : (
            <span className="text-slate-500 italic">En attente de consolidation...</span>
          )}
        </div>
      </div>

      {/* 2. Fixed Range POC Card */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-yellow-500/30 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium text-[11px]">Volume Profile & POC</span>
          <span className="p-1 rounded bg-yellow-500/10 text-yellow-400 font-mono text-[10px]">
            FRVP
          </span>
        </div>
        <div>
          {volumeProfile ? (
            <div className="space-y-1">
              <div className="flex items-baseline space-x-2">
                <span className="text-lg font-mono font-bold text-yellow-400">
                  {volumeProfile.pocPrice >= 100
                    ? volumeProfile.pocPrice.toFixed(1)
                    : volumeProfile.pocPrice.toFixed(4)}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Point of Control</span>
              </div>
              <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-mono">
                <span>VAH: {volumeProfile.vahPrice.toFixed(1)}</span>
                <span>VAL: {volumeProfile.valPrice.toFixed(1)}</span>
              </div>
            </div>
          ) : (
            <span className="text-slate-500 italic">Calcul sur l'accumulation...</span>
          )}
        </div>
      </div>

      {/* 3. OTE & Zones d'Ordres */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium text-[11px]">Zone d'Achat & OTE</span>
          <span className="p-1 rounded bg-cyan-500/10 text-cyan-400 font-mono text-[10px]">
            Order Blocks
          </span>
        </div>
        <div className="space-y-1">
          {oteZone ? (
            <div className="space-y-0.5 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">OTE Sweet Spot :</span>
                <span className="font-bold text-amber-400">${oteZone.fib705.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Demande (Buy) : {demandZones.length}</span>
                <span>Offre (Sell) : {supplyZones.length}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Demande (Buy) :</span>
                <span className="font-mono font-bold text-cyan-400">{demandZones.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Offre (Sell) :</span>
                <span className="font-mono font-bold text-pink-400">{supplyZones.length}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Latest Sniper Signal Card */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/40 flex flex-col justify-between space-y-2 shadow-lg shadow-emerald-950/20">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium text-[11px]">Plan de Trade Sniper</span>
          {latestSignal && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950">
              {latestSignal.confluenceScore}% Confluence
            </span>
          )}
        </div>
        <div>
          {latestSignal ? (
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5">
                {latestSignal.type === 'BUY' ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-rose-400" />
                )}
                <span className="font-bold text-emerald-400 font-mono text-sm">
                  {latestSignal.type} @ {latestSignal.price.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="text-rose-400 font-semibold">SL: {latestSignal.stopLoss.toFixed(1)}</span>
                <span className="text-emerald-400 font-semibold">
                  TP: {latestSignal.takeProfit1.toFixed(1)} (1:{latestSignal.riskReward})
                </span>
              </div>
            </div>
          ) : (
            <span className="text-slate-500 italic">En attente de confluence...</span>
          )}
        </div>
      </div>
    </div>
  );
};


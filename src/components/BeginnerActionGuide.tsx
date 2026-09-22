import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  PauseCircle,
  ShieldCheck,
  Target,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export type ActionDecision = 'BUY' | 'SELL' | 'WAIT';

interface BeginnerActionGuideProps {
  decision: ActionDecision;
  confidenceScore: number;
  currentPrice: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  lotSize: number;
  totalRiskDollars: number;
  totalGainTp1: number;
  totalGainTp2: number;
  totalGainTp3: number;
  trend: 'BULLISH' | 'BEARISH' | 'RANGING';
  oteActive: boolean;
  orderBlockNear: boolean;
  reason: string;
}

export const BeginnerActionGuide: React.FC<BeginnerActionGuideProps> = ({
  decision,
  confidenceScore,
  currentPrice,
  entryPrice,
  stopLoss,
  takeProfit1,
  takeProfit2,
  takeProfit3,
  lotSize,
  totalRiskDollars,
  totalGainTp1,
  totalGainTp2,
  totalGainTp3,
  trend,
  oteActive,
  orderBlockNear,
  reason,
}) => {
  const [showFaq, setShowFaq] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const toggleStep = (stepNum: number) => {
    setCompletedSteps(prev => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  const isBuy = decision === 'BUY';
  const isSell = decision === 'SELL';
  const isWait = decision === 'WAIT';

  return (
    <div className="space-y-4">
      {/* 1. ULTRA-CLEAR DIRECT ACTION BANNER (ACHETER / VENDRE / ATTENDRE) */}
      <div
        className={`p-5 sm:p-6 rounded-2xl border-2 shadow-2xl transition-all ${
          isBuy
            ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/60 border-emerald-500 shadow-emerald-950/50'
            : isSell
            ? 'bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/60 border-rose-500 shadow-rose-950/50'
            : 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/60 border-amber-500 shadow-amber-950/50'
        }`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider ${
                  isBuy
                    ? 'bg-emerald-500 text-slate-950'
                    : isSell
                    ? 'bg-rose-500 text-white'
                    : 'bg-amber-400 text-slate-950'
                }`}
              >
                Ordre Direct Immédiat
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Indice de Confluence :{' '}
                <strong className={isBuy ? 'text-emerald-400' : isSell ? 'text-rose-400' : 'text-amber-400'}>
                  {confidenceScore}%
                </strong>
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${
                  isBuy
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : isSell
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}
              >
                {isBuy ? (
                  <TrendingUp className="w-7 h-7 animate-bounce" />
                ) : isSell ? (
                  <TrendingDown className="w-7 h-7 animate-bounce" />
                ) : (
                  <PauseCircle className="w-7 h-7 animate-pulse" />
                )}
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center space-x-2">
                  <span>
                    {isBuy
                      ? 'VOUS DEVEZ ACHETER (LONG)'
                      : isSell
                      ? 'VOUS DEVEZ VENDRE (SHORT)'
                      : 'PATIENTEZ : NE PAS ENTRER ENCORE'}
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-medium">
                  {reason}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Price Cheat Sheet Card */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-wrap lg:flex-col gap-2.5 font-mono text-xs w-full lg:w-auto">
            <div className="flex justify-between items-center space-x-4">
              <span className="text-slate-400">Prix d'Entrée Recommandé :</span>
              <span className="font-bold text-base text-amber-400">${entryPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center space-x-4">
              <span className="text-rose-400 font-semibold">Stop Loss Obligatoire (SL) :</span>
              <span className="font-bold text-rose-400">${stopLoss.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center space-x-4">
              <span className="text-emerald-400 font-semibold">Objectif 1 (TP1) :</span>
              <span className="font-bold text-emerald-300">${takeProfit1.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center space-x-4">
              <span className="text-emerald-400 font-semibold">Objectif 2 (TP2 - Idéal) :</span>
              <span className="font-bold text-emerald-400">${takeProfit2.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ÉTAPES PAS À PAS NUMÉROTÉES POUR DÉBUTANTS (CHECKLIST POUR MAXIMISER LES GAINS) */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Protocole Sniper Débutant : 5 Étapes pour Gagner sur l'Or
              </h3>
              <p className="text-[11px] text-slate-400">
                Suivez ce protocole étape par étape sur votre courtier (MetaTrader 4/5, TradingView ou Broker).
              </p>
            </div>
          </div>

          <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 self-start sm:self-auto">
            {Object.values(completedSteps).filter(Boolean).length} / 5 étapes validées
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Étape 1 */}
          <div
            onClick={() => toggleStep(1)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              completedSteps[1]
                ? 'bg-emerald-950/30 border-emerald-500/40 text-slate-300'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center space-x-2 text-xs font-bold text-white">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">
                  1
                </span>
                <span>Choisir votre Lot (Gestion du Risque)</span>
              </span>
              <CheckCircle2
                className={`w-4 h-4 ${completedSteps[1] ? 'text-emerald-400' : 'text-slate-600'}`}
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Pour {lotSize} lot sur l'or, votre risque maximum est bloqué à{' '}
              <strong className="text-rose-400">-${totalRiskDollars.toFixed(0)}</strong>. Ne risquez jamais plus de 1% à 2% du capital de votre compte.
            </p>
          </div>

          {/* Étape 2 */}
          <div
            onClick={() => toggleStep(2)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              completedSteps[2]
                ? 'bg-emerald-950/30 border-emerald-500/40 text-slate-300'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center space-x-2 text-xs font-bold text-white">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">
                  2
                </span>
                <span>Placer l'Ordre ({isBuy ? 'ACHAT' : isSell ? 'VENTE' : 'ATTENTE'})</span>
              </span>
              <CheckCircle2
                className={`w-4 h-4 ${completedSteps[2] ? 'text-emerald-400' : 'text-slate-600'}`}
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {isBuy ? (
                <>
                  Cliquez sur <strong>BUY</strong> vers <strong className="text-white">${entryPrice.toFixed(2)}</strong>. Si le prix est plus haut, placez un ordre <em>Buy Limit</em> sur l'OTE 0.705.
                </>
              ) : isSell ? (
                <>
                  Cliquez sur <strong>SELL</strong> vers <strong className="text-white">${entryPrice.toFixed(2)}</strong> ou attendez le retest de l'Order Block vendeur.
                </>
              ) : (
                <>
                  Le marché est en consolidation. Ne forcez aucun trade, attendez que le signal passe au vert.
                </>
              )}
            </p>
          </div>

          {/* Étape 3 */}
          <div
            onClick={() => toggleStep(3)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              completedSteps[3]
                ? 'bg-emerald-950/30 border-emerald-500/40 text-slate-300'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center space-x-2 text-xs font-bold text-white">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-[10px]">
                  3
                </span>
                <span>Régler le Stop Loss (INDISPENSABLE)</span>
              </span>
              <CheckCircle2
                className={`w-4 h-4 ${completedSteps[3] ? 'text-emerald-400' : 'text-slate-600'}`}
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Entrez immédiatement la valeur <strong className="text-rose-400 font-mono">${stopLoss.toFixed(2)}</strong> dans le champ <em>Stop Loss</em> de votre broker. Si le marché se retourne, vous ne perdez pas votre compte.
            </p>
          </div>

          {/* Étape 4 */}
          <div
            onClick={() => toggleStep(4)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              completedSteps[4]
                ? 'bg-emerald-950/30 border-emerald-500/40 text-slate-300'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center space-x-2 text-xs font-bold text-white">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">
                  4
                </span>
                <span>Encaisser le TP1 & Sécuriser (Break-Even)</span>
              </span>
              <CheckCircle2
                className={`w-4 h-4 ${completedSteps[4] ? 'text-emerald-400' : 'text-slate-600'}`}
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Dès que le prix touche <strong>${takeProfit1.toFixed(2)}</strong> (Gain: +${totalGainTp1.toFixed(0)}), clôturez 50% de la position et déplacez votre Stop Loss au prix d'entrée (Risque 0$).
            </p>
          </div>

          {/* Étape 5 */}
          <div
            onClick={() => toggleStep(5)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all md:col-span-2 lg:col-span-2 ${
              completedSteps[5]
                ? 'bg-emerald-950/30 border-emerald-500/40 text-slate-300'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center space-x-2 text-xs font-bold text-white">
                <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">
                  5
                </span>
                <span>Laisser Courir le Reste sur TP2 & TP3 (Jackpot Sans Risque)</span>
              </span>
              <CheckCircle2
                className={`w-4 h-4 ${completedSteps[5] ? 'text-emerald-400' : 'text-slate-600'}`}
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Laissez les 50% restants de votre position courir jusqu'à <strong>${takeProfit2.toFixed(2)}</strong> (+${totalGainTp2.toFixed(0)}) ou <strong>${takeProfit3.toFixed(2)}</strong> (+${totalGainTp3.toFixed(0)}). C'est ainsi que les professionnels réalisent des gains asymétriques colossaux sans jamais risquer leur capital.
            </p>
          </div>
        </div>
      </div>

      {/* 3. FAQ ET RÈGLES D'OR DU TRADING SUR L'OR POUR DÉBUTANTS (ACCORDÉON) */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
        <button
          onClick={() => setShowFaq(!showFaq)}
          className="w-full flex items-center justify-between text-left text-slate-300 hover:text-white transition-colors"
        >
          <span className="font-semibold flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>3 Règles d'Or pour Débutant : Comment ne jamais cramer son compte sur l'Or</span>
          </span>
          {showFaq ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showFaq && (
          <div className="mt-3 pt-3 border-t border-slate-800 space-y-2.5 text-slate-400 leading-relaxed">
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <strong className="text-amber-400">Règle n°1 : La discipline du Stop Loss</strong>
              <p className="mt-0.5 text-[11px]">
                L'or (XAU/USD) est très volatil. N'ouvrez <strong>JAMAIS</strong> un trade sans placer votre Stop Loss immédiatement. Le Stop Loss n'est pas un échec, c'est l'assurance-vie de votre portefeuille.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <strong className="text-emerald-400">Règle n°2 : Ne jamais courir après le prix (FOMO)</strong>
              <p className="mt-0.5 text-[11px]">
                Si une bougie verte géante vient d'exploser, n'achetez pas au sommet. Attendez patiemment le retracement dans la zone OTE 0.705 ou l'Order Block de demande. Les institutions achètent toujours au rabais (*Discount*).
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <strong className="text-cyan-400">Règle n°3 : Le passage à Break-Even (Trade Gratuit)</strong>
              <p className="mt-0.5 text-[11px]">
                Dès que vous avez sécurisé le TP1, votre trade devient 100% sans risque mathématique. Vous pouvez éteindre votre écran sereinement : soit vous gagnez le TP2/TP3, soit vous sortez à zéro sans aucune perte.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

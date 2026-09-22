import React from 'react';
import {
  TrendingUp,
  Target,
  ShieldCheck,
  Zap,
  BarChart2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export const StrategyGuide: React.FC = () => {
  return (
    <div className="space-y-6 text-slate-200">
      {/* Hero card explaining confluence */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 border border-emerald-500/30 shadow-xl">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">
              L'Architecture du Setup Sniper : AMD + POC + Zones de Demande
            </h3>
            <p className="mt-1 text-sm text-slate-300 leading-relaxed">
              Combiner la <strong>stratégie AMD (ICT Power of 3)</strong>, le <strong>Point of Control (POC)</strong> du profil de volume et les <strong>zones d'offre et de demande</strong> élimine les faux signaux et offre des points d'entrée chirurgicaux sur les retournements de tendance avec un ratio Risque/Rendement (R:R) supérieur à 1:3.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pillar 1: AMD */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-amber-500/30 space-y-3">
          <div className="flex items-center space-x-2 text-amber-400">
            <span className="p-1.5 rounded-lg bg-amber-500/20 font-bold text-xs font-mono">01</span>
            <h4 className="font-semibold text-sm">Stratégie AMD (Power of 3)</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Les institutions financières ne peuvent pas acheter directement des positions massives sans contrepartie. Le cycle se décompose en 3 phases immuables :
          </p>
          <ul className="text-xs space-y-2 text-slate-300">
            <li className="flex items-start space-x-2">
              <span className="text-amber-400 font-bold">•</span>
              <span><strong>Accumulation (A) :</strong> Le prix oscille dans un range étroit, accumulant les stop-loss retail au-dessus et en-dessous.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-red-400 font-bold">•</span>
              <span><strong>Manipulation (M / Judas Swing) :</strong> Fausse impulsion violente hors du range pour déclencher les stops et créer la liquidité nécessaire.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Distribution (D) :</strong> Le véritable mouvement tendanciel propulse le marché vers la cible opposée.</span>
            </li>
          </ul>
        </div>

        {/* Pillar 2: Volume Profile & POC */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-yellow-500/30 space-y-3">
          <div className="flex items-center space-x-2 text-yellow-400">
            <span className="p-1.5 rounded-lg bg-yellow-500/20 font-bold text-xs font-mono">02</span>
            <h4 className="font-semibold text-sm">Fixed Range Volume Profile & POC</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Le profil de volume calculé sur le range d'accumulation révèle où les volumes institutionnels réels ont été échangés :
          </p>
          <ul className="text-xs space-y-2 text-slate-300">
            <li className="flex items-start space-x-2">
              <span className="text-yellow-400 font-bold">•</span>
              <span><strong>Point of Control (POC) :</strong> Le niveau de prix exact où le plus gros volume a été échangé. Il agit comme un aimant institutionnel suprême.</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-400 font-bold">•</span>
              <span><strong>Value Area (VAH / VAL) :</strong> Représente les 70% d'activité. Un prix rejeté hors de la Value Area qui réintègre le POC confirme le retournement.</span>
            </li>
          </ul>
        </div>

        {/* Pillar 3: Demand & Supply */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-cyan-500/30 space-y-3">
          <div className="flex items-center space-x-2 text-cyan-400">
            <span className="p-1.5 rounded-lg bg-cyan-500/20 font-bold text-xs font-mono">03</span>
            <h4 className="font-semibold text-sm">Zones de Demande (Order Blocks)</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            La manipulation (Judas Swing) ne se produit jamais dans le vide. Elle vient percuter une <strong>Zone de Demande majeure non atténuée</strong> :
          </p>
          <ul className="text-xs space-y-2 text-slate-300">
            <li className="flex items-start space-x-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span>Dernière bougie vendeuse avant l'explosion institutionnelle qui a laissé un déséquilibre (Imbalance / FVG).</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span>Lorsque le prix pénètre cette zone pendant la manipulation, l'algorithme détecte l'absorption des ordres.</span>
            </li>
          </ul>
        </div>

        {/* Pillar 4: Trending Lines */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-emerald-500/30 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 font-bold text-xs font-mono">04</span>
            <h4 className="font-semibold text-sm">Trending Lines Dynamiques</h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Les lignes de tendance algorithmiques permettent de mesurer la pente de la structure de marché :
          </p>
          <ul className="text-xs space-y-2 text-slate-300">
            <li className="flex items-start space-x-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span>Validation des creux ascendants (Higher Lows) ou sommets descendants (Lower Highs).</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span>Une cassure avec réintégration de la trendline au même moment que le test POC procure une confirmation immédiate de retournement.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Step-by-Step Sniper Execution Checklist */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <h4 className="font-bold text-white text-sm flex items-center space-x-2">
          <Target className="w-4 h-4 text-emerald-400" />
          <span>Checklist d'Exécution en Direct (Trading Live)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="font-mono text-amber-400 font-bold">Étape 1</span>
            <p className="font-medium text-white">Identifier l'Accumulation</p>
            <p className="text-slate-400 text-[11px]">
              Attendre la formation d'un range horizontal serré (ex: session asiatique sur le Forex ou consolidation pré-marché).
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="font-mono text-red-400 font-bold">Étape 2</span>
            <p className="font-medium text-white">Surveiller le Judas Swing</p>
            <p className="text-slate-400 text-[11px]">
              Ne pas acheter le breakout ! Attendre la fausse sortie violente qui va balayer les stop-loss retail dans la Zone de Demande.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="font-mono text-yellow-400 font-bold">Étape 3</span>
            <p className="font-medium text-white">Confirmation POC & Mèche</p>
            <p className="text-slate-400 text-[11px]">
              Le prix rejette la zone avec une longue mèche de rejet et réintègre le POC du Volume Profile.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="font-mono text-emerald-400 font-bold">Étape 4</span>
            <p className="font-medium text-white">Entrée & R:R Optimisé</p>
            <p className="text-slate-400 text-[11px]">
              Entrée à la clôture de la bougie de confirmation. Stop Loss placé sous la mèche de manipulation (SL très serré = R:R 1:3 à 1:5+).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

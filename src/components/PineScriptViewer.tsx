import React, { useState } from 'react';
import { IndicatorSettings } from '../types';
import { generatePineScriptV5 } from '../data/pineScriptCode';
import {
  Copy,
  Check,
  Download,
  Sliders,
  Code2,
  Terminal,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from 'lucide-react';

interface PineScriptViewerProps {
  settings: IndicatorSettings;
  onUpdateSettings: (newSettings: Partial<IndicatorSettings>) => void;
}

export const PineScriptViewer: React.FC<PineScriptViewerProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(true);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);

  const pineScriptCode = generatePineScriptV5(settings);

  const handleCopy = () => {
    navigator.clipboard.writeText(pineScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([pineScriptCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'AMD_VolumeProfile_DemandZones_Sniper.pine';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Code2 className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">
            Code Pine Script v5 (TradingView)
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            v5 Ready
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="btn-toggle-settings"
            onClick={() => setShowSettingsPanel(!showSettingsPanel)}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showSettingsPanel
                ? 'bg-slate-800 text-cyan-400 border-cyan-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Paramètres</span>
            {showSettingsPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button
            id="btn-download-pine"
            onClick={handleDownload}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Télécharger le fichier .pine"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Télécharger</span>
          </button>

          <button
            id="btn-copy-pine"
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Copié dans le presse-papier !</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copier le Code Pine Script</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings Panel Drawer */}
      {showSettingsPanel && (
        <div className="bg-slate-900/70 border-b border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Group 1: AMD Controls */}
          <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between text-amber-400 font-semibold">
              <span>Stratégie AMD</span>
              <span className="text-[10px] text-slate-400 font-mono">Lookback: {settings.amdLookback}b</span>
            </div>
            <div>
              <label className="text-slate-400 text-[11px] block mb-1">
                Période d'Accumulation (bougies)
              </label>
              <input
                type="range"
                min="10"
                max="60"
                value={settings.amdLookback}
                onChange={e => onUpdateSettings({ amdLookback: parseInt(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-300">Tracer boîtes AMD</span>
              <input
                type="checkbox"
                checked={settings.showAmdBoxes}
                onChange={e => onUpdateSettings({ showAmdBoxes: e.target.checked })}
                className="accent-amber-500 rounded"
              />
            </div>
          </div>

          {/* Group 2: Volume Profile & POC */}
          <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between text-yellow-400 font-semibold">
              <span>Volume Profile & POC</span>
              <span className="text-[10px] text-slate-400 font-mono">{settings.vpBinsCount} tranches</span>
            </div>
            <div>
              <label className="text-slate-400 text-[11px] block mb-1">
                Précision des tranches de prix (Bins)
              </label>
              <input
                type="range"
                min="12"
                max="48"
                step="2"
                value={settings.vpBinsCount}
                onChange={e => onUpdateSettings({ vpBinsCount: parseInt(e.target.value) })}
                className="w-full accent-yellow-500"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-300">Afficher Ligne POC</span>
              <input
                type="checkbox"
                checked={settings.showPOC}
                onChange={e => onUpdateSettings({ showPOC: e.target.checked })}
                className="accent-yellow-500 rounded"
              />
            </div>
          </div>

          {/* Group 3: Confluence & Risk:Reward */}
          <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between text-emerald-400 font-semibold">
              <span>Signaux Sniper & R:R</span>
              <span className="text-[10px] text-slate-400 font-mono">1 : {settings.riskRewardTarget} R:R</span>
            </div>
            <div>
              <label className="text-slate-400 text-[11px] block mb-1">
                Score Confluence Minimum ({settings.minConfluenceScore}%)
              </label>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={settings.minConfluenceScore}
                onChange={e => onUpdateSettings({ minConfluenceScore: parseInt(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-300">Alertes Webhook & Push</span>
              <input
                type="checkbox"
                checked={settings.enableAlerts}
                onChange={e => onUpdateSettings({ enableAlerts: e.target.checked })}
                className="accent-emerald-500 rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Guide TradingView Accordion */}
      <div className="bg-slate-900/40 border-b border-slate-800 px-4 py-2">
        <button
          id="btn-toggle-guide"
          onClick={() => setShowInstallGuide(!showInstallGuide)}
          className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-white"
        >
          <div className="flex items-center space-x-1.5 text-cyan-400">
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="font-medium">Comment coller et exécuter ce script sur TradingView ?</span>
          </div>
          {showInstallGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showInstallGuide && (
          <div className="mt-2.5 p-3 rounded-lg bg-slate-900 border border-slate-700/60 text-xs text-slate-300 space-y-2">
            <p className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px]">
                1
              </span>
              <span>Ouvrez votre graphique sur <strong>TradingView.com</strong>.</span>
            </p>
            <p className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px]">
                2
              </span>
              <span>
                Cliquez sur l'onglet <strong>"Pine Editor"</strong> en bas de l'écran.
              </span>
            </p>
            <p className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px]">
                3
              </span>
              <span>
                Effacez le texte par défaut, collez ce code avec <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-white">Ctrl+V</kbd>, puis cliquez sur <strong>"Ajouter au graphique" (Add to chart)</strong> !
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Code Editor Body */}
      <div className="relative flex-1 overflow-auto bg-[#0b1120] p-4 font-mono text-[11px] leading-relaxed text-slate-300">
        <pre className="select-text whitespace-pre overflow-x-auto">
          <code>{pineScriptCode}</code>
        </pre>
      </div>
    </div>
  );
};

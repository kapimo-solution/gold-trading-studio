import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  Copy,
  Check,
  Code,
  HelpCircle,
  FileCode,
  Zap,
} from 'lucide-react';

export const AiAssistantModal: React.FC = () => {
  const [userScript, setUserScript] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const samplePrompts = [
    'Comment fusionner ce code avec mon indicateur existant ?',
    'Ajoute une condition de filtre par session (ex: Killzone Londres & New York)',
    'Optimise le calcul du Point of Control (POC) pour le scalping 1 minute',
    'Configure une alerte webhook compatible avec un bot Telegram/Discord',
  ];

  const handleAnalyze = async () => {
    setLoading(true);
    setErrorMsg(null);
    setAiResult(null);

    try {
      const response = await fetch('/api/ai/analyze-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userScript,
          customRequest: customPrompt,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la requête IA.');
      }

      setAiResult(data.result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Impossible de contacter le service IA.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResult = () => {
    if (!aiResult) return;
    navigator.clipboard.writeText(aiResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top Explanation */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start space-x-3 text-xs text-slate-300">
        <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <p>
          Vous avez déjà un script TradingView et souhaitez y intégrer ces algorithmes ? Collez votre code actuel ci-dessous ou posez votre question technique pour obtenir un script sur-mesure validé en Pine Script v5.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>Votre Script Actuel (Optionnel)</span>
            </label>
            <textarea
              value={userScript}
              onChange={e => setUserScript(e.target.value)}
              placeholder="// Collez ici votre indicateur existant pour l'améliorer..."
              className="w-full h-40 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Votre Demande Spécifique d'Amélioration</span>
            </label>
            <textarea
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="Ex: Je souhaite ajouter un filtre de session Londres / New York et intégrer des signaux par alertcondition..."
              className="w-full h-24 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors resize-none"
            />
          </div>

          {/* Preset prompt pills */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400">Suggestions rapides :</span>
            <div className="flex flex-wrap gap-1.5">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setCustomPrompt(p)}
                  className="px-2.5 py-1 rounded-md text-[10px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors text-left"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button
            id="btn-run-ai-analysis"
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-[0.99]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Génération et Analyse en cours par Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Améliorer et Adapter avec l'IA Pine Script</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: AI Output */}
        <div className="flex flex-col h-full min-h-[380px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 bg-slate-900 border-b border-slate-800 text-xs font-semibold text-slate-300">
            <div className="flex items-center space-x-2">
              <Code className="w-4 h-4 text-emerald-400" />
              <span>Résultat & Script Personnalisé</span>
            </div>
            {aiResult && (
              <button
                onClick={handleCopyResult}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copié' : 'Copier'}</span>
              </button>
            )}
          </div>

          <div className="flex-1 p-3 overflow-auto text-xs text-slate-300 leading-relaxed font-mono">
            {errorMsg && (
              <div className="p-3 bg-red-950/40 border border-red-800 rounded text-red-300 text-xs">
                {errorMsg}
              </div>
            )}

            {aiResult ? (
              <div className="whitespace-pre-wrap select-text text-slate-200">
                {aiResult}
              </div>
            ) : !loading ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 font-sans">
                <Code className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs">
                  Le résultat de votre analyse et votre script optimisé s'afficheront ici.
                </p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Vous pouvez également utiliser directement le script Pine Script v5 complet dans l'onglet "Code Pine Script".
                </p>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-6 text-emerald-400 font-sans space-y-3">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-xs">Optimisation de l'algorithme Pine Script v5...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

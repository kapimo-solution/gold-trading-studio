import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateWithGemini, handleGeminiError } from "../../lib/gemini";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { userScript, customRequest } = req.body || {};

    const prompt = `Tu es un expert mondial en TradingView Pine Script v5 et en méthodologies Smart Money Concepts (SMC), AMD (Accumulation - Manipulation - Distribution / Power of 3 de Michael Huddleston ICT), Order Blocks / Zones de Demande et d'Offre, Lignes de tendance dynamiques et Volume Profile Fixed Range avec Point of Control (POC).

L'utilisateur a une requête concernant l'amélioration ou l'intégration de son indicateur Pine Script.

Requête de l'utilisateur :
"${customRequest || "Améliore mon script pour intégrer la stratégie AMD, la détection des trending lines, les zones de demande/offre et le volume profile fixed range avec POC."}"

Script actuel fourni par l'utilisateur (s'il existe) :
\`\`\`pinescript
${userScript || "// Aucun script fourni par l'utilisateur"}
\`\`\`

Fournis une réponse structurée en français contenant :
1. Une analyse technique rapide des points d'optimisation (confluence AMD + POC + Demand Zones + Trendlines).
2. Les conseils d'application pour les points de retournement précis (sniper entries, gestion du SL et du TP).
3. Le code Pine Script v5 complet, commenté et sans repaint, prêt à être copié dans le Pine Editor de TradingView.`;

    const text = await generateWithGemini(prompt);
    res.json({ result: text });
  } catch (error) {
    handleGeminiError(res, error);
  }
}

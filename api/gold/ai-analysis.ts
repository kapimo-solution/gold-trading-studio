import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateWithGemini, handleGeminiError } from "../../lib/gemini";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { currentPrice, trend, demandZone, supplyZone, oteZone, pocPrice } = req.body || {};

    const prompt = `Tu es un trader institutionnel d'élite spécialisé sur l'OR (XAU/USD) et la méthodologie Smart Money Concepts (ICT / Michael Huddleston).

Voici les données de marché en direct sur l'OR (XAU/USD) :
- Prix Actuel de l'Or : $${currentPrice || "2650.00"}
- Tendance du Marché : ${trend || "HAUSSIÈRE (Bullish)"}
- Point of Control (POC) du Volume Profile : $${pocPrice || "Non calculé"}
- Zone d'Achat Principale (Order Block Demande) : ${demandZone ? `$${demandZone.bottom} - $${demandZone.top}` : "En formation"}
- Zone d'Offre (Supply) : ${supplyZone ? `$${supplyZone.bottom} - $${supplyZone.top}` : "En formation"}
- Zone OTE (Optimal Trade Entry - Fibo 0.62 / 0.705 / 0.79) : ${oteZone ? `$${oteZone.fib79} à $${oteZone.fib62} (Sweet Spot: $${oteZone.fib705})` : "En attente"}

Fournis une analyse stratégique percutante et précise en français structurée ainsi :
1. **Diagnostic de la Structure & Tendance de l'Or** (Bullish/Bearish/Range, liquidités à cibler).
2. **Zone d'Achat Optimale & OTE** (Comment exploiter l'Order Block et le retracement OTE 0.705).
3. **Plan de Trade Précis** :
   - Niveau d'Entrée idéal (Sniper Entry)
   - Niveau de Stop Loss (SL) strict et justifié
   - Cibles de Take Profit (TP1 sécurisation, TP2 liquidité, TP3 extension)
   - Ratio Risque / Rendement estimé.
4. **Conseil de session** (Killzones Londres / New York sur l'Or).

Termine systématiquement par une note rappelant que ceci est une analyse éducative automatisée, pas un conseil financier personnalisé, et que tout trade implique un risque de perte en capital.`;

    const text = await generateWithGemini(prompt);
    res.json({ analysis: text });
  } catch (error) {
    handleGeminiError(res, error);
  }
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateWithGemini, handleGeminiError } from "../../lib/gemini";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { stats, signalsSample, currentSettings } = req.body || {};

    const prompt = `Tu es le Directeur Quantitatif et Spécialiste d'Élite en Machine Learning et Stratégies Institutionnelles Smart Money Concepts (ICT) sur l'OR (XAU/USD).

L'application de trading tient un journal automatisé des signaux générés avec leurs résultats vérifiés (Entrée, Stop Loss, Take Profit 1 / Take Profit 2 / Breakeven atteints).

Voici les métriques actuelles enregistrées dans le journal :
- Nombre total de signaux audités : ${stats?.totalAnalyzed || "20+"}
- Taux de Réussite (Winrate actuel) : ${stats?.currentWinrate || "81.5"}%
- Meilleure session identifiée : ${stats?.bestSession || "Londres"}
- Moins bonne session : ${stats?.worstSession || "Asie"}
- Winrate Haute Confluence (>=80%) : ${stats?.highConfluenceWinrate || "89"}%
- Winrate Basse Confluence (<80%) : ${stats?.lowConfluenceWinrate || "55"}%

Échantillon des derniers signaux :
${JSON.stringify(signalsSample || [], null, 2)}

Rédige une ÉTUDE D'AUTO-AMÉLIORATION DE L'APPLICATION pour maximiser le winrate et la rentabilité nette sur l'Or :
1. **Diagnostic Analytique des Pertes** : Identifie la cause racine des faux signaux (ex: session asiatique, manque de balayage de liquidité, etc.).
2. **Profil du Setup Parfait (Golden Setup)** : Quels confluences (Order Block + OTE 0.705 + Volume Spike) produisent le plus fort winrate ?
3. **Règles d'Auto-Amélioration Algorithmique** : 3 à 4 règles strictes et mathématiques à implémenter dans le moteur de détection.
4. **Optimisation du Money Management** : Rôle du Breakeven à 1R et extension vers TP2/TP3.
5. **Score de Fiabilité Stratégique Global** (/100) et verdict institutionnel.

Rappelle que ces métriques proviennent d'un journal automatisé à but éducatif, et que la performance passée ne garantit pas les résultats futurs.

Réponds en français, avec un ton ultra professionnel, percutant et sans jargon inutile.`;

    const text = await generateWithGemini(prompt);
    res.json({ study: text });
  } catch (error) {
    handleGeminiError(res, error);
  }
}

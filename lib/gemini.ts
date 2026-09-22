import { GoogleGenAI } from "@google/genai";

// Models tried in order. If the primary model is renamed/retired/unavailable
// for a given key, we automatically fall back to the next one instead of
// hard-failing the whole request.
const MODEL_CANDIDATES = [
  "gemini-3.8-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
];

export class MissingApiKeyError extends Error {
  constructor() {
    super("GEMINI_API_KEY non configurée.");
    this.name = "MissingApiKeyError";
  }
}

/**
 * Calls Gemini with a plain text prompt, trying each candidate model in turn
 * until one succeeds. Throws MissingApiKeyError if no key is configured, or
 * the last error encountered if every model candidate fails.
 */
export async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new MissingApiKeyError();
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "vercel-build",
      },
    },
  });

  let lastError: unknown = null;

  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      const text = response.text;
      if (text && text.trim().length > 0) {
        return text;
      }
      lastError = new Error(`Empty response from model ${model}`);
    } catch (err) {
      lastError = err;
      // try next candidate model
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Toutes les tentatives Gemini ont échoué.");
}

export function handleGeminiError(res: { status: (n: number) => any }, error: unknown) {
  if (error instanceof MissingApiKeyError) {
    return res.status(503).json({ error: error.message });
  }
  const message = error instanceof Error ? error.message : "Erreur inconnue lors de l'appel Gemini.";
  console.error("Gemini API error:", error);
  return res.status(500).json({ error: message });
}

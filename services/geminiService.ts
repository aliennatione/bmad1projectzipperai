import { GoogleGenAI } from "@google/genai";

/**
 * @file Centralizza la creazione del client GoogleGenAI.
 * Questo permette di sovrascrivere la chiave API dal frontend in modo controllato.
 */

/**
 * Crea e restituisce un'istanza del client GoogleGenAI.
 * Dà priorità alla chiave API fornita dall'utente nell'interfaccia,
 * ripiegando sulla variabile d'ambiente se non presente.
 * @param apiKeyOverride - Una chiave API opzionale fornita dall'utente nelle impostazioni.
 * @returns Un'istanza di GoogleGenAI configurata, oppure `null` se nessuna chiave API è disponibile.
 */
export const getAiClient = (apiKeyOverride?: string): GoogleGenAI | null => {
  const apiKey = apiKeyOverride || process.env.API_KEY;
  if (!apiKey) {
    console.warn("La chiave API di Gemini non è disponibile. Le funzionalità AI saranno disabilitate.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

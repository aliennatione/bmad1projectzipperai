import { getAiClient } from './geminiService';
import { GEMINI_FLASH_MODEL } from '../constants';

/**
 * Pulisce la risposta dell'AI per estrarre solo il codice.
 * Rimuove i blocchi di codice markdown (es. \`\`\`javascript) e gli spazi bianchi.
 * Questo è un passo cruciale perché i LLM spesso avvolgono il codice in markdown.
 * @param rawText La risposta testuale grezza dall'API Gemini.
 * @returns La stringa di codice pulita, pronta per essere visualizzata nell'editor.
 */
const cleanAiCodeResponse = (rawText: string | undefined): string => {
    if (!rawText) return ''; // Handle undefined or empty string input gracefully.
    const trimmed = rawText.trim();
    // Regex per trovare un blocco di codice, con un identificatore di linguaggio opzionale (es. ```js).
    const codeBlockRegex = /^```(?:\w+\n)?([\s\S]+)```$/;
    const match = trimmed.match(codeBlockRegex);
    if (match && match[1]) {
        // Se viene trovato un blocco di codice markdown, restituisce il suo contenuto.
        return match[1].trim();
    }
    // Se non viene trovato alcun blocco di codice, si presume che l'intera risposta sia il codice.
    return trimmed;
};


/**
 * Esegue il refactoring di un pezzo di codice utilizzando l'API Gemini, basandosi su un template di prompt fornito.
 * @param code Il codice sorgente da refattorizzare.
 * @param promptTemplate Il prompt modificabile dall'utente che guida l'AI su come eseguire il refactoring.
 * @param apiKeyOverride Una chiave API opzionale dal frontend per sovrascrivere quella predefinita.
 * @returns Una promise che si risolve con la stringa del codice refattorizzato.
 * @throws Un errore se la chiamata API fallisce o se la chiave API è mancante.
 */
export const refactorCode = async (code: string, promptTemplate: string, apiKeyOverride: string): Promise<string> => {
  const ai = getAiClient(apiKeyOverride);

  if (!ai) {
    throw new Error("Servizio di refactoring non disponibile. Chiave API mancante.");
  }
  
  if (!code.trim()) {
    return code; // Restituisce il contenuto originale se non c'è nulla da refattorizzare.
  }
  
  const prompt = promptTemplate.replace('CODE_PLACEHOLDER', code);
  
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_FLASH_MODEL,
      contents: prompt,
    });
    
    return cleanAiCodeResponse(response.text);

  } catch (error) {
    console.error("Errore during il refactoring del codice con l'API Gemini:", error);
    const errorMessage = error instanceof Error ? error.message : 'Si è verificato un errore API sconosciuto.';
    throw new Error(`Refactoring del codice fallito. Motivo: ${errorMessage}`);
  }
};
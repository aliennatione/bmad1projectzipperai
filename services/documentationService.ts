import { getAiClient } from './geminiService';
import { GEMINI_FLASH_MODEL } from '../constants';
import { PipelineData } from '../types';

/**
 * Genera il contenuto di un file README.md utilizzando l'API Gemini.
 * Questo è un passo del workflow che sintetizza il contenuto del progetto e le note estratte in un documento completo.
 * @param pipelineData I dati correnti della pipeline, che contengono il contesto del progetto.
 * @param promptContent Il prompt modificabile dall'utente che istruisce l'AI su come strutturare il README.
 * @param apiKeyOverride Una chiave API opzionale dal frontend per sovrascrivere quella predefinita.
 * @returns Una promise che si risolve con la stringa markdown del README.md generato.
 *          Restituisce un messaggio di errore di fallback se la chiamata API fallisce.
 */
export const generateReadme = async (pipelineData: PipelineData, promptContent: string, apiKeyOverride: string): Promise<string> => {
  const ai = getAiClient(apiKeyOverride);

  if (!ai) {
    return "# Generazione README Saltata\n\nImpossibile generare il README perché non è stata configurata una chiave API. Aggiungine una nelle impostazioni.";
  }
  
  // Combina tutte le informazioni disponibili dalla pipeline per dare all'AI il massimo contesto.
  const contentForReadme = `
**Contenuto Originale del Progetto:**
${pipelineData.fullProjectContent}

---
**Note di Documentazione Aggiuntive (Estratte dall'AI, dare priorità a queste):**
${pipelineData.documentationNotes || "Nessuna nota di documentazione aggiuntiva è stata estratta."}
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_FLASH_MODEL,
      contents: `${promptContent}\n${contentForReadme}`,
    });
    
    return (response.text ?? '').trim();

  } catch (error) {
    console.error("Errore during la generazione del README con l'API Gemini:", error);
    const errorMessage = error instanceof Error ? error.message : 'Si è verificato un errore API sconosciuto.';
    return `# Documentazione del Progetto\n\n**Attenzione: Impossibile generare automaticamente il README.md a causa di un errore.**\n\nQuesto è un file segnaposto. Si prega di esaminare i file sorgente del progetto per comprenderne la struttura e lo scopo.\n\n**Dettagli dell'Errore:**\n\`\`\`\n${errorMessage}\n\`\`\``;
  }
};
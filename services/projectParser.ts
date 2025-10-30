import { GoogleGenAI, Type } from "@google/genai";
import { ParsedFile, PipelineData } from '../types';
import { getAiClient } from './geminiService';
import { GEMINI_FLASH_MODEL } from '../constants';

declare var JSZip: any;

/**
 * Analizza il contenuto di un testo strutturato e lo converte in un elenco di file
 * con percorsi e contenuti, utilizzando un approccio basato su espressioni regolari.
 * Questo serve come primo passo di parsing, rapido e preliminare.
 * Cerca intestazioni come `### \`percorso/del/file.js\`` seguite da un blocco di codice.
 * @param fileContent Il contenuto testuale completo fornito dall'utente.
 * @returns Un array di oggetti `ParsedFile`.
 */
export const parseWithRegex = (fileContent: string | undefined): ParsedFile[] => {
  if (!fileContent) {
    return [];
  }
  const sections = fileContent.split(/\n---\n/);
  const files: ParsedFile[] = [];
  const fileHeaderRegex = new RegExp('^#+.*`([\\w./-]+)`');

  for (const section of sections) {
    const trimmedSection = section.trim();
    if (!trimmedSection) continue;

    const firstLine = trimmedSection.split('\n')[0].trim();
    const match = firstLine.match(fileHeaderRegex);

    if (match && match[1]) {
      const path = match[1];
      const codeBlockRegex = /```(?:[a-zA-Z]+)?\n([\s\S]*?)\n```/;
      const codeMatch = trimmedSection.match(codeBlockRegex);
      
      let content = '';
      if (codeMatch && codeMatch[1]) {
        content = codeMatch[1].trim();
      } else {
        const contentBelowHeader = trimmedSection.substring(firstLine.length).trim();
        if(contentBelowHeader){
          content = contentBelowHeader;
        }
      }
      files.push({ path, content });
    }
  }
  
  const manifestFile = files.find(f => f.path === 'manifest.json');
  if (manifestFile) {
      const iconPaths = [...manifestFile.content.matchAll(/"(icons\/icon\d+\.png)"/g)].map(m => m[1]);
      const uniqueIconPaths = [...new Set(iconPaths)];
      for (const iconPath of uniqueIconPaths) {
          if (!files.some(f => f.path === iconPath)) {
              files.push({ path: iconPath, content: '' }); 
          }
      }
  }

  return files;
};

const fileFinderSchema = {
    type: Type.OBJECT,
    properties: {
        additionalFiles: {
            type: Type.ARRAY,
            description: "Un elenco di file che lo script iniziale potrebbe non aver trovato. Ogni oggetto dovrebbe avere 'path' e 'content'.",
            items: {
                type: Type.OBJECT,
                properties: {
                    path: { type: Type.STRING, description: "Il percorso completo del file mancante." },
                    content: { type: Type.STRING, description: "Il contenuto completo del file mancante." }
                },
                required: ["path", "content"]
            }
        },
    },
    required: ["additionalFiles"]
};

const docExtractorSchema = {
    type: Type.OBJECT,
    properties: {
        documentationNotes: {
            type: Type.STRING,
            description: "Tutto il testo descrittivo, gli obiettivi e le istruzioni pertinenti trovati al di fuori dei blocchi di codice. Questo sarà usato per migliorare il file README.md."
        }
    },
    required: ["documentationNotes"]
};


/**
 * Legge un elenco di file forniti dall'utente (testo o archivio ZIP) e li serializza in un'unica
 * stringa strutturata che il parser può interpretare.
 * @param inputFiles L'elenco di file dall'elemento di input.
 * @returns Una promise che si risolve con la stringa di contenuto combinata e formattata.
 */
export const processInputFiles = async (inputFiles: File[]): Promise<string> => {
    let combinedContent = '';
    for (const file of inputFiles) {
        if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
            const zip = await JSZip.loadAsync(file);
            for (const path in zip.files) {
                if (!zip.files[path].dir) {
                    const content = await zip.files[path].async('string');
                    const lang = path.split('.').pop() || '';
                    combinedContent += `### \`${path}\`\n\`\`\`${lang}\n${content}\n\`\`\`\n---\n`;
                }
            }
        } else {
            const content = await file.text();
            combinedContent += content + '\n---\n';
        }
    }
    return combinedContent;
};

/**
 * Esegue il parsing di una stringa JSON in modo sicuro, gestendo potenziali malformazioni
 * dalla risposta dell'AI, come i "fences" di markdown.
 * @param text La stringa di risposta grezza dall'AI.
 * @returns L'oggetto JavaScript parsato, o `null` se il parsing fallisce.
 */
const safeJsonParse = (text: string | undefined): any => {
    if (!text) {
        return null;
    }
    const rawText = text.trim();
    const jsonText = rawText.startsWith('```json') ? rawText.replace(/```json\n|```/g, '') : rawText;
    try {
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Impossibile parsare il JSON dalla risposta AI:", jsonText);
        return null;
    }
};


/**
 * Un passo della pipeline del workflow che utilizza l'AI per trovare file aggiuntivi che il
 * parser regex iniziale potrebbe aver saltato.
 * @param pipelineData I dati correnti della pipeline, inclusi i file già trovati.
 * @param promptText Il prompt personalizzato dall'utente per guidare l'AI.
 * @param apiKeyOverride Una chiave API opzionale per sovrascrivere quella predefinita.
 * @returns Una promise che si risolve con l'oggetto `PipelineData` aggiornato.
 */
export const findAdditionalFiles = async (
    pipelineData: PipelineData,
    promptText: string,
    apiKeyOverride: string
): Promise<PipelineData> => {
    const ai = getAiClient(apiKeyOverride);
    if (!ai) return pipelineData;
    
    const parsedFilePaths = pipelineData.files.length > 0 ? JSON.stringify(pipelineData.files.map(f => f.path)) : "Nessuno";
    const finalPrompt = promptText
        .replace('ORIGINAL_CONTENT_PLACEHOLDER', pipelineData.fullProjectContent)
        .replace('PARSED_FILES_PLACEHOLDER', parsedFilePaths);
    
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: finalPrompt,
            config: { responseMimeType: "application/json", responseSchema: fileFinderSchema },
        });
        
        const aiResult = safeJsonParse(response.text);
        const { additionalFiles = [] } = aiResult || {};
        
        const existingPaths = new Set(pipelineData.files.map(f => f.path));
        if (Array.isArray(additionalFiles)) {
            additionalFiles.forEach((file: any) => {
                if (file && typeof file.path === 'string' && typeof file.content === 'string' && !existingPaths.has(file.path)) {
                    pipelineData.files.push({ path: file.path, content: file.content });
                    existingPaths.add(file.path);
                }
            });
        }
    } catch (error) {
        console.error("Errore during la ricerca di file con AI (passo del workflow):", error);
    }
    return pipelineData;
};


/**
 * Un passo della pipeline del workflow che utilizza l'AI per estrarre testo "orfano"
 * (descrizioni, obiettivi, ecc.) per migliorare la documentazione.
 * @param pipelineData I dati correnti della pipeline.
 * @param promptText Il prompt personalizzato dall'utente per guidare l'estrazione.
 * @param apiKeyOverride Una chiave API opzionale per sovrascrivere quella predefinita.
 * @returns Una promise che si risolve con l'oggetto `PipelineData` aggiornato.
 */
export const extractDocumentationNotes = async (
    pipelineData: PipelineData,
    promptText: string,
    apiKeyOverride: string
): Promise<PipelineData> => {
    const ai = getAiClient(apiKeyOverride);
    if (!ai) return pipelineData;

    const finalPrompt = promptText.replace('ORIGINAL_CONTENT_PLACEHOLDER', pipelineData.fullProjectContent);
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: finalPrompt,
            config: { responseMimeType: "application/json", responseSchema: docExtractorSchema },
        });

        const aiResult = safeJsonParse(response.text);
        if (aiResult && typeof aiResult.documentationNotes === 'string') {
            pipelineData.documentationNotes = aiResult.documentationNotes;
        }
    } catch (error) {
        console.error("Errore during l'estrazione della documentazione con AI (passo del workflow):", error);
        const fallbackNote = `Estrazione della documentazione AI fallita. Errore: ${error instanceof Error ? error.message : String(error)}`;
        pipelineData.documentationNotes = pipelineData.documentationNotes ? `${pipelineData.documentationNotes}\n${fallbackNote}` : fallbackNote;
    }
    return pipelineData;
};
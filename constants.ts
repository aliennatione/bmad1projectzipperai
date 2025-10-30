import { ChatMessage, WorkflowStep, WorkflowStepType, BmadMessage } from './types';
import { v4 as uuidv4 } from 'https://esm.sh/uuid';
import { WORKFLOW_PROMPTS } from './services/prompts';

/**
 * @file Contiene costanti condivise utilizzate in tutta l'applicazione.
 * Centralizzare queste costanti rende l'applicazione più facile da configurare e mantenere.
 */

/**
 * Il modello Gemini Flash utilizzato per compiti generici come l'analisi del progetto,
 * la generazione di documentazione e il refactoring del codice.
 */
export const GEMINI_FLASH_MODEL = 'gemini-2.5-flash';

/**
 * La cronologia della chat iniziale visualizzata quando si apre per la prima volta l'Architetto Chat.
 * Fornisce un messaggio di benvenuto e guida l'utente.
 */
export const INITIAL_CHAT_HISTORY: ChatMessage[] = [
    {
        role: 'model',
        content: `Ciao! Sono l'Architetto AI. Sono qui per aiutarti a trasformare la tua idea in un progetto software strutturato.

Descrivimi cosa vorresti costruire. Ad esempio:
- "Vorrei creare una semplice to-do list app con React."
- "Ho bisogno di un server backend con Node.js ed Express per una API REST."
- "Puoi aiutarmi a creare una landing page statica con HTML, CSS e un po' di JavaScript?"

Iniziamo a progettare insieme!`
    }
];

// --- COSTANTI PER IL METODO BMAD ---

/**
 * Il messaggio di benvenuto per la vista del Metodo BMAD.
 */
export const INITIAL_BMAD_HISTORY: BmadMessage[] = [
    {
        role: 'model',
        agent: 'System',
        content: `Benvenuto nel **Metodo BMAD** (BMad Method Module).

Questo è un workflow guidato per trasformare la tua idea in un progetto completo, seguendo 4 fasi strutturate: **Analisi, Pianificazione, Soluzione e Implementazione**.

**Per iniziare, descrivi la tua idea di progetto nella casella di testo qui sotto.**

Sii il più descrittivo possibile. Pensa a:
- Qual è lo scopo principale del progetto?
- Chi sono gli utenti target?
- Quali sono le 3-5 funzionalità chiave che deve avere?

Una volta che sei pronto, clicca su "Avvia Analisi" per iniziare la Fase 1.`
    }
];

/**
 * Contiene le definizioni (nome, descrizione, prompt predefinito) per ogni tipo
 * di passo del workflow disponibile. Questo centralizza la configurazione e facilita
 * l'aggiunta di nuovi tipi di passo in futuro.
 */
export const WORKFLOW_STEP_DEFINITIONS: Record<WorkflowStepType, { name: string; description: string; prompt: string; }> = {
    'FIND_FILES': {
        name: 'Trova File Aggiuntivi',
        description: "Usa l'AI per trovare file mancanti dall'input testuale.",
        prompt: WORKFLOW_PROMPTS.fileFinder
    },
    'EXTRACT_DOCS': {
        name: 'Estrai Note di Documentazione',
        description: "Usa l'AI per estrarre note di documentazione dall'input.",
        prompt: WORKFLOW_PROMPTS.docExtractor
    },
    'GENERATE_README': {
        name: 'Genera README.md',
        description: "Usa l'AI per generare un file README.md completo.",
        prompt: WORKFLOW_PROMPTS.readmeGeneration
    }
};

/**
 * La configurazione del workflow predefinito che viene caricata all'avvio dell'applicazione.
 * Definisce i passaggi standard di analisi e generazione del progetto.
 */
export const INITIAL_WORKFLOW_STEPS: WorkflowStep[] = [
    {
        id: uuidv4(),
        type: 'FIND_FILES',
        name: WORKFLOW_STEP_DEFINITIONS.FIND_FILES.name,
        description: WORKFLOW_STEP_DEFINITIONS.FIND_FILES.description,
        prompt: WORKFLOW_STEP_DEFINITIONS.FIND_FILES.prompt,
        enabled: true
    },
    {
        id: uuidv4(),
        type: 'EXTRACT_DOCS',
        name: WORKFLOW_STEP_DEFINITIONS.EXTRACT_DOCS.name,
        description: WORKFLOW_STEP_DEFINITIONS.EXTRACT_DOCS.description,
        prompt: WORKFLOW_STEP_DEFINITIONS.EXTRACT_DOCS.prompt,
        enabled: true
    },
    {
        id: uuidv4(),
        type: 'GENERATE_README',
        name: WORKFLOW_STEP_DEFINITIONS.GENERATE_README.name,
        description: WORKFLOW_STEP_DEFINITIONS.GENERATE_README.description,
        prompt: WORKFLOW_STEP_DEFINITIONS.GENERATE_README.prompt,
        enabled: true
    }
];

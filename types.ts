/**
 * @file Definisce i tipi di dati condivisi utilizzati nell'applicazione.
 */

// --- TIPI CORE DELL'APPLICAZIONE ---

/** Definisce le viste principali renderizzabili dall'applicazione. */
export type AppView = 'input' | 'editor' | 'architect' | 'bmad';

/**
 * Definisce la forma dello stato globale e delle funzioni fornite dal React Context.
 * Questo permette a qualsiasi componente di accedere allo stato condiviso e alle azioni
 * in modo type-safe.
 */
export interface AppContextType {
    // Stato
    currentView: AppView;
    isProcessing: boolean;
    processingMessage: string | null;
    error: string | null;
    apiKey: string;
    parsedFiles: ParsedFile[];

    // Azioni
    setView: (view: AppView) => void;
    showError: (message: string) => void;
    clearError: () => void;
    setApiKey: (key: string) => void;
    setParsedFiles: React.Dispatch<React.SetStateAction<ParsedFile[]>>;
    
    // Gestori di logica di business
    handleProcessInput: (input: string | File[]) => Promise<void>;
    handleRefactorRequest: (content: string, prompt: string) => Promise<string | null>;
    startNewProject: () => void;
}


// --- TIPI PER LA STRUTTURA DEL PROGETTO ---

/**
 * Rappresenta un singolo file analizzato dall'input dell'utente.
 * Contiene il percorso completo del file e il suo contenuto come stringa.
 */
export interface ParsedFile {
  /**
   * Il percorso completo del file all'interno della struttura del progetto.
   * Esempio: "src/components/Button.tsx"
   */
  path: string;
  /**
   * Il contenuto testuale del file.
   */
  content: string;
}

// --- TIPI PER L'ARCHITETTO CHAT ---

/**
 * Definisce il ruolo dell'autore in un messaggio di chat (utente o modello AI).
 */
export type ChatMessageRole = 'user' | 'model';

/**
 * Rappresenta un singolo messaggio all'interno della cronologia della chat.
 */
export interface ChatMessage {
    /**
     * Il ruolo di chi ha inviato il messaggio.
     */
    role: ChatMessageRole;
    /**
     * Il contenuto testuale del messaggio. Può contenere Markdown.
     */
    content: string;
}

// --- TIPI PER IL WORKFLOW EDITOR ---

/**
 * Definisce i tipi di passaggi disponibili nel workflow di generazione del progetto.
 * Ogni tipo corrisponde a un'azione specifica eseguita da un servizio.
 */
export type WorkflowStepType = 'FIND_FILES' | 'EXTRACT_DOCS' | 'GENERATE_README';

/**
 * Rappresenta un singolo passaggio configurabile all'interno della pipeline del workflow.
 */
export interface WorkflowStep {
    /**
     * Un ID univoco per il passaggio, utile per la gestione nello stato di React.
     */
    id: string;
    /**
     * Il tipo di operazione che questo passaggio esegue.
     */
    type: WorkflowStepType;
    /**
     * Un nome leggibile per l'utente visualizzato nell'interfaccia.
     */
    name: string;
    /**
     * Una descrizione leggibile per l'utente, che spiega cosa fa il passo.
     */
    description: string;
    /**
     * Il prompt che verrà inviato all'AI per questo specifico passaggio.
     */
    prompt: string;
    /**
     * Flag booleano per attivare o disattivare il passaggio nella pipeline.
     */
    enabled: boolean;
}

/**
 * Rappresenta l'oggetto dati che viene passato e modificato attraverso la pipeline del workflow.
 * Ogni passaggio può leggere e scrivere su questo oggetto, arricchendo il contesto per i passaggi successivi.
 */
export interface PipelineData {
    /**
     * Il contenuto testuale completo e originale fornito dall'utente.
     */
    fullProjectContent: string;
    /**
     * L'elenco dei file del progetto, che può essere arricchito durante la pipeline.
     */
    files: ParsedFile[];
    /**
     * Note di documentazione estratte dall'AI, utilizzate principalmente per la generazione del README.
     */
    documentationNotes: string;
}

// --- TIPI PER IL METODO BMAD ---

/**
 * Definisce i ruoli degli agenti specializzati nel metodo BMAD.
 */
export type BmadAgent = 'Analyst' | 'PM' | 'Architect' | 'Developer' | 'System';

/**
 * Definisce le fasi del workflow guidato BMAD.
 */
export type BmadPhase = 'IDLE' | 'ANALYSIS' | 'PLANNING' | 'SOLUTIONING' | 'IMPLEMENTATION' | 'DONE';

/**
 * Rappresenta un singolo messaggio nella vista BMAD, estendendo il tipo base
 * per includere l'agente AI che sta parlando.
 */
export interface BmadMessage extends ChatMessage {
    /**
     * L'agente AI specializzato che ha generato il messaggio.
     */
    agent?: BmadAgent;
}

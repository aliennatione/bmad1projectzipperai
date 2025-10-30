import React, { createContext, useState, useCallback, useContext, ReactNode } from 'react';
import { ParsedFile, AppView, AppContextType, WorkflowStep, PipelineData } from '../types';
import { processInputFiles, parseWithRegex, findAdditionalFiles, extractDocumentationNotes } from '../services/projectParser';
import { generateReadme } from '../services/documentationService';
import { refactorCode } from '../services/codeRefactorService';
import { INITIAL_WORKFLOW_STEPS } from '../constants';

/**
 * @file Contesto React per la gestione dello stato globale dell'applicazione.
 * 
 * Questo file definisce `AppContext` e il suo provider, `AppProvider`.
 * `AppProvider` incapsula la logica di stato principale, incluse le interazioni
 * con i servizi AI, la gestione delle viste, degli errori e dello stato di
 * caricamento. Fornisce questi stati e le funzioni per modificarli a tutti i
 * componenti figli tramite il custom hook `useAppContext`.
 * 
 * Questa architettura centralizzata previene il "prop drilling" e rende
 * lo stato dell'applicazione più prevedibile e manutenibile.
 */


// Creazione del contesto con un valore predefinito.
// Il valore predefinito non verrà mai usato direttamente grazie al controllo nel provider.
const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Custom hook per accedere facilmente al contesto dell'applicazione.
 * @returns L'oggetto del contesto, contenente stato e azioni.
 * @throws {Error} se usato al di fuori di un `AppProvider`.
 */
export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext deve essere usato all\'interno di un AppProvider');
    }
    return context;
};

/**
 * Provider del contesto che wrappa l'intera applicazione.
 */
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // --- STATI GLOBALI ---
    const [currentView, setCurrentView] = useState<AppView>('input');
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [processingMessage, setProcessingMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState('');
    const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
    
    // Le impostazioni del workflow sono gestite localmente in InputView per ora,
    // ma potrebbero essere elevate qui se necessario.
    const [workflowSteps] = useState<WorkflowStep[]>(INITIAL_WORKFLOW_STEPS);

    // --- AZIONI GLOBALI ---
    const setView = (view: AppView) => setCurrentView(view);

    const showError = useCallback((message: string) => {
        setError(message);
        // Nasconde automaticamente l'errore dopo un po'
        setTimeout(() => setError(null), 5000);
    }, []);

    const clearError = () => setError(null);

    const startNewProject = useCallback(() => {
        setParsedFiles([]);
        setCurrentView('input');
        setError(null);
    }, []);

    // --- LOGICA DI BUSINESS (GESTITA NEL CONTESTO) ---

    const handleProcessInput = useCallback(async (input: string | File[]) => {
        setIsProcessing(true);
        setError(null);
        let pipelineData: PipelineData = {
            fullProjectContent: '', files: [], documentationNotes: ''
        };

        try {
            setProcessingMessage('1/X: Preparazione dell\'input...');
            pipelineData.fullProjectContent = typeof input === 'string' ? input : await processInputFiles(input);
            pipelineData.files = parseWithRegex(pipelineData.fullProjectContent);
            
            const activeSteps = workflowSteps.filter(step => step.enabled);
            for (let i = 0; i < activeSteps.length; i++) {
                const step = activeSteps[i];
                setProcessingMessage(`${i + 2}/${activeSteps.length + 1}: Esecuzione "${step.name}"...`);

                switch(step.type) {
                    case 'FIND_FILES':
                        pipelineData = await findAdditionalFiles(pipelineData, step.prompt, apiKey);
                        break;
                    case 'EXTRACT_DOCS':
                        pipelineData = await extractDocumentationNotes(pipelineData, step.prompt, apiKey);
                        break;
                    case 'GENERATE_README':
                        const readmeContent = await generateReadme(pipelineData, step.prompt, apiKey);
                        const readmeIndex = pipelineData.files.findIndex(f => f.path.toLowerCase() === 'readme.md');
                        if (readmeIndex > -1) {
                            pipelineData.files[readmeIndex].content = readmeContent;
                        } else {
                            pipelineData.files.unshift({ path: 'README.md', content: readmeContent });
                        }
                        break;
                }
            }

            if (pipelineData.files.length === 0) throw new Error("Impossibile analizzare i file. Verifica il formato.");
            
            setParsedFiles(pipelineData.files);
            setCurrentView('editor');

        } catch (err: any) {
            showError(err.message || "Errore imprevisto durante l'elaborazione.");
            setCurrentView('input');
        } finally {
            setIsProcessing(false);
            setProcessingMessage(null);
        }
    }, [workflowSteps, apiKey, showError]);

    const handleRefactorRequest = useCallback(async (currentContent: string, prompt: string): Promise<string | null> => {
        setIsProcessing(true);
        setProcessingMessage('Refactoring del codice...');
        try {
            return await refactorCode(currentContent, prompt, apiKey);
        } catch (e) {
            showError(e instanceof Error ? e.message : 'Errore sconosciuto durante il refactoring.');
            return null;
        } finally {
            setIsProcessing(false);
            setProcessingMessage(null);
        }
    }, [apiKey, showError]);
    
    // Valore fornito ai componenti consumatori
    const value: AppContextType = {
        currentView,
        isProcessing,
        processingMessage,
        error,
        apiKey,
        parsedFiles,
        setView,
        showError,
        clearError,
        setApiKey,
        setParsedFiles,
        handleProcessInput,
        handleRefactorRequest,
        startNewProject,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

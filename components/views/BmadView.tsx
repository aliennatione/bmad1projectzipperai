import React, { useState, useCallback, useRef, useEffect } from 'react';
import { marked } from 'marked';
import { BmadMessage, BmadPhase, ParsedFile } from '../../types';
import { INITIAL_BMAD_HISTORY, GEMINI_FLASH_MODEL } from '../../constants';
import { BMAD_WORKFLOW_PROMPTS } from '../../services/prompts';
import { getAiClient } from '../../services/geminiService';
import { parseWithRegex } from '../../services/projectParser';
import { FileIcon, WorkflowIcon } from '../icons';
import { ApiKeyEditor } from '../shared/ApiKeyEditor';
import { useAppContext } from '../../context/AppContext';

/**
 * @file Vista per l'interfaccia guidata del Metodo BMAD.
 * 
 * Questo componente orchestra un workflow a più fasi per la generazione di progetti.
 * Guida l'utente attraverso le fasi di Analisi, Pianificazione, Soluzione e Implementazione,
 * interagendo con agenti AI specializzati per produrre artefatti di progetto
 * (documenti e codice).
 * 
 * Utilizza `useAppContext` per la gestione della chiave API e per passare
 * il progetto finale all'editor principale.
 */

// --- SOTTO-COMPONENTI ---

const Message: React.FC<{ message: BmadMessage }> = ({ message }) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.innerHTML = marked.parse(message.content) as string;
        }
    }, [message.content]);

    const isUser = message.role === 'user';
    const bgColor = isUser ? 'bg-teal-500/20' : 'bg-gray-700/50';
    const align = isUser ? 'items-end' : 'items-start';

    return (
        <div className={`flex flex-col ${align} w-full`}>
            <div className={`max-w-full w-auto p-4 rounded-lg ${bgColor}`}>
                {!isUser && message.agent && (
                    <span className="text-xs font-bold text-teal-300 uppercase tracking-wider block mb-2">
                        {message.agent}
                    </span>
                )}
                <div ref={contentRef} className="prose prose-invert prose-sm max-w-none"></div>
            </div>
        </div>
    );
};


// --- COMPONENTE PRINCIPALE DELLA VISTA ---

export const BmadView: React.FC = () => {
    const { apiKey, setApiKey, setView, setParsedFiles, showError } = useAppContext();
    const [history, setHistory] = useState<BmadMessage[]>(INITIAL_BMAD_HISTORY);
    const [currentPhase, setCurrentPhase] = useState<BmadPhase>('IDLE');
    const [isProcessing, setIsProcessing] = useState(false);
    const [generatedArtifacts, setGeneratedArtifacts] = useState<ParsedFile[]>([]);
    const [userInput, setUserInput] = useState('');

    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [history]);

    const handlePhaseTransition = useCallback(async () => {
        const ai = getAiClient(apiKey);
        if (!ai) {
            showError("Per favore, fornisci una chiave API valida per usare il Metodo BMAD.");
            return;
        }
        
        setIsProcessing(true);
        let nextPhase: BmadPhase = 'IDLE';
        let promptConfig;
        let userMessageContent = '';
        let combinedContext = generatedArtifacts.map(f => `### \`${f.path}\`\n\`\`\`\n${f.content}\n\`\`\``).join('\n---\n');

        switch (currentPhase) {
            case 'IDLE':
                if (!userInput.trim()) {
                    showError("Per favore, descrivi la tua idea di progetto.");
                    setIsProcessing(false);
                    return;
                }
                nextPhase = 'ANALYSIS';
                promptConfig = BMAD_WORKFLOW_PROMPTS.ANALYSIS;
                userMessageContent = userInput;
                setHistory(prev => [...prev, { role: 'user', content: userInput }]);
                setUserInput('');
                break;
            case 'ANALYSIS': nextPhase = 'PLANNING'; promptConfig = BMAD_WORKFLOW_PROMPTS.PLANNING; userMessageContent = `Ecco il Product Brief. Ora genera il PRD e le Epiche.\n\n${combinedContext}`; break;
            case 'PLANNING': nextPhase = 'SOLUTIONING'; promptConfig = BMAD_WORKFLOW_PROMPTS.SOLUTIONING; userMessageContent = `Ecco il PRD e le Epiche. Ora genera l'Architettura.\n\n${combinedContext}`; break;
            case 'SOLUTIONING': nextPhase = 'IMPLEMENTATION'; promptConfig = BMAD_WORKFLOW_PROMPTS.IMPLEMENTATION; userMessageContent = `Ecco tutta la documentazione. Ora genera la struttura del progetto e il codice.\n\n${combinedContext}`; break;
            case 'IMPLEMENTATION': nextPhase = 'DONE'; setIsProcessing(false); return;
        }

        if (!promptConfig) {
            setIsProcessing(false);
            return;
        }
        
        const loadingMessage: BmadMessage = { role: 'model', agent: promptConfig.agent, content: '...' };
        setHistory(prev => [...prev, loadingMessage]);

        try {
            const fullPrompt = `${promptConfig.systemInstruction}\n\nEcco l'input:\n---\n${userMessageContent}`;
            const response = await ai.models.generateContent({
                model: GEMINI_FLASH_MODEL,
                contents: fullPrompt
            });
            
            const responseText = response.text ?? '';
            const newFiles = parseWithRegex(responseText);
            const allFiles = currentPhase === 'IDLE' ? newFiles : [...generatedArtifacts, ...newFiles.filter(nf => !generatedArtifacts.some(af => af.path === nf.path))];
            
            setGeneratedArtifacts(allFiles);

            setHistory(prev => {
                const newHistory = [...prev];
                newHistory[newHistory.length - 1] = { role: 'model', agent: promptConfig.agent, content: responseText };
                return newHistory;
            });
            setCurrentPhase(nextPhase);

        } catch (err: any) {
            showError(`Errore durante la fase ${currentPhase}: ${err.message || 'Errore sconosciuto'}`);
            setHistory(prev => prev.filter(msg => msg.content !== '...'));
        } finally {
            setIsProcessing(false);
        }

    }, [apiKey, currentPhase, userInput, generatedArtifacts, showError]);
    
    const handleUseProject = () => {
        setParsedFiles(generatedArtifacts);
        setView('editor');
    };

    const phaseConfig = {
        'IDLE': { title: 'Fase 1: Analisi', button: 'Avvia Analisi', enabled: !!userInput.trim() },
        'ANALYSIS': { title: 'Fase 2: Pianificazione', button: 'Genera Piano', enabled: true },
        'PLANNING': { title: 'Fase 3: Soluzione', button: 'Genera Architettura', enabled: true },
        'SOLUTIONING': { title: 'Fase 4: Implementazione', button: 'Genera Codice Progetto', enabled: true },
        'IMPLEMENTATION': { title: 'Completato', button: 'Progetto Generato', enabled: false },
        'DONE': { title: 'Completato', button: 'Progetto Generato', enabled: false },
    };
    
    const currentAction = phaseConfig[currentPhase];
    const PHASES: BmadPhase[] = ['ANALYSIS', 'PLANNING', 'SOLUTIONING', 'IMPLEMENTATION', 'DONE'];
    const currentPhaseIndex = PHASES.indexOf(currentPhase === 'IDLE' ? 'ANALYSIS' : currentPhase);

    return (
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Interaction Panel */}
            <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-blue-400 flex items-center"><WorkflowIcon /> Metodo Guidato BMAD</h2>
                    <button onClick={() => setView('input')} className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                        &larr; Torna all'Input
                    </button>
                </div>

                <div ref={chatContainerRef} className="w-full h-[60vh] bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4 overflow-y-auto flex flex-col">
                    {history.map((msg, index) => (
                        <Message key={index} message={msg} />
                    ))}
                     {isProcessing && (
                         <div className="flex flex-col items-start w-full">
                            <div className="max-w-3xl w-auto p-4 rounded-lg bg-gray-700/50 text-gray-200">
                               <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                               </div>
                            </div>
                        </div>
                    )}
                </div>

                {currentPhase === 'IDLE' && (
                    <textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Descrivi qui la tua idea di progetto..."
                        disabled={isProcessing}
                        className="w-full bg-gray-800 border-2 border-gray-600 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-200 placeholder-gray-500"
                        rows={5}
                    />
                )}
            </div>

            {/* Dashboard Panel */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col gap-6 h-fit lg:sticky top-8">
                 <ApiKeyEditor value={apiKey} onChange={setApiKey} />
                
                <div>
                    <h3 className="font-bold text-lg text-gray-200 mb-3">Progresso Workflow</h3>
                    <ol className="relative border-l border-gray-600">
                        {PHASES.map((phase, index) => (
                            <li key={phase} className={`ml-4 ${index === PHASES.length -1 ? '' : 'mb-6'}`}>
                                <div className={`absolute w-3 h-3 rounded-full mt-1.5 -left-1.5 border border-white ${currentPhaseIndex >= index ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
                                <h4 className={`text-sm font-semibold ${currentPhaseIndex >= index ? 'text-blue-300' : 'text-gray-500'}`}>{phase}</h4>
                            </li>
                        ))}
                    </ol>
                </div>
                
                <div>
                    <h3 className="font-bold text-lg text-gray-200 mb-3">Artefatti Generati</h3>
                    <div className="max-h-48 overflow-y-auto pr-2">
                        {generatedArtifacts.length > 0 ? (
                             <ul className="space-y-2">
                                {generatedArtifacts.map(file => (
                                    <li key={file.path} className="flex items-center text-sm bg-gray-900/50 p-2 rounded-md">
                                        <FileIcon />
                                        <span className="text-gray-300 truncate">{file.path}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500">Nessun artefatto generato ancora.</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-gray-700">
                     {currentPhase !== 'DONE' && currentPhase !== 'IMPLEMENTATION' && (
                        <button
                            onClick={handlePhaseTransition}
                            disabled={isProcessing || !currentAction.enabled}
                            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? 'In Elaborazione...' : currentAction.button}
                        </button>
                    )}
                     <button 
                        onClick={handleUseProject}
                        disabled={isProcessing || currentPhase !== 'IMPLEMENTATION'}
                        className="w-full px-5 py-2.5 bg-gray-700 hover:bg-teal-500 text-white font-bold rounded-lg transition-colors transform hover:scale-105 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none"
                        title={currentPhase !== 'IMPLEMENTATION' ? "Disponibile dopo la fase di Implementazione." : "Passa alla vista editor con questo progetto."}
                     >
                        Usa Questa Struttura &rarr;
                     </button>
                </div>
            </div>
        </div>
    );
};

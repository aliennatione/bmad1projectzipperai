import React, { useState, useCallback, useRef, useEffect } from 'react';
import { WorkflowStep } from '../../types';
import { UploadIcon } from '../icons';
import { WorkflowEditor } from '../WorkflowEditor';
import { useAppContext } from '../../context/AppContext';
import { codeRefactoringPrompt } from '../../services/prompts';
import { ApiKeyEditor } from '../shared/ApiKeyEditor';
// FIX: import INITIAL_WORKFLOW_STEPS to avoid using require
import { INITIAL_WORKFLOW_STEPS } from '../../constants';


/**
 * @file Vista principale per l'input dell'utente.
 * 
 * Questa vista presenta all'utente le diverse modalità di avvio di un progetto:
 * 1.  Input diretto tramite testo o caricamento di file.
 * 2.  Avvio dell'Architetto Chat per una progettazione conversazionale.
 * 3.  Avvio del Metodo BMAD per un workflow guidato.
 * 
 * Include anche sezioni a scomparsa per la configurazione avanzata, come
 * la personalizzazione della pipeline di generazione, l'inserimento di una
 * chiave API e la modifica dei prompt.
 * 
 * Utilizza `useAppContext` per interagire con lo stato globale e le azioni.
 */

// --- SOTTO-COMPONENTI ---

/**
 * Proprietà per il componente CollapsibleSection.
 */
interface CollapsibleSectionProps {
    title: React.ReactNode;
    children: React.ReactNode;
    startOpen?: boolean;
}

/**
 * Un componente UI che mostra una sezione di contenuto espandibile/comprimibile.
 */
const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, startOpen = false }) => {
    const [isOpen, setIsOpen] = useState(startOpen);

    const ChevronIcon = () => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-6 w-6 transition-transform duration-300 text-gray-400 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
    );

    return (
        <div className="w-full bg-gray-800 border border-gray-700 rounded-lg">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left"
                aria-expanded={isOpen}
            >
                <div className="flex-1">{title}</div>
                <ChevronIcon />
            </button>
            <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[5000px]' : 'max-h-0'}`}
                 style={{ transitionProperty: 'max-height' }}
            >
                <div className={`p-4 pt-0 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

/**
 * Componente per il caricamento di file con supporto drag-and-drop.
 */
const FileUploader: React.FC = () => {
    const { isProcessing, handleProcessInput } = useAppContext();
    const [isDragging, setIsDragging] = useState(false);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
        else if (e.type === "dragleave") setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files?.length) handleProcessInput(Array.from(e.dataTransfer.files));
    }, [handleProcessInput]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) handleProcessInput(Array.from(e.target.files));
    };

    return (
        <div className="w-full">
            <label
                htmlFor="dropzone-file"
                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                ${isProcessing ? 'cursor-not-allowed' : ''}
                ${isDragging ? 'border-teal-400 bg-gray-700' : 'border-gray-600 bg-gray-800 hover:bg-gray-700'}`}
            >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadIcon />
                <p className="mb-2 text-sm text-gray-400"><span className="font-semibold text-teal-400">Clicca per caricare</span> o trascina e rilascia</p>
                <p className="text-xs text-gray-500">File TXT, MD, o ZIP</p>
                </div>
                <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept=".txt,.md,.zip" disabled={isProcessing} multiple />
            </label>
        </div>
    );
};

/**
 * Componente per l'input di testo.
 */
const TextAreaUploader: React.FC = () => {
    const { isProcessing, handleProcessInput } = useAppContext();
    const [text, setText] = useState('');

    return (
        <form onSubmit={(e) => { e.preventDefault(); if (text.trim() && !isProcessing) handleProcessInput(text.trim()); }} className="w-full flex flex-col items-center space-y-4">
            <textarea
                className="w-full h-80 bg-gray-800 border-2 border-gray-600 rounded-lg p-4 focus:ring-teal-500 focus:border-teal-500 transition-colors text-gray-200 placeholder-gray-500 font-mono text-sm"
                placeholder="Incolla qui la struttura del tuo progetto o la descrizione testuale..."
                value={text} onChange={(e) => setText(e.target.value)} disabled={isProcessing} aria-label="Input per il contenuto del progetto"
            />
            <button type="submit" disabled={!text.trim() || isProcessing} className="inline-flex items-center justify-center px-8 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg transition-colors disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105">
                Genera Progetto dal Testo
            </button>
        </form>
    );
};

/**
 * Un editor per modificare prompt specifici, come quello di refactoring.
 */
const PromptEditor: React.FC<{ title: string, description: string, value: string, onChange: (v: string) => void }> = 
({ title, description, value, onChange }) => (
    <div className="space-y-2">
        <label className="font-semibold text-gray-300 block">{title}</label>
        <p className="text-xs text-gray-400">{description}</p>
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-40 bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-sm font-mono focus:ring-teal-500 focus:border-teal-500"
        />
    </div>
);

/**
 * Componente per importare ed esportare le impostazioni dell'applicazione.
 */
const SettingsManager: React.FC<{ 
    onExport: () => void; 
    onImport: (file: File) => void; 
}> = ({ onExport, onImport }) => {
    const importInputRef = useRef<HTMLInputElement>(null);

    const handleImportClick = () => {
        importInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            onImport(e.target.files[0]);
            e.target.value = ''; // Resetta per permettere di ricaricare lo stesso file
        }
    };

    return (
        <div className="space-y-2 p-4 bg-gray-900/50 rounded-lg border border-gray-600">
            <h4 className="font-semibold text-gray-300 block">Gestione Impostazioni</h4>
            <p className="text-xs text-gray-400">Esporta o importa la configurazione del workflow e dei prompt personalizzati come file JSON.</p>
            <div className="flex gap-4 pt-2">
                <button
                    onClick={onExport}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-md transition-colors"
                >
                    Esporta Impostazioni
                </button>
                <button
                    onClick={handleImportClick}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-md transition-colors"
                >
                    Importa Impostazioni
                </button>
                <input
                    ref={importInputRef}
                    type="file"
                    className="hidden"
                    accept=".json"
                    onChange={handleFileChange}
                />
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPALE DELLA VISTA ---

export const InputView: React.FC = () => {
    const { apiKey, setApiKey, setView, showError } = useAppContext();
    const [inputMode, setInputMode] = useState<'text' | 'upload'>('text');
    
    // Stato locale per le impostazioni personalizzabili, per evitare di
    // propagare ogni modifica allo stato globale istantaneamente.
    const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
    const [localRefactorPrompt, setLocalRefactorPrompt] = useState(codeRefactoringPrompt);

    // TODO: In un'app più complessa, queste impostazioni verrebbero caricate
    // da una fonte persistente (es. localStorage) all'interno del context.
    // Per ora, le carichiamo qui.
    useEffect(() => {
        // Simula il caricamento delle impostazioni iniziali
        // FIX: Use imported constant instead of require.
        setWorkflowSteps(INITIAL_WORKFLOW_STEPS);
    }, []);

    const handleExportSettings = useCallback(() => {
        const settings = { workflowSteps, refactorPrompt: localRefactorPrompt };
        const jsonString = JSON.stringify(settings, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'projectzipperai_settings.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [workflowSteps, localRefactorPrompt]);

    const handleImportSettings = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                if (!text) throw new Error("File vuoto o illeggibile.");
                const settings = JSON.parse(text);
                if (settings.workflowSteps) setWorkflowSteps(settings.workflowSteps);
                if (settings.refactorPrompt) setLocalRefactorPrompt(settings.refactorPrompt);
            } catch (err: any) {
                showError(`Impossibile importare le impostazioni: ${err.message}`);
            }
        };
        reader.readAsText(file);
    }, [showError]);

    return (
        <div className="w-full flex flex-col items-center space-y-6">
             <div className="w-full p-6 mb-6 bg-gray-800 border border-gray-700 rounded-lg text-center">
                <h3 className="text-xl font-semibold text-gray-200">Parti da un'idea con l'AI</h3>
                <p className="text-sm text-gray-400 mt-2 mb-4">Non sai da dove iniziare? Lasciati guidare dai nostri assistenti AI per definire e strutturare il tuo progetto.</p>
                <div className="flex justify-center gap-4 flex-wrap">
                    <button onClick={() => setView('architect')} className="px-5 py-2.5 bg-gray-700 hover:bg-teal-500 text-white font-bold rounded-lg transition-colors transform hover:scale-105">
                        Avvia Architetto Chat &rarr;
                    </button>
                    <button onClick={() => setView('bmad')} className="px-5 py-2.5 bg-gray-700 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors transform hover:scale-105">
                        Avvia Metodo BMAD &rarr;
                    </button>
                </div>
            </div>

            <div className="w-full flex flex-col items-center space-y-6 p-6 bg-gray-800/50 border border-gray-700 rounded-lg">
                <div className="flex justify-center">
                    <div className="inline-flex rounded-md shadow-sm bg-gray-800 p-1">
                        <button
                            onClick={() => setInputMode('text')}
                            className={`px-4 py-2 text-sm font-medium rounded-l-md transition-colors focus:z-10 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-teal-500
                                ${inputMode === 'text' ? 'bg-teal-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                        >
                            Incolla Testo
                        </button>
                         <button
                            onClick={() => setInputMode('upload')}
                            className={`px-4 py-2 text-sm font-medium rounded-r-md transition-colors focus:z-10 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-teal-500
                                ${inputMode === 'upload' ? 'bg-teal-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                        >
                            Carica File
                        </button>
                    </div>
                </div>
                {inputMode === 'upload' ? <FileUploader /> : <TextAreaUploader />}
            </div>
            
            <CollapsibleSection title={
                <div>
                    <h3 className="text-xl font-bold text-gray-200">Personalizza Workflow di Generazione</h3>
                    <p className="text-gray-400 text-sm font-normal mt-1">Modifica la pipeline che l'AI seguirà per analizzare il tuo input.</p>
                </div>
            }>
                <div className="p-4">
                    <WorkflowEditor 
                        steps={workflowSteps}
                        onStepsChange={setWorkflowSteps}
                    />
                </div>
            </CollapsibleSection>
            
            <CollapsibleSection title={
                <div>
                    <h3 className="text-xl font-bold text-gray-200">Impostazioni Avanzate</h3>
                    <p className="text-gray-400 text-sm font-normal mt-1">Personalizza la chiave API e i prompt non legati al workflow.</p>
                </div>
            }>
                <div className="space-y-6 p-4">
                     <ApiKeyEditor value={apiKey} onChange={setApiKey} />
                     <SettingsManager onExport={handleExportSettings} onImport={handleImportSettings} />
                     <PromptEditor
                        title="Prompt Refactoring Codice"
                        description="Istruisce l'AI su come refattorizzare e migliorare il codice di un file nell'editor."
                        value={localRefactorPrompt}
                        onChange={setLocalRefactorPrompt}
                     />
                </div>
            </CollapsibleSection>
        </div>
    );
};
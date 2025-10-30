import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ParsedFile } from '../../types';
import { FolderIcon, FileIcon, DownloadIcon, SaveIcon, AddIcon, DeleteIcon, RefactorIcon } from '../icons';
import { useAppContext } from '../../context/AppContext';
import { codeRefactoringPrompt } from '../../services/prompts';


/**
 * @file Vista dell'editor del progetto.
 * 
 * Questa vista è il cuore dell'applicazione dove l'utente può interagire
 * con la struttura del progetto generata. È composta da tre componenti principali:
 * 1.  `FileTree`: Mostra la gerarchia di file e cartelle.
 * 2.  `FileEditor`: Un'area di testo per visualizzare e modificare il file selezionato.
 * 3.  `EditorView`: Il componente contenitore che orchestra le interazioni,
 *     come il salvataggio, l'aggiunta/rimozione di file, il refactoring e il download.
 * 
 * Utilizza `useAppContext` per accedere ai file del progetto e alle funzioni globali.
 */

// --- SOTTO-COMPONENTI ---

/**
 * Proprietà per il componente FileTree.
 */
interface FileTreeProps {
    files: ParsedFile[];
    onFileSelect: (path: string) => void;
    selectedFile: string | null;
    onAddFile: (path: string) => void;
    onDeleteFile: (path: string) => void;
}

/**
 * Componente che renderizza l'albero dei file del progetto in modo interattivo.
 * Permette la selezione, l'aggiunta e la rimozione di file.
 */
const FileTree: React.FC<FileTreeProps> = ({ files, onFileSelect, selectedFile, onAddFile, onDeleteFile }) => {
    const [isAddingFile, setIsAddingFile] = useState(false);
    const [newFilePath, setNewFilePath] = useState('');

    const handleAddFileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newFilePath.trim()) {
            onAddFile(newFilePath.trim());
            setNewFilePath('');
            setIsAddingFile(false);
        }
    };
    
    // La struttura ad albero dei file è memoizzata per performance, ricalcolata solo quando i file cambiano.
    const fileTree = useMemo(() => {
        const root: any = {};
        [...files].sort((a,b) => a.path.localeCompare(b.path)).forEach(file => {
            const parts = file.path.split('/');
            let currentLevel = root;
            parts.forEach((part, index) => {
                if (!currentLevel[part]) currentLevel[part] = {};
                if (index === parts.length - 1) currentLevel[part].isFile = true;
                currentLevel = currentLevel[part];
            });
        });
        return root;
    }, [files]);
    
    // Funzione ricorsiva per renderizzare l'albero dei file.
    const renderTree = (node: any, level = 0, pathPrefix = ''): React.ReactNode[] => {
        return Object.keys(node).sort((a, b) => {
            const aIsFile = !!node[a].isFile; const bIsFile = !!node[b].isFile;
            if (aIsFile && !bIsFile) return 1; if (!aIsFile && bIsFile) return -1;
            return a.localeCompare(b);
        }).map(key => {
            if (key === 'isFile') return null;
            const fullPath = pathPrefix ? `${pathPrefix}/${key}` : key;
            const isFile = node[key].isFile;
            const isSelected = isFile && fullPath === selectedFile;
            
            return (
                <div key={fullPath}>
                    <div className={`group flex items-center justify-between py-1 text-sm rounded-md px-2 transition-colors ${ isFile ? 'cursor-pointer hover:bg-gray-600' : '' } ${ isSelected ? 'bg-teal-500 text-white font-semibold' : ''}`}
                        style={{ paddingLeft: `${level * 20}px` }}
                        onClick={isFile ? () => onFileSelect(fullPath) : undefined}
                    >
                        <div className="flex items-center truncate">
                            {isFile ? <FileIcon /> : <FolderIcon />}
                            <span className="truncate">{key}</span>
                        </div>
                        {isFile && (
                            <button onClick={(e) => { e.stopPropagation(); onDeleteFile(fullPath); }} className="p-1 rounded-md hover:bg-red-500/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                <DeleteIcon />
                            </button>
                        )}
                    </div>
                    {!isFile && <div className="w-full mt-1">{renderTree(node[key], level + 1, fullPath)}</div>}
                </div>
            );
        });
    };

    return (
      <div className="w-full bg-gray-800 p-4 rounded-lg border border-gray-700 h-full overflow-y-auto flex flex-col">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-teal-400">Struttura Progetto</h3>
            <button onClick={() => setIsAddingFile(!isAddingFile)} className="flex items-center px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold rounded-md transition-colors">
                <AddIcon /> <span className="ml-1">Aggiungi File</span>
            </button>
        </div>
        {isAddingFile && (
            <form onSubmit={handleAddFileSubmit} className="mb-4 flex gap-2">
                <input
                    type="text"
                    value={newFilePath}
                    onChange={(e) => setNewFilePath(e.target.value)}
                    placeholder="percorso/del/nuovo-file.js"
                    className="flex-grow bg-gray-900 border border-gray-600 rounded-md px-2 py-1 text-xs focus:ring-teal-500 focus:border-teal-500"
                    autoFocus
                />
                <button type="submit" className="px-2 py-1 bg-teal-500 text-white text-xs font-semibold rounded-md hover:bg-teal-600">Aggiungi</button>
            </form>
        )}
        <div className="flex-grow overflow-y-auto">
            {renderTree(fileTree)}
        </div>
      </div>
    );
};

/**
 * Proprietà per il componente FileEditor.
 */
interface FileEditorProps {
    file: ParsedFile | null;
    onSave: (path: string, content: string) => void;
    onRefactor: (content: string) => Promise<string | null>;
}

/**
 * Componente editor di testo per visualizzare e modificare il contenuto di un file selezionato.
 * Integra funzionalità di salvataggio e refactoring tramite AI.
 */
const FileEditor: React.FC<FileEditorProps> = ({ file, onSave, onRefactor }) => {
    const [content, setContent] = useState('');
    const [isDirty, setIsDirty] = useState(false); // true se ci sono modifiche non salvate
    const [isRefactoring, setIsRefactoring] = useState(false);

    useEffect(() => {
        setContent(file?.content ?? '');
        setIsDirty(false);
    }, [file]);

    const handleSave = () => {
        if (file) {
            onSave(file.path, content);
            setIsDirty(false);
        }
    };

    const handleRefactorClick = async () => {
        if (!file || isRefactoring) return;

        setIsRefactoring(true);
        try {
            const newContent = await onRefactor(content);
            if (newContent !== null) {
                setContent(newContent);
                setIsDirty(true);
            }
        } finally {
            setIsRefactoring(false);
        }
    };

    if (!file) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 p-6 rounded-lg border-2 border-dashed border-gray-700 text-gray-500">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.5,9.5l-3.5-3.5L8,12.5v3.5h3.5L17.5,9.5z M16,5.5l2.5,2.5 M4.5,19.5h15" /></svg>
                <p className="mt-4 font-semibold text-lg text-gray-400">Seleziona un file da visualizzare o modificare</p>
                <p className="text-sm text-center">Clicca su un file nella struttura del progetto.</p>
            </div>
        );
    }
    
    return (
        <div className="w-full h-full flex flex-col bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center p-3 bg-gray-700/50 border-b border-gray-600 flex-shrink-0 flex-wrap gap-2">
                <span className="font-mono text-sm text-teal-300 truncate" title={file.path}>{file.path}</span>
                 <div className="flex items-center gap-2">
                    <button onClick={handleRefactorClick} disabled={isRefactoring} className="px-3 py-1 bg-gray-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-2 disabled:bg-gray-500 disabled:cursor-wait">
                        <RefactorIcon />
                        {isRefactoring ? 'Refactoring...' : 'Refactor'}
                    </button>
                    <button onClick={handleSave} disabled={!isDirty || isRefactoring} className="px-3 py-1 bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-2 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                        <SaveIcon />
                        {isDirty ? 'Salva Modifiche' : 'Salvato'}
                    </button>
                 </div>
            </div>
            <textarea
                value={content}
                onChange={(e) => { setContent(e.target.value); setIsDirty(true); }}
                className="w-full h-full p-4 text-sm text-gray-300 font-mono overflow-auto flex-grow bg-gray-900/50 rounded-b-lg focus:ring-1 focus:ring-teal-400 focus:outline-none"
                aria-label={`Editor per il contenuto di ${file.path}`}
            />
        </div>
    );
};


// --- COMPONENTE PRINCIPALE DELLA VISTA ---

declare var JSZip: any;

export const EditorView: React.FC = () => {
    const { parsedFiles, setParsedFiles, handleRefactorRequest, startNewProject } = useAppContext();
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

    // Seleziona il primo file quando i file vengono caricati
    useEffect(() => {
        if (parsedFiles.length > 0 && !selectedFilePath) {
            setSelectedFilePath(parsedFiles[0].path);
        }
    }, [parsedFiles, selectedFilePath]);

    const handleDownloadZip = useCallback(async () => {
        if (parsedFiles.length === 0) return;
        const zip = new JSZip();
        parsedFiles.forEach(f => {
            zip.file(f.path, f.content);
        });
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'progetto-gemini.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [parsedFiles]);

    const handleSaveFile = (path: string, content: string) => {
        setParsedFiles(currentFiles => currentFiles.map(f => f.path === path ? { ...f, content } : f));
    };
    
    const handleAddFile = (path: string) => {
        if (!path || parsedFiles.some(f => f.path === path)) {
            alert("Percorso file non valido o duplicato.");
            return;
        }
        setParsedFiles(current => [...current, { path, content: '' }]);
        setSelectedFilePath(path);
    };
    
    const handleDeleteFile = (path: string) => {
        if (confirm(`Sei sicuro di voler eliminare ${path}?`)) {
            setParsedFiles(current => current.filter(f => f.path !== path));
            if (selectedFilePath === path) setSelectedFilePath(null);
        }
    };

    const handleRefactor = (content: string) => {
        // TODO: Il prompt di refactoring dovrebbe venire dalle impostazioni globali/locali
        return handleRefactorRequest(content, codeRefactoringPrompt);
    }
      
    const selectedFile = parsedFiles.find(f => f.path === selectedFilePath) || null;
    
    // L'altezza qui è calcolata per occupare lo spazio verticale rimanente.
    return (
        <div className="w-full flex flex-col h-[calc(100vh-240px)]">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-teal-400">Editor del Progetto</h2>
                <div className="flex items-center gap-3">
                    <button onClick={handleDownloadZip} className="inline-flex items-center justify-center px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg transition-transform transform hover:scale-105">
                       <DownloadIcon /> Scarica Progetto
                    </button>
                    <button onClick={startNewProject} className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                        Ricomincia
                    </button>
                </div>
            </div>
            <div className="flex-grow w-full grid grid-cols-1 lg:grid-cols-3 items-start gap-6 h-full min-h-0">
                <div className="w-full h-full lg:col-span-1 min-h-0">
                    <FileTree 
                        files={parsedFiles} 
                        selectedFile={selectedFilePath} 
                        onFileSelect={setSelectedFilePath}
                        onAddFile={handleAddFile}
                        onDeleteFile={handleDeleteFile}
                    />
                </div>
                <div className="w-full h-full lg:col-span-2 min-h-0">
                     <FileEditor 
                        file={selectedFile}
                        onSave={handleSaveFile}
                        onRefactor={handleRefactor}
                    />
                </div>
            </div>
        </div>
    );
};

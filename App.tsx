import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { InputView } from './components/views/InputView';
import { EditorView } from './components/views/EditorView';
import { ChatArchitectView } from './components/views/ChatArchitectView';
import { BmadView } from './components/views/BmadView';

/**
 * @file Componente radice dell'applicazione ProjectZipperAI.
 * 
 * Questo file definisce il layout principale, orchestra il rendering delle viste
 * e fornisce lo stato globale tramite `AppProvider`. Il componente `AppContent`
 * al suo interno si occupa di selezionare e visualizzare la vista corretta
 * (Input, Editor, Chat, BMAD) e di mostrare indicatori di stato globali come
 * la schermata di caricamento e le notifiche di errore.
 */


/**
 * Componente per la notifica di errore globale (toast).
 * Appare quando c'è un messaggio di errore nello stato globale.
 */
const GlobalErrorToast: React.FC = () => {
    const { error, clearError } = useAppContext();
    if (!error) return null;

    return (
        <div className="fixed bottom-5 right-5 w-full max-w-sm p-4 bg-red-800 border border-red-600 rounded-lg shadow-lg text-white z-50 animate-pulse">
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-bold">Si è verificato un errore</p>
                    <p className="mt-1 text-sm">{error}</p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                    <button onClick={clearError} className="inline-flex text-red-200 hover:text-white">
                        <span className="sr-only">Chiudi</span>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Componente per la schermata di caricamento globale.
 * Copre l'intera pagina per prevenire interazioni durante operazioni critiche.
 */
const GlobalLoader: React.FC = () => {
    const { isProcessing, processingMessage } = useAppContext();
    if (!isProcessing) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center flex-col text-center p-8 z-50">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-400"></div>
            <p className="mt-4 text-lg font-semibold text-white">{processingMessage || 'Elaborazione in corso...'}</p>
        </div>
    );
};


/**
 * Contenuto principale dell'applicazione.
 * Renderizza la vista corrente in base allo stato del `AppContext`.
 */
const AppContent: React.FC = () => {
    const { currentView } = useAppContext();

    const renderCurrentView = () => {
        switch(currentView) {
            case 'architect': return <ChatArchitectView />;
            case 'bmad': return <BmadView />;
            case 'editor': return <EditorView />;
            case 'input':
            default:
                return <InputView />;
        }
    };
    
    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-8">
            <header className="text-center mb-8">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">ProjectZipperAI</h1>
                <p className="mt-2 text-lg text-gray-400">Progetta con l'AI, genera con un workflow, scarica il tuo progetto.</p>
            </header>

            <main className="w-full max-w-7xl flex flex-col items-center">
                {renderCurrentView()}
            </main>
            
            <footer className="mt-12 text-center text-gray-500 text-sm">
                <p>&copy; {new Date().getFullYear()} ProjectZipperAI. Realizzato con React, Gemini, Tailwind CSS, e JSZip.</p>
                <p className="mt-1">
                    Questo è un progetto open-source. Visualizza il codice su{' '}
                    <a href="https://github.com/google/generative-ai-docs/tree/main/demos/project_zipper" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">
                    GitHub
                    </a>!
                </p>
            </footer>

            <GlobalLoader />
            <GlobalErrorToast />
        </div>
    );
};


/**
 * Componente radice che wrappa l'intera applicazione con il provider di contesto.
 */
const App: React.FC = () => {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
};

export default App;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { marked } from 'marked';
import { Chat } from '@google/genai';
import { ChatMessage } from '../../types';
import { examplePrompts, architectSystemPrompt } from '../../services/prompts';
import { ChevronUpIcon } from '../icons';
import { useAppContext } from '../../context/AppContext';
import { getAiClient } from '../../services/geminiService';
import { GEMINI_FLASH_MODEL, INITIAL_CHAT_HISTORY } from '../../constants';
import { ApiKeyEditor } from '../shared/ApiKeyEditor';
import { parseWithRegex } from '../../services/projectParser';

/**
 * @file Vista per l'interfaccia dell'Architetto Chat.
 * 
 * Questa vista permette una conversazione interattiva con un assistente AI
 * specializzato nella progettazione di software. L'utente può definire un
 * progetto da zero, iterare sulla struttura e sul codice, e infine
 * utilizzare l'output per popolare l'editor principale.
 * 
 * Utilizza `useAppContext` per la gestione della chiave API e per passare
 * il progetto generato alle altre viste.
 */


// --- SOTTO-COMPONENTI ---

/**
 * Visualizza un singolo messaggio nella chat, formattando il contenuto
 * come Markdown per i messaggi del modello.
 */
const Message: React.FC<{ message: ChatMessage }> = React.memo(({ message }) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (message.role === 'model' && contentRef.current) {
            // Converte il testo Markdown in HTML e lo inserisce nell'elemento.
            // DOMPurify sarebbe raccomandato in produzione per sicurezza.
            contentRef.current.innerHTML = marked.parse(message.content) as string;
        }
    }, [message.content, message.role]);

    const isUser = message.role === 'user';
    const bgColor = isUser ? 'bg-teal-500/20' : 'bg-gray-700/50';
    const align = isUser ? 'items-end' : 'items-start';
    const textColor = isUser ? 'text-teal-200' : 'text-gray-200';

    return (
        <div className={`flex flex-col ${align} w-full`}>
            <div className={`max-w-3xl w-auto p-4 rounded-lg ${bgColor} ${textColor}`}>
                {message.role === 'model' ? (
                    <div ref={contentRef} className="prose prose-invert prose-sm max-w-none"></div>
                ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                )}
            </div>
        </div>
    );
});

/**
 * Sezione a scomparsa per modificare il prompt di sistema dell'Architetto.
 */
const SystemPromptEditor: React.FC<{
    prompt: string;
    onPromptChange: (newPrompt: string) => void;
}> = ({ prompt, onPromptChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="w-full bg-gray-800 border border-gray-700 rounded-lg">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left"
            >
                <h3 className="font-semibold text-gray-200">Personalizza Prompt di Sistema dell'Architetto</h3>
                <div className={`transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`}>
                    <ChevronUpIcon />
                </div>
            </button>
            {isOpen && (
                <div className="p-4 pt-0">
                    <p className="text-xs text-gray-400 mb-2">
                        Questo prompt definisce la "personalità" e le istruzioni per l'Architetto AI. Modificalo per adattarlo alle tue esigenze.
                    </p>
                    <textarea
                        value={prompt}
                        onChange={(e) => onPromptChange(e.target.value)}
                        className="w-full h-48 bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-sm font-mono focus:ring-teal-500 focus:border-teal-500"
                    />
                </div>
            )}
        </div>
    );
};

// --- COMPONENTE PRINCIPALE DELLA VISTA ---

export const ChatArchitectView: React.FC = () => {
    const { apiKey, setApiKey, setParsedFiles, setView, showError } = useAppContext();

    const [chatHistory, setChatHistory] = useState<ChatMessage[]>(INITIAL_CHAT_HISTORY);
    const [isProcessing, setIsProcessing] = useState(false);
    const [editableSystemPrompt, setEditableSystemPrompt] = useState(architectSystemPrompt);
    const [chatInstance, setChatInstance] = useState<Chat | null>(null);
    const [currentMessage, setCurrentMessage] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Re-inizializza la chat se il prompt di sistema o la chiave API cambiano
    useEffect(() => {
        const ai = getAiClient(apiKey);
        if (ai) {
            const newChat = ai.chats.create({
                model: GEMINI_FLASH_MODEL,
                config: { systemInstruction: editableSystemPrompt },
            });
            setChatInstance(newChat);
        }
    }, [apiKey, editableSystemPrompt]);

    // Scrolla automaticamente alla fine della chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);
    
    const handleSendMessage = useCallback(async (message: string) => {
        if (!chatInstance) {
            showError("L'Architetto AI non è inizializzato. Controlla la tua chiave API.");
            return;
        }
        setIsProcessing(true);
        const updatedHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: message }];
        setChatHistory(updatedHistory);
        
        try {
            const stream = await chatInstance.sendMessageStream({ message });
            let modelResponse = '';
            setChatHistory(prev => [...prev, { role: 'model', content: '...' }]);

            for await (const chunk of stream) {
                modelResponse += chunk.text;
                setChatHistory(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1] = { role: 'model', content: modelResponse };
                    return newHistory;
                });
            }
        } catch (err: any) {
            showError(`Errore con l'Architetto AI: ${err.message || 'Errore sconosciuto'}`);
            setChatHistory(prev => prev.filter(msg => msg.role !== 'model' || msg.content !== '...'));
        } finally {
            setIsProcessing(false);
        }
    }, [chatInstance, chatHistory, showError]);

    const handleUseProject = useCallback(() => {
        const lastModelMessage = [...chatHistory].reverse().find(m => m.role === 'model');
        if (lastModelMessage) {
            const files = parseWithRegex(lastModelMessage.content);
            if (files.length > 0) {
                setParsedFiles(files);
                setView('editor');
            } else {
                showError("L'AI non ha ancora generato una struttura di file valida. Chiedigli di creare il progetto finale.");
            }
        }
    }, [chatHistory, setParsedFiles, setView, showError]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentMessage.trim() && !isProcessing) {
            handleSendMessage(currentMessage);
            setCurrentMessage('');
        }
    };

    const handleExampleClick = (content: string) => {
        setCurrentMessage(prev => prev ? `${prev}\n${content}` : content);
    };

    const isReadyToUseProject = chatHistory.some(m => m.role === 'model' && m.content.includes('###'));

    return (
        <div className="w-full flex flex-col items-center space-y-6">
            <div className="w-full p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                 <ApiKeyEditor value={apiKey} onChange={setApiKey} />
            </div>

            <div ref={chatContainerRef} className="w-full h-[50vh] bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4 overflow-y-auto flex flex-col">
                {chatHistory.map((msg, index) => <Message key={index} message={msg} />)}
                {isProcessing && chatHistory[chatHistory.length-1]?.role === 'user' && (
                     <div className="flex flex-col items-start w-full">
                        <div className="max-w-3xl w-auto p-4 rounded-lg bg-gray-700/50 text-gray-200">
                           <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                           </div>
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="w-full flex gap-4 items-start">
                <textarea
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e); }}
                    placeholder={isProcessing ? "L'architetto sta pensando..." : "Scrivi il tuo messaggio o usa un esempio..."}
                    disabled={isProcessing}
                    className="flex-grow bg-gray-800 border-2 border-gray-600 rounded-lg p-3 focus:ring-teal-500 focus:border-teal-500 transition-colors text-gray-200 placeholder-gray-500"
                    rows={3}
                />
                <button type="submit" disabled={!currentMessage.trim() || isProcessing} className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg transition-colors disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                    Invia
                </button>
            </form>
            
            <div className="w-full flex justify-between items-center gap-4 flex-wrap">
                 <div className="flex gap-2">
                    <span className="text-sm font-semibold text-gray-400">Esempi:</span>
                    {examplePrompts.slice(0, 2).map((p, i) => (
                        <button key={i} onClick={() => handleExampleClick(p.content)} className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors">
                           {p.title}
                        </button>
                    ))}
                 </div>
                 <button onClick={handleUseProject} disabled={!isReadyToUseProject || isProcessing} className="px-5 py-2.5 bg-gray-700 hover:bg-teal-500 text-white font-bold rounded-lg transition-colors transform hover:scale-105 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none" title={!isReadyToUseProject ? "Disponibile dopo che l'AI ha generato una struttura di file (con '### `path/file`')." : "Passa alla vista editor con questo progetto."}>
                    Usa Questa Struttura &rarr;
                 </button>
            </div>

            <SystemPromptEditor prompt={editableSystemPrompt} onPromptChange={setEditableSystemPrompt} />
        </div>
    );
};

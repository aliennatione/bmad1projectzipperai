import React from 'react';

/**
 * @file Componente condiviso per l'inserimento di una chiave API.
 * 
 * Questo componente fornisce un'interfaccia utente standard e riutilizzabile
 * per permettere all'utente di inserire la propria chiave API di Gemini.
 * Viene utilizzato in diverse viste dell'applicazione per garantire coerenza.
 */

interface ApiKeyEditorProps {
    value: string;
    onChange: (value: string) => void;
}

export const ApiKeyEditor: React.FC<ApiKeyEditorProps> = ({ value, onChange }) => (
    <div className="w-full space-y-2 p-4 bg-gray-900/50 rounded-lg border border-yellow-500/50">
        <label htmlFor="api-key-input" className="font-semibold text-yellow-300 block">Chiave API Gemini</label>
        <p className="text-xs text-gray-400">
            Se non fornita, l'app proverà a usare una variabile d'ambiente. La chiave inserita qui viene salvata solo nel tuo browser.
        </p>
        <input
            id="api-key-input"
            type="password"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Inserisci la tua chiave API Gemini..."
            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm font-mono focus:ring-yellow-500 focus:border-yellow-500"
            autoComplete="off"
        />
    </div>
);

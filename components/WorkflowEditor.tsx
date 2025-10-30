import React, { useState } from 'react';
import { v4 as uuidv4 } from 'https://esm.sh/uuid';
import { WorkflowStep, WorkflowStepType } from '../types';
import { DragHandleIcon, CloneIcon, DeleteIcon, ChevronUpIcon, PlusIcon } from './icons';
import { WORKFLOW_STEP_DEFINITIONS } from '../constants';

/**
 * @file Componente per la configurazione del workflow di generazione del progetto.
 * Permette all'utente di riordinare, abilitare/disabilitare, modificare,
 * clonare, eliminare e aggiungere i passaggi della pipeline.
 */

// --- SOTTO-COMPONENTI ---

/**
 * Editor per il prompt di un singolo passo del workflow.
 */
const PromptEditor: React.FC<{ value: string; onChange: (value: string) => void; }> = ({ value, onChange }) => (
    <div className="space-y-2">
        <label className="font-semibold text-gray-300 text-sm block">Prompt per questo Passaggio:</label>
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-48 bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-xs font-mono focus:ring-teal-500 focus:border-teal-500"
        />
    </div>
);

/**
 * Card che rappresenta un singolo passo del workflow.
 */
const WorkflowStepCard: React.FC<{
    step: WorkflowStep;
    onUpdate: (updatedStep: WorkflowStep) => void;
    onDelete: (id: string) => void;
    onClone: (id: string) => void;
    isDragging: boolean;
}> = ({ step, onUpdate, onDelete, onClone, isDragging }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`bg-gray-800 border rounded-lg transition-shadow ${isDragging ? 'shadow-2xl shadow-teal-500/30 border-teal-500' : 'border-gray-700'}`}>
            <div className="flex items-center p-3 gap-3">
                <div className="cursor-grab" title="Trascina per riordinare">
                    <DragHandleIcon />
                </div>
                <div className="flex-grow">
                    <h4 className="font-bold text-gray-200">{step.name}</h4>
                    <p className="text-xs text-gray-400">{step.description}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => onClone(step.id)} title="Clona Passo" className="p-2 rounded-md hover:bg-gray-700 transition-colors"><CloneIcon /></button>
                    <button onClick={() => onDelete(step.id)} title="Elimina Passo" className="p-2 rounded-md hover:bg-red-500/20 text-red-300 transition-colors"><DeleteIcon /></button>
                    <label htmlFor={`enable-step-${step.id}`} className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input
                                type="checkbox"
                                id={`enable-step-${step.id}`}
                                className="sr-only"
                                checked={step.enabled}
                                onChange={(e) => onUpdate({ ...step, enabled: e.target.checked })}
                            />
                            <div className={`block w-12 h-6 rounded-full transition-colors ${step.enabled ? 'bg-teal-500' : 'bg-gray-600'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${step.enabled ? 'translate-x-6' : ''}`}></div>
                        </div>
                    </label>
                     <button onClick={() => setIsOpen(!isOpen)} className={`p-2 rounded-md hover:bg-gray-700 transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`}>
                         <ChevronUpIcon />
                     </button>
                </div>
            </div>
            {isOpen && (
                <div className="p-4 border-t border-gray-700/50 space-y-4">
                     <div className="space-y-2">
                        <label className="font-semibold text-gray-300 text-sm block">Nome Passaggio</label>
                        <input
                            type="text"
                            value={step.name}
                            onChange={(e) => onUpdate({ ...step, name: e.target.value })}
                            className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-2 text-sm focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                     <div className="space-y-2">
                        <label className="font-semibold text-gray-300 text-sm block">Descrizione Passaggio</label>
                        <textarea
                            value={step.description}
                            onChange={(e) => onUpdate({ ...step, description: e.target.value })}
                            className="w-full h-24 bg-gray-900/50 border border-gray-600 rounded-lg p-2 text-sm focus:ring-teal-500 focus:border-teal-500"
                            rows={3}
                        />
                    </div>
                    <PromptEditor value={step.prompt} onChange={(p) => onUpdate({ ...step, prompt: p })} />
                </div>
            )}
        </div>
    );
};


// --- COMPONENTE PRINCIPALE ---

interface WorkflowEditorProps {
    steps: WorkflowStep[];
    onStepsChange: (steps: WorkflowStep[]) => void;
}

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ steps, onStepsChange }) => {
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    const handleUpdate = (updatedStep: WorkflowStep) => {
        onStepsChange(steps.map(s => s.id === updatedStep.id ? updatedStep : s));
    };

    const handleDelete = (id: string) => {
        if (confirm("Sei sicuro di voler eliminare questo passo del workflow?")) {
            onStepsChange(steps.filter(s => s.id !== id));
        }
    };
    
    const handleClone = (id: string) => {
        const stepToClone = steps.find(s => s.id === id);
        if (!stepToClone) return;
        const newStep = { ...stepToClone, id: uuidv4(), name: `${stepToClone.name} (Copia)` };
        const index = steps.findIndex(s => s.id === id);
        const newSteps = [...steps];
        newSteps.splice(index + 1, 0, newStep);
        onStepsChange(newSteps);
    };

    const handleAddStep = (type: WorkflowStepType) => {
        const definition = WORKFLOW_STEP_DEFINITIONS[type];
        if (!definition) return;
        const newStep: WorkflowStep = {
            id: uuidv4(),
            type: type,
            name: definition.name,
            description: definition.description,
            prompt: definition.prompt,
            enabled: true,
        };
        onStepsChange([...steps, newStep]);
        setIsAdding(false);
    };

    const handleDragStart = (e: React. DragEvent<HTMLDivElement>, id: string) => {
        setDraggedItemId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // Necessario per permettere il drop
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
        e.preventDefault();
        if (!draggedItemId || draggedItemId === targetId) return;

        const draggedIndex = steps.findIndex(s => s.id === draggedItemId);
        const targetIndex = steps.findIndex(s => s.id === targetId);

        const newSteps = [...steps];
        const [draggedItem] = newSteps.splice(draggedIndex, 1);
        newSteps.splice(targetIndex, 0, draggedItem);
        onStepsChange(newSteps);
        setDraggedItemId(null);
    };

    return (
        <div className="w-full bg-gray-800 border border-gray-700 rounded-lg">
            <div className="p-4">
                <h3 className="text-xl font-bold text-gray-200">Editor del Workflow di Generazione</h3>
                <p className="text-gray-400 text-sm font-normal mt-1">Personalizza la pipeline che l'AI seguirà per analizzare il tuo input e generare il progetto.</p>
            </div>
            <div className="p-4 pt-0 space-y-3">
                {steps.map(step => (
                     <div
                        key={step.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, step.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, step.id)}
                        className="transition-opacity"
                        style={{ opacity: draggedItemId === step.id ? 0.5 : 1 }}
                    >
                        <WorkflowStepCard 
                            step={step} 
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                            onClone={handleClone}
                            isDragging={draggedItemId === step.id}
                        />
                    </div>
                ))}
                {steps.length === 0 && <p className="text-center text-gray-500 py-4">Nessun passo nel workflow. Aggiungine uno per iniziare!</p>}
            </div>
            <div className="p-4 border-t border-gray-700">
                <button 
                    onClick={() => setIsAdding(!isAdding)} 
                    className="text-teal-400 font-semibold text-sm hover:text-teal-300 flex items-center gap-2"
                    aria-expanded={isAdding}
                >
                    <PlusIcon /> Aggiungi Passo al Workflow
                </button>
                {isAdding && (
                    <div className="mt-4 p-4 bg-gray-900/50 rounded-lg space-y-2 border border-gray-600">
                        <h4 className="text-sm font-semibold text-gray-300">Scegli un tipo di passo da aggiungere:</h4>
                        {Object.entries(WORKFLOW_STEP_DEFINITIONS).map(([type, def]) => (
                            <button
                                key={type}
                                onClick={() => handleAddStep(type as WorkflowStepType)}
                                className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
                            >
                                <p className="font-bold text-teal-400">{def.name}</p>
                                <p className="text-xs text-gray-400 mt-1">{def.description}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
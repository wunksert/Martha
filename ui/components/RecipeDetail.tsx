import React, { useState } from 'react';
import { Checkbox } from '@openai/apps-sdk-ui/components/Checkbox';
import { SegmentedControl } from '@openai/apps-sdk-ui/components/SegmentedControl';
import { Textarea } from '@openai/apps-sdk-ui/components/Textarea';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import { Markdown } from '@openai/apps-sdk-ui/components/Markdown';
import { Recipe } from './RecipeCard';

interface RecipeDetailProps {
  recipe: Recipe;
  onAddNote?: (recipeId: string, text: string, stepId?: string) => Promise<void>;
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, onAddNote }) => {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'steps'>('ingredients');
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [noteText, setNoteText] = useState("");
  const [activeStepNote, setActiveStepNote] = useState<string | null>(null);

  const toggleIngredient = (id: string) => {
    setCheckedIngredients(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleStep = (index: number) => {
    setCompletedSteps(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleSaveNote = async (stepId?: string) => {
    if (!noteText.trim() || !onAddNote) return;
    await onAddNote(recipe.id, noteText, stepId);
    setNoteText("");
    setActiveStepNote(null);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
             <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{recipe.title}</h2>
             {recipe.description && (
                 <div className="text-gray-600 dark:text-gray-400 text-sm">
                     <Markdown>{recipe.description}</Markdown>
                 </div>
             )}
        </div>

        <div className="p-4">
            <SegmentedControl 
                value={activeTab} 
                onChange={(val) => setActiveTab(val as any)}
                options={[
                    { label: 'Ingredients', value: 'ingredients' },
                    { label: 'Instructions', value: 'steps' }
                ]}
                className="mb-6"
            />

            {activeTab === 'ingredients' && (
                <div className="space-y-3">
                    {recipe.ingredients?.map((ing, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                            <Checkbox 
                                id={`ing-${idx}`}
                                checked={!!checkedIngredients[idx]}
                                onChange={() => toggleIngredient(String(idx))}
                            />
                            <label 
                                htmlFor={`ing-${idx}`}
                                className={`flex-1 cursor-pointer ${checkedIngredients[idx] ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}
                            >
                                <span className="font-semibold">{ing.quantity} {ing.unit}</span> {ing.name}
                            </label>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'steps' && (
                <div className="space-y-6">
                    {recipe.steps?.map((step, idx) => (
                        <div key={idx} className={`relative pl-4 border-l-2 ${completedSteps[idx] ? 'border-green-500' : 'border-gray-200 dark:border-gray-700'}`}>
                            <div className="flex items-start gap-3 mb-2">
                                <Checkbox 
                                    id={`step-${idx}`}
                                    checked={!!completedSteps[idx]}
                                    onChange={() => toggleStep(idx)}
                                />
                                <div className="flex-1">
                                    <label 
                                        htmlFor={`step-${idx}`}
                                        className={`block mb-2 cursor-pointer ${completedSteps[idx] ? 'text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}
                                    >
                                        <span className="font-bold mr-2">Step {step.order}:</span>
                                        {step.text}
                                    </label>
                                    
                                    {activeStepNote === String(idx) ? (
                                        <div className="mt-2 animate-fadeIn">
                                            <Textarea 
                                                value={noteText}
                                                onChange={(e) => setNoteText(e.target.value)}
                                                placeholder="Add a note to this step..."
                                                className="mb-2"
                                            />
                                            <div className="flex gap-2 justify-end">
                                                <Button size="sm" variant="ghost" onClick={() => setActiveStepNote(null)}>Cancel</Button>
                                                <Button size="sm" onClick={() => handleSaveNote(String(idx))}>Save Note</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="text-xs text-gray-400 hover:text-gray-600"
                                            onClick={() => setActiveStepNote(String(idx))}
                                        >
                                            + Add Note
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

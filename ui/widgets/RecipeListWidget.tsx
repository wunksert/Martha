import "../main.css"

import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider"
import { EmptyMessage } from "@openai/apps-sdk-ui/components/EmptyMessage"
import { Alert } from "@openai/apps-sdk-ui/components/Alert"
import { Heart } from "@openai/apps-sdk-ui/components/Icon"

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Link } from "react-router"

import { RecipeCard, Recipe } from '../components/RecipeCard';
import { RecipeDetail } from '../components/RecipeDetail';
import { 
    useWidgetProps, 
    useWidgetState, 
    useHostAPI, 
    useDisplayMode,
    useToolInput
} from '../hostHooks';

// Define the shape of our widget state
interface RecipeWidgetState {
    favorites: string[]; // List of favorite recipe IDs
    selectedRecipeId: string | null;
}

export const RecipeListWidget: React.FC = () => {
    const props = useWidgetProps<{ recipes: Recipe[] }>();
    const toolInput = useToolInput<{ email?: string }>();
    const hostAPI = useHostAPI();
    const displayMode = useDisplayMode();
    
    const [state, setState] = useWidgetState<RecipeWidgetState>({
        favorites: [],
        selectedRecipeId: null
    });
    
    const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', message: string } | null>(null);

    const recipes = useMemo(() => {
        return Array.isArray(props?.recipes) ? props.recipes : [];
    }, [props]);

    const userEmail = toolInput?.email || 'user@example.com';

    // Auto-dismiss toast
    useEffect(() => {
        if (alertMessage) {
            const timeout = setTimeout(() => {
                setAlertMessage(null);
            }, 3000);
            return () => clearTimeout(timeout);
        }
    }, [alertMessage]);

    const handleToggleFavorite = useCallback(async (recipeId: string, isFavorite: boolean) => {
        if (!hostAPI) return;

        try {
            // Optimistic update
            setState(prev => ({
                ...prev,
                favorites: isFavorite 
                    ? [...prev.favorites, recipeId]
                    : prev.favorites.filter(id => id !== recipeId)
            }));

            await hostAPI.callTool('manage_favorites', {
                email: userEmail,
                recipeId,
                action: isFavorite ? 'add' : 'remove'
            });

            setAlertMessage({ 
                type: 'success', 
                message: isFavorite ? 'Added to favorites' : 'Removed from favorites' 
            });
        } catch (error) {
            console.error('Error toggling favorite:', error);
            // Revert on error
            setState(prev => ({
                ...prev,
                favorites: isFavorite 
                    ? prev.favorites.filter(id => id !== recipeId)
                    : [...prev.favorites, recipeId]
            }));
            setAlertMessage({ type: 'danger', message: 'Failed to update favorite' });
        }
    }, [hostAPI, userEmail, setState]);

    const handleAddNote = useCallback(async (recipeId: string, text: string, stepId?: string) => {
        if (!hostAPI) return;
        try {
            await hostAPI.callTool('add_note', {
                email: userEmail,
                recipeId,
                stepId,
                text
            });
            setAlertMessage({ type: 'success', message: 'Note added successfully' });
        } catch (err) {
            console.error(err);
            setAlertMessage({ type: 'danger', message: 'Failed to add note' });
        }
    }, [hostAPI, userEmail]);

    const handleViewDetails = useCallback((recipe: Recipe) => {
        // If inline, request modal. If fullscreen, maybe just expand/navigate? 
        // For now, let's use modal for details as it's cleaner for recipes.
        if (hostAPI) {
             // We could use requestModal to show details, passing the recipe data.
             // But since we are inside a widget, we can also just render the detail view.
             // Let's toggle state for selection.
             setState({ selectedRecipeId: recipe.id });
        }
    }, [hostAPI, setState]);

    const selectedRecipe = useMemo(() => 
        recipes.find(r => r.id === state.selectedRecipeId), 
    [recipes, state.selectedRecipeId]);

    // If a recipe is selected, show detail view (with back button if needed)
    if (selectedRecipe) {
        return (
            <div className="flex flex-col h-full relative">
                <button 
                    onClick={() => setState({ selectedRecipeId: null })}
                    className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-700 bg-white/80 rounded-full p-2"
                >
                    ✕ Close
                </button>
                <RecipeDetail 
                    recipe={selectedRecipe} 
                    onAddNote={handleAddNote}
                />
            </div>
        );
    }

    // Show empty state
    if (recipes.length === 0) {
        return (
            <EmptyMessage fill="static">
                <EmptyMessage.Icon color="secondary">
                    <Heart className="w-12 h-12" />
                </EmptyMessage.Icon>
                <EmptyMessage.Title color="secondary">
                    No recipes found
                </EmptyMessage.Title>
                <EmptyMessage.Description>
                    Ask ChatGPT to find or create some recipes for you!
                </EmptyMessage.Description>
            </EmptyMessage>
        );
    }

    return (
        <div className="w-full h-full bg-gray-50 dark:bg-gray-900 p-4 overflow-y-auto">
            {/* Toast Notification */}
            {alertMessage && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm animate-in fade-in slide-in-from-top-4">
                    <Alert 
                        color={alertMessage.type} 
                        variant="soft"
                        description={alertMessage.message}
                        className="shadow-lg"
                    />
                </div>
            )}
            
            {/* Grid Layout adaptable to displayMode */}
            <div className={`grid gap-4 ${
                displayMode === 'inline' 
                    ? 'grid-cols-1 sm:grid-cols-2' 
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}>
                {recipes.map((recipe) => (
                    <RecipeCard 
                        key={recipe.id}
                        recipe={recipe}
                        isFavorite={state.favorites.includes(recipe.id)}
                        onToggleFavorite={handleToggleFavorite}
                        onViewDetails={handleViewDetails}
                    />
                ))}
            </div>
        </div>
    );
};

// Auto-initialize
const container = document.getElementById('recipes-root');
if (container) {
    const root = createRoot(container);
    root.render(
        <AppsSDKUIProvider linkComponent={Link}>
            <RecipeListWidget />
        </AppsSDKUIProvider>
    );
}

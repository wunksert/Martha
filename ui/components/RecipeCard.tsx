import React, { useState } from 'react';
import { Badge } from '@openai/apps-sdk-ui/components/Badge';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import { Heart, HeartFilled, Clock } from '@openai/apps-sdk-ui/components/Icon';
import { useHostAPI } from '../hostHooks';

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  ingredients?: any[];
  steps?: any[];
}

interface RecipeCardProps {
  recipe: Recipe;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string, isFavorite: boolean) => Promise<void>;
  onViewDetails?: (recipe: Recipe) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, isFavorite = false, onToggleFavorite, onViewDetails }) => {
  const [loading, setLoading] = useState(false);
  const hostAPI = useHostAPI();

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleFavorite || loading) return;
    
    setLoading(true);
    try {
      await onToggleFavorite(recipe.id, !isFavorite);
    } finally {
      setLoading(false);
    }
  };

  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  return (
    <div 
        className="group relative flex flex-col p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all cursor-pointer"
        onClick={() => onViewDetails?.(recipe)}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
          {recipe.title}
        </h3>
        {onToggleFavorite && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleFavoriteClick}
            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 -mr-2 -mt-2"
          >
            {isFavorite ? <HeartFilled /> : <Heart />}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {totalTime > 0 && (
          <Badge variant="soft" color="secondary" size="sm">
            <Clock className="w-3 h-3 mr-1" />
            {totalTime}m
          </Badge>
        )}
        {recipe.servings && (
            <Badge variant="soft" color="secondary" size="sm">
                {recipe.servings} servings
            </Badge>
        )}
      </div>

      {recipe.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4 flex-grow">
          {recipe.description}
        </p>
      )}

      <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
        <Button block variant="soft" size="sm">
          View Recipe
        </Button>
      </div>
    </div>
  );
};

import "../main.css"

import React, { useState } from 'react';
import { Badge } from '@openai/apps-sdk-ui/components/Badge';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import { Heart, HeartFilled } from '@openai/apps-sdk-ui/components/Icon';

export interface Product {
  id: string;
  title: string;
  shop?: string;
  status?: string;
}

interface ProductCardProps {
  product: Product;
  onAddToWishlist?: (productId: string) => Promise<void>;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToWishlist }) => {
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [addedToWishlist, setAddedToWishlist] = useState(false);

  const getStatusColor = (status?: string): "success" | "danger" | "warning" | "secondary" => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('active') || statusLower === 'published') {
      return 'success';
    }
    if (statusLower.includes('inactive') || statusLower === 'archived') {
      return 'danger';
    }
    if (statusLower.includes('draft')) {
      return 'warning';
    }
    return 'secondary'; // default
  };

  const handleAddToWishlist = async () => {
    if (!onAddToWishlist || isAddingToWishlist || addedToWishlist) return;
    
    setIsAddingToWishlist(true);
    try {
      await onAddToWishlist(product.id);
      setAddedToWishlist(true);
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  return (
    <div className="group relative flex-shrink-0 w-[320px] h-full">
      {/* Card Container with enhanced styling */}
      <div className="relative h-full flex flex-col p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
        
        {/* Status Badge - Floating top right */}
        <div className="absolute top-4 right-4 z-10">
          <Badge 
            color={getStatusColor(product.status)} 
            variant="soft"
            size="sm"
          >
            {product.status || "Unknown"}
          </Badge>
        </div>

        {/* Product Image Placeholder - Visual interest */}
        <div className="w-full h-40 mb-5 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20" />
          <div className="relative text-6xl opacity-20">
            {product.title?.charAt(0) || '?'}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col space-y-3">
          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight">
            {product.title || "Untitled Product"}
          </h3>
          
          {/* Shop Name */}
          {product.shop && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <p className="truncate font-medium">{product.shop}</p>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Product ID */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-500 font-mono tracking-tight">
              {product.id ? product.id.substring(0, 12) : ''}...
            </p>
          </div>
        </div>

        {/* Action Button - Full width at bottom */}
        {onAddToWishlist && (
          <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              color={addedToWishlist ? "success" : "primary"}
              variant={addedToWishlist ? "soft" : "solid"}
              size="md"
              onClick={handleAddToWishlist}
              disabled={isAddingToWishlist || addedToWishlist}
              loading={isAddingToWishlist}
              block
            >
              {addedToWishlist ? (
                <>
                  <HeartFilled className="w-4 h-4" />
                  <span className="ml-2 font-semibold">Added to Wishlist</span>
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4" />
                  <span className="ml-2 font-semibold">Add to Wishlist</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};




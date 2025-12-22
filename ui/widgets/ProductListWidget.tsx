/**
 * /widgets is analagous to pages, except in chatGPT lingo
 */

import "../main.css"

import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider"
import { EmptyMessage } from "@openai/apps-sdk-ui/components/EmptyMessage"
import { Alert } from "@openai/apps-sdk-ui/components/Alert"
import { Heart } from "@openai/apps-sdk-ui/components/Icon"

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ProductCard, Product } from '../components/ProductCard';
import { useToolOutput, useToolInput, useTheme } from '../hooks';

import { Link } from "react-router"

export const ProductsList: React.FC = () => {
    const toolOutput = useToolOutput();
    const toolInput = useToolInput();
    const theme = useTheme();
    const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', message: string } | null>(null);

    // Extract user email from toolInput or use fallback for dev
    const userEmail = useMemo(() => {
        return (toolInput as any)?.email || 'user@example.com';
    }, [toolInput]);

    const products = useMemo(() => {
        try {
            const outputProducts = (toolOutput as { products?: Product[] })?.products;
            return Array.isArray(outputProducts) ? [...outputProducts] : [];
        } catch (err) {
            console.warn("Failed to read products from toolOutput:", err);
            return [];
        }
    }, [toolOutput]);

    // Auto-dismiss toast
    useEffect(() => {
        if (alertMessage) {
            const timeout = setTimeout(() => {
                setAlertMessage(null);
            }, alertMessage.type === 'success' ? 3000 : 5000);
            return () => clearTimeout(timeout);
        }
    }, [alertMessage]);

    const handleAddToWishlist = useCallback(async (productId: string) => {
        if (!window.openai?.callTool) {
            console.error('window.openai.callTool is not available');
            setAlertMessage({ type: 'danger', message: 'Unable to add to wishlist. Please try again.' });
            return;
        }

        try {
            const response = await window.openai.callTool('add_product_to_wishlist', {
                email: userEmail,
                productId: productId
            });

            if (response.isError) {
                throw new Error('Failed to add product to wishlist');
            }

            setAlertMessage({ type: 'success', message: 'Product added to wishlist!' });
        } catch (error) {
            console.error('Error adding to wishlist:', error);
            setAlertMessage({ type: 'danger', message: 'Failed to add to wishlist. Please try again.' });
            throw error; // Re-throw so ProductCard can handle its own state
        }
    }, [userEmail]);

    // Show empty state
    if (products.length === 0) {
        return (
            <EmptyMessage fill="static">
                <EmptyMessage.Icon color="secondary">
                    <Heart className="w-12 h-12" />
                </EmptyMessage.Icon>
                <EmptyMessage.Title color="secondary">
                    No products found
                </EmptyMessage.Title>
                <EmptyMessage.Description>
                    There are no products available at the moment. Check back later!
                </EmptyMessage.Description>
            </EmptyMessage>
        );
    }

    return (
        <div className="w-full">
            {/* Toast Notification */}
            {alertMessage && (
                <div className="fixed top-4 right-4 z-50 max-w-sm w-full sm:max-w-md animate-[slideIn_0.3s_ease-out_forwards]">
                    <Alert 
                        color={alertMessage.type} 
                        variant="soft"
                        description={alertMessage.message}
                        className="shadow-lg"
                    />
                </div>
            )}
            
            {/* Horizontal Carousel Container */}
            <div className={`relative ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-400'}`}>
            
                
                {/* Scrollable Cards Container - All Tailwind! */}
                <div className="overflow-x-auto overflow-y-hidden pb-4 px-4 sm:px-6 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth [-webkit-overflow-scrolling:touch]">
                    <div className="flex gap-6 h-[480px] py-2">
                        {products.map((product, index) => (
                            <div 
                                key={product.id}
                                className="snap-start animate-[slideIn_0.3s_ease-out_forwards]"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <ProductCard 
                                    product={product}
                                    onAddToWishlist={handleAddToWishlist}
                                />
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Scroll Indicator - Desktop only */}
                <div className={`hidden sm:flex items-center justify-center mt-4 gap-2 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${theme === 'dark' ? 'bg-gray-500' : 'bg-gray-400'}`} />
                        <span>Scroll to explore</span>
                        <div className="w-4 h-4 flex items-center justify-center">→</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Auto-initialize when this module is loaded
const container = document.getElementById('products-grid');
if (container) {
    const root = createRoot(container);
    root.render(
        // defines our default router link comopnent, used in textLink and buttonLink
        <AppsSDKUIProvider linkComponent={Link}>
            <ProductsList />
        </AppsSDKUIProvider>
        
    );
} else {
    console.error("Products grid element not found");
}




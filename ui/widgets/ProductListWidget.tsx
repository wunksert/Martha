/**
 * /widgets is analagous to pages, except in chatGPT lingo
 */
import React, { useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { ProductCard, Product } from '../components/ProductCard';
import { useToolOutput } from '../hooks';

export const ProductsList: React.FC = () => {
  const toolOutput = useToolOutput();
  
  const products = useMemo(() => {
    try {
      const outputProducts = (toolOutput as { products?: Product[] })?.products;
      return Array.isArray(outputProducts) ? [...outputProducts] : [];
    } catch (err) {
      console.warn("Failed to read products from toolOutput:", err);
      return [];
    }
  }, [toolOutput]);


  if (products.length === 0) {
    return (
      <div className="empty-state">No products found.</div>
    );
  }

  return (
    <>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </>
  );
};

// Auto-initialize when this module is loaded
const container = document.getElementById('products-grid');
if (container) {
  const root = createRoot(container);
  root.render(<ProductsList />);
} else {
  console.error("Products grid element not found");
}




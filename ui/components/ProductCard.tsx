import React from 'react';

export interface Product {
  id: string;
  title: string;
  shop?: string;
  status?: string;
}

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const getStatusClass = (status?: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('active') || statusLower === 'published') {
      return 'active';
    }
    if (statusLower.includes('inactive') || statusLower === 'archived') {
      return 'inactive';
    }
    if (statusLower.includes('draft')) {
      return 'draft';
    }
    return 'active'; // default
  };

  return (
    <div className="product-card">
      <h3 className="product-title">{product.title || "Untitled Product"}</h3>
      {product.shop && <p className="product-shop">{product.shop}</p>}
      <span className={`product-status ${getStatusClass(product.status)}`}>
        {product.status || "Unknown"}
      </span>
      <div className="product-id">
        ID: {product.id ? product.id.substring(0, 8) : ''}...
      </div>
    </div>
  );
};




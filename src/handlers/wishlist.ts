import prisma from '../prisma.js';
import { logToolCall } from '../lib/helpers.js';
import { getUser } from '../lib/models.js';

export async function addToWishlistHandler(input: {
    email: string;
    productId: string;
}) {
    const startTime = Date.now();
    try {
        const userId = await getUser(input.email);
        
        // Fetch product from database
        const product = await prisma.product.findUnique({
            where: { id: input.productId }
        });

        if (!product) {
            throw new Error(`Product with ID ${input.productId} not found. Product must exist in the database before adding to wishlist.`);
        }

        // Check if wishlist item already exists
        const existingWishlistItem = await prisma.wishlistItem.findUnique({
            where: {
                userId_productId: {
                    userId,
                    productId: product.id
                }
            }
        });

        if (existingWishlistItem) {
            const output = {
                id: product.id,
                shopifyId: product.shopifyId,
                title: product.title,
                note: existingWishlistItem.note,
                createdAt: existingWishlistItem.createdAt.toISOString()
            };
            logToolCall('add_product_to_wishlist', input, startTime, true);
            return {
                content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
                structuredContent: output
            };
        }

        // Create wishlist item
        const wishlistItem = await prisma.wishlistItem.create({
            data: {
                userId,
                productId: product.id
            }
        });
        
        const output = {
            id: product.id,
            shopifyId: product.shopifyId,
            title: product.title,
            note: wishlistItem.note,
            createdAt: wishlistItem.createdAt.toISOString()
        };
        logToolCall('add_product_to_wishlist', input, startTime, true);
        return {
            content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
            structuredContent: output
        };
    } catch (error) {
        logToolCall('add_product_to_wishlist', input, startTime, false, error as Error);
        throw error;
    }
}

export async function removeFromWishlistHandler(input: { 
    email: string; 
    productId?: string; 
    shopifyId?: string 
}) {
    const startTime = Date.now();
    try {
        if (!input.productId && !input.shopifyId) {
            throw new Error('Either productId or shopifyId must be provided');
        }

        const userId = await getUser(input.email);
        
        // Find product first
        let product;
        if (input.productId) {
            product = await prisma.product.findUnique({
                where: { id: input.productId }
            });
        } else {
            product = await prisma.product.findUnique({
                where: { shopifyId: input.shopifyId }
            });
        }
        
        if (!product) {
            throw new Error('Product not found');
        }

        // Find and delete wishlist item
        const wishlistItem = await prisma.wishlistItem.findUnique({
            where: {
                userId_productId: {
                    userId,
                    productId: product.id
                }
            }
        });
        
        if (!wishlistItem) {
            throw new Error('Product not found in wishlist');
        }

        await prisma.wishlistItem.delete({
            where: { id: wishlistItem.id }
        });

        const output = {
            success: true,
            message: `Product "${product.title}" removed from wishlist`
        };
        logToolCall('remove_product_from_wishlist', input, startTime, true);
        return {
            content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
            structuredContent: output
        };
    } catch (error) {
        logToolCall('remove_product_from_wishlist', input, startTime, false, error as Error);
        throw error;
    }
}

export async function addNoteHandler(input: { 
    email: string; 
    productId?: string; 
    shopifyId?: string; 
    note: string 
}) {
    const startTime = Date.now();
    try {
        if (!input.productId && !input.shopifyId) {
            throw new Error('Either productId or shopifyId must be provided');
        }

        const userId = await getUser(input.email);
        
        // Find product first
        let product;
        if (input.productId) {
            product = await prisma.product.findUnique({
                where: { id: input.productId }
            });
        } else {
            product = await prisma.product.findUnique({
                where: { shopifyId: input.shopifyId }
            });
        }
        
        if (!product) {
            throw new Error('Product not found');
        }

        // Find wishlist item
        const wishlistItem = await prisma.wishlistItem.findUnique({
            where: {
                userId_productId: {
                    userId,
                    productId: product.id
                }
            }
        });
        
        if (!wishlistItem) {
            throw new Error('Product not found in wishlist');
        }

        // Update wishlist item note
        const updatedWishlistItem = await prisma.wishlistItem.update({
            where: { id: wishlistItem.id },
            data: { note: input.note }
        });

        const output = {
            id: product.id,
            shopifyId: product.shopifyId,
            title: product.title,
            note: updatedWishlistItem.note,
            updatedAt: updatedWishlistItem.updatedAt.toISOString()
        };
        logToolCall('add_note', input, startTime, true);
        return {
            content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
            structuredContent: output
        };
    } catch (error) {
        logToolCall('add_note', input, startTime, false, error as Error);
        throw error;
    }
}

export async function viewWishlistHandler(input: { email: string }) {
    const startTime = Date.now();
    try {
        const userId = await getUser(input.email);
        
        const wishlistItems = await prisma.wishlistItem.findMany({
            where: { userId },
            include: { product: true },
            orderBy: { createdAt: 'desc' }
        });

        const output = {
            products: wishlistItems.map((item: any) => ({
                id: item.product.id,
                shopifyId: item.product.shopifyId,
                title: item.product.title,
                shop: item.product.shop,
                status: item.product.status,
                note: item.note,
                createdAt: item.createdAt.toISOString()
            }))
        };
        logToolCall('view_wishlist', input, startTime, true);
        return {
            content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
            structuredContent: output
        };
    } catch (error) {
        logToolCall('view_wishlist', input, startTime, false, error as Error);
        throw error;
    }
}

export async function searchProductsHandler(input: { email: string; query: string }) {
    const startTime = Date.now();
    try {
        const userId = await getUser(input.email);
        
        const wishlistItems = await prisma.wishlistItem.findMany({
            where: {
                userId,
                OR: [
                    { product: { title: { contains: input.query } } },
                    { product: { description: { contains: input.query } } },
                    { note: { contains: input.query } }
                ]
            },
            include: { product: true },
            orderBy: { createdAt: 'desc' }
        });

        const output = {
            products: wishlistItems.map((item: any) => ({
                id: item.product.id,
                shopifyId: item.product.shopifyId,
                title: item.product.title,
                shop: item.product.shop,
                status: item.product.status,
                description: item.product.description,
                note: item.note,
                createdAt: item.createdAt.toISOString()
            }))
        };
        logToolCall('search_products', input, startTime, true);
        return {
            content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
            structuredContent: output
        };
    } catch (error) {
        logToolCall('search_products', input, startTime, false, error as Error);
        throw error;
    }
}


import prisma from '../prisma.js';
import { logToolCall } from '../lib/helpers.js';

export async function listProductsHandler(_input: Record<string, never>) {
    const startTime = Date.now();
    try {
        const products = await prisma.product.findMany({
            orderBy: { createdAt: 'desc' }
        });
        
        const output = {
            products: products.map((p: any) => ({
                id: p.id,
                shopifyId: p.shopifyId,
                title: p.title,
                shop: p.shop,
                status: p.status
            }))
        };
        logToolCall('list_products', {}, startTime, true);
        return {
            content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
            structuredContent: output
        };
    } catch (error) {
        logToolCall('list_products', {}, startTime, false, error as Error);
        throw error;
    }
}

export async function getProductHandler(input: { id?: string; shopifyId?: string }) {
    const startTime = Date.now();
    try {
        if (!input.id && !input.shopifyId) {
            throw new Error('Either id or shopifyId must be provided');
        }

        const where: any = input.id ? { id: input.id } : { shopifyId: input.shopifyId };
        const product = await prisma.product.findUnique({
            where
        });

        if (!product) {
            throw new Error('Product not found');
        }

        const output = {
            product: {
                id: product.id,
                shopifyId: product.shopifyId,
                title: product.title,
                shop: product.shop,
                status: product.status,
                description: product.description,
                createdAt: product.createdAt.toISOString()
            }
        };
        logToolCall('get_product', input, startTime, true);
        return {
            content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
            structuredContent: output
        };
    } catch (error) {
        logToolCall('get_product', input, startTime, false, error as Error);
        throw error;
    }
}


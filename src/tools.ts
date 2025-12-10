import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v3';
import { listProductsHandler, getProductHandler } from './handlers/product.js';
import { addTodoHandler, deleteAllTodos } from "./handlers/todo.js";
import { 
    addToWishlistHandler, 
    removeFromWishlistHandler, 
    addNoteHandler, 
    viewWishlistHandler, 
    searchProductsHandler 
} from './handlers/wishlist.js';

export function registerTools(server: McpServer): void {

    server.registerTool(
        "add_todo",
        {
            title: "Add Todo",
            description: "Creates a todo item with the given title",
            inputSchema: z.object({ title: z.string().min(1) }) as any,
            _meta: {
                "openai/outputTemplate": "wgt://widget/todo.html",
                "openai/toolInvocation/invoking": "Adding todo",
                "openai/toolInvocation/invoked": "Added todo"
            }
        },
        addTodoHandler as any
    );

    server.registerTool(
        "delete_all_todos",
        {
            title: "Delete all Todos",
            description: "Deletes all the to-do items from the user's to-do list",
            _meta: {
                // "openai/visibility": "private", //hide this disasterously destructive action from the LLM
            },
            annotations: {
                destructiveHint: true
            }
        },
        deleteAllTodos as any
    )

    // Tool: List Products
    server.registerTool(
        'list_products',
        {
            title: 'List Products',
            description: 'List all the available products from the brand. These are products that the user can add to their wishlist, but are not necessariliy already on their wishlist.',
            outputSchema: z.object({
                products: z.array(z.object({
                    id: z.string(),
                    shopifyId: z.string(),
                    title: z.string(),
                    shop: z.string(),
                    status: z.string()
                }))
            }) as any,
            _meta: {
                'openai/outputTemplate': 'ui://widget/products-list.html',
                'openai/toolInvocation/invoking': 'Loading products',
                'openai/toolInvocation/invoked': 'Products loaded',
            },
            annotations: {
                readOnlyHint: true
            }
        },
        listProductsHandler as any
    );

    // Tool: Read Product
    server.registerTool(
        'read_product',
        {
            title: 'Read Product',
            description: "Request detailed information on a specific product.",
            inputSchema: {
                id: z.string().optional(),
                shopifyId: z.string().optional()
            } as any,
            outputSchema: z.object({
                product: z.object({
                    id: z.string(),
                    shopifyId: z.string(),
                    title: z.string(),
                    shop: z.string(),
                    status: z.string(),
                    description: z.string().nullable(),
                    createdAt: z.string()
                })
            }) as any
        },
        getProductHandler as any
    );

    // Tool: Add Product to Wishlist
    server.registerTool(
        'add_product_to_wishlist',
        {
            title: 'Add Product to Wishlist',
            description: 'Add a product to a user\'s wishlist by product ID. Creates user if they don\'t exist. Product must already exist in the database.',
            inputSchema: {
                email: z.string(),
                productId: z.string()
            } as any,
            outputSchema: z.object({ 
                id: z.string(), 
                shopifyId: z.string(), 
                title: z.string(), 
                note: z.string().nullable(),
                createdAt: z.string() 
            }) as any
        },
        addToWishlistHandler as any
    );

    // Tool: Remove Product from Wishlist
    server.registerTool(
        'remove_product_from_wishlist',
        {
            title: 'Remove Product from Wishlist',
            description: 'Remove a product from a user\'s wishlist. Creates user if they don\'t exist.',
            inputSchema: {
                email: z.string(),
                productId: z.string().optional(),
                shopifyId: z.string().optional()
            } as any,
            outputSchema: z.object({ 
                success: z.boolean(),
                message: z.string()
            }) as any
        },
        removeFromWishlistHandler as any
    );

    // Tool: Add Note
    server.registerTool(
        'add_note',
        {
            title: 'Add Note',
            description: 'Add or update a note for a product in the wishlist. Creates user if they don\'t exist.',
            inputSchema: {
                email: z.string(),
                productId: z.string().optional(),
                shopifyId: z.string().optional(),
                note: z.string()
            } as any,
            outputSchema: z.object({ 
                id: z.string(),
                shopifyId: z.string(),
                title: z.string(),
                note: z.string().nullable(),
                updatedAt: z.string()
            }) as any
        },
        addNoteHandler as any
    );

    // Tool: View List
    server.registerTool(
        'view_wishlist',
        {
            title: 'View List',
            description: 'View all products in a user\'s wishlist. Creates user if they don\'t exist.',
            inputSchema: {
                email: z.string()
            } as any,
            outputSchema: z.object({
                products: z.array(z.object({
                    id: z.string(),
                    shopifyId: z.string(),
                    title: z.string(),
                    shop: z.string(),
                    status: z.string(),
                    note: z.string().nullable(),
                    createdAt: z.string()
                }))
            }) as any,
            _meta: {
                'openai/outputTemplate': 'ui://widget/wishlist.html',
                'openai/toolInvocation/invoking': 'Loading wishlist',
                'openai/toolInvocation/invoked': 'Wishlist loaded',
            },
            annotations: {
                readOnlyHint: true
            }
        },
        viewWishlistHandler as any
    );

    // Tool: Search Products
    server.registerTool(
        'search_products',
        {
            title: 'Search Products',
            description: 'Search products in a user\'s wishlist by title, description, or note. Creates user if they don\'t exist.',
            inputSchema: {
                email: z.string(),
                query: z.string()
            } as any,
            outputSchema: z.object({
                products: z.array(z.object({
                    id: z.string(),
                    shopifyId: z.string(),
                    title: z.string(),
                    shop: z.string(),
                    status: z.string(),
                    description: z.string().nullable(),
                    note: z.string().nullable(),
                    createdAt: z.string()
                }))
            }) as any
        },
        searchProductsHandler as any
    );
}


import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import prisma from './prisma.js';
import { readHtmlFile } from './lib/helpers.js';

/**
 * Resources are good for when your client application behaves like a browser (if at all)
 * They can allow the user to interact with your resources. The difference from tools is
 * the model calls the tools. 
 * 
 * TBD on whether or not using resources for a checkout link is a good idea
 * 
 */
export function registerResources(server: McpServer): void {

    const todosHtml = readHtmlFile("todo-widget.html");
    //register todos widget
    server.registerResource(
        "todo-widget",
        "wgt://widget/todo.html",
        {},
        async () => ({
            contents: [
                {
                    uri: "wgt://widget/todo.html",
                    mimeType: "text/html+skybridge",
                    text: todosHtml,
                    _meta: { "openai/widgetPrefersBorder": true }
                }
            ]
        })
    )

    // Register wishlist UI widget
    try {
        const wishlistHtml = readHtmlFile('wishlist.html');
        
        //Wishlist template
        server.registerResource(
            'wishlist-widget',
            'ui://widget/wishlist.html',
            {},
            async () => ({
                contents: [
                    {
                        uri: 'ui://widget/wishlist.html',
                        mimeType: 'text/html+skybridge',
                        text: wishlistHtml,
                        _meta: { 'openai/widgetPrefersBorder': true },
                    },
                ],
            })
        );
    } catch (error) {
        console.warn('Could not load wishlist.html. Make sure to run "npm run build:ui" first:', error);
    }

    // Register products UI widget
    try {
        const productsHtml = readHtmlFile('products-list.html');
        
        // Products template
        server.registerResource(
            'products-widget',
            'ui://widget/products-list.html',
            {},
            async () => ({
                contents: [
                    {
                        uri: 'ui://widget/products-list.html',
                        mimeType: 'text/html+skybridge',
                        text: productsHtml,
                        _meta: { 
                            'openai/widgetPrefersBorder': true,
                            'openai/widgetCSP': {
                                "connect_domains": ["https://*.tunnel.shopifycloud.tech"],
                                "resource_domains": ["https://*.tunnel.shopifycloud.tech"]
                            }
                        },
                    },
                ],
            })
        );
    } catch (error) {
        console.warn('Could not load products.html. Make sure to run "npm run build:ui" first:', error);
    }

    server.registerResource(
        'checkout',
        new ResourceTemplate('checkout://{query_string}', { list: undefined}),
        {
            title: "Checkout Link",
            description: "Provide the user a URL where they can complete Checkout. The URL provides a chance for the user to review their products, accepts payment and shipping info, and finally completes the user's order."
        },
        async (uri, variables: any) => {
            const shopDomain = "https://riley-sandbox-112024.myshopify.com/"
            return {
                contents: [{
                    uri: uri.href,
                    text: "This URL will take you to Checkout to complete your purchase."
                }]
            }
        }
    )

    // Resource: Product
    server.registerResource(
        'product',
        new ResourceTemplate('product://{id}', { list: undefined }),
        {
            title: 'Product Resource',
            description: 'Access product data by ID'
        },
        async (uri, variables: any) => {
            const product = await prisma.product.findUnique({
                where: { id: variables.id }
            });

            if (!product) {
                throw new Error(`Product ${variables.id} not found`);
            }

            return {
                contents: [
                    {
                        uri: uri.href,
                        text: JSON.stringify({
                            id: product.id,
                            shopifyId: product.shopifyId,
                            shop: product.shop,
                            title: product.title,
                            handle: product.handle,
                            status: product.status,
                            description: product.description,
                            descriptionHtml: product.descriptionHtml,
                            compareAtPriceMin: product.compareAtPriceMin,
                            compareAtPriceMax: product.compareAtPriceMax,
                            compareAtPriceCurrencyCode: product.compareAtPriceCurrencyCode,
                            media: product.media,
                            createdAt: product.createdAt.toISOString(),
                            updatedAt: product.updatedAt.toISOString()
                        }, null, 2)
                    }
                ]
            };
        }
    );
}


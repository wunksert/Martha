import prisma from '../prisma.js';
import { logToolCall } from '../lib/helpers.js';

export async function saveRecipeHandler(input: { 
    title: string;
    description?: string;
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    sourceUrl?: string;
    ingredients: { name: string; quantity?: number; unit?: string }[];
    steps: { order: number; text: string }[];
}) {
    const startTime = Date.now();
    try {
        const recipe = await prisma.recipe.create({
            data: {
                title: input.title,
                description: input.description,
                prepTime: input.prepTime,
                cookTime: input.cookTime,
                servings: input.servings,
                sourceUrl: input.sourceUrl,
                ingredients: {
                    create: input.ingredients.map(i => ({
                        name: i.name,
                        quantity: i.quantity,
                        unit: i.unit
                    }))
                },
                steps: {
                    create: input.steps.map(s => ({
                        order: s.order,
                        text: s.text
                    }))
                }
            },
            include: {
                ingredients: true,
                steps: true
            }
        });

        const output = { recipe };
        logToolCall('save_recipe', input, startTime, true);
        return {
            content: [{ type: 'text' as const, text: `Recipe saved: ${recipe.title}` }],
            structuredContent: output
        };
    } catch (error) {
        logToolCall('save_recipe', input, startTime, false, error as Error);
        throw error;
    }
}

export async function listRecipesHandler(_input: Record<string, never>) {
    const startTime = Date.now();
    try {
        const recipes = await prisma.recipe.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                ingredients: true,
                steps: true
            }
        });
        
        const output = { recipes };
        logToolCall('list_recipes', {}, startTime, true);
        return {
            content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
            structuredContent: output
        };
    } catch (error) {
        logToolCall('list_recipes', {}, startTime, false, error as Error);
        throw error;
    }
}

export async function searchRecipesHandler(input: { query: string }) {
    const startTime = Date.now();
    try {
        const recipes = await prisma.recipe.findMany({
            where: {
                OR: [
                    { title: { contains: input.query } },
                    { description: { contains: input.query } },
                    { ingredients: { some: { name: { contains: input.query } } } }
                ]
            },
            include: {
                ingredients: true
            }
        });
        
        const output = { recipes };
        logToolCall('search_recipes', input, startTime, true);
        return {
            content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
            structuredContent: output
        };
    } catch (error) {
        logToolCall('search_recipes', input, startTime, false, error as Error);
        throw error;
    }
}

export async function getRecipeHandler(input: { id: string }) {
    const startTime = Date.now();
    try {
        const recipe = await prisma.recipe.findUnique({
            where: { id: input.id },
            include: {
                ingredients: true,
                steps: {
                    orderBy: { order: 'asc' }
                }
            }
        });

        if (!recipe) {
            throw new Error('Recipe not found');
        }

        const output = { recipe };
        logToolCall('get_recipe', input, startTime, true);
        return {
            content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
            structuredContent: output
        };
    } catch (error) {
        logToolCall('get_recipe', input, startTime, false, error as Error);
        throw error;
    }
}

export async function getUploadGuidanceHandler(_input: Record<string, never>) {
    return {
        content: [{ 
            type: 'text' as const, 
            text: `You can upload recipes in several ways:
1. **Text**: Paste the full recipe text.
2. **URL**: Provide a link to a recipe website.
3. **Image**: Upload a photo of a recipe from a book or card.

I will attempt to parse the ingredients and instructions automatically.` 
        }]
    };
}

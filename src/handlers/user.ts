import prisma from '../prisma.js';
import { logToolCall } from '../lib/helpers.js';

async function getOrCreateUser(email: string) {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        user = await prisma.user.create({ data: { email } });
    }
    return user;
}

export async function updatePreferencesHandler(input: { 
    email: string;
    likes?: string[];
    dislikes?: string[];
}) {
    const startTime = Date.now();
    try {
        const user = await getOrCreateUser(input.email);
        
        // Parse current prefs if needed, but since we store as stringified JSON for SQLite simplicity in this POC
        // Actually prisma supports JSON types but SQLite support is limited or string-based.
        // My schema defined them as String with default "[]".
        
        const updateData: any = {};
        if (input.likes) updateData.likes = JSON.stringify(input.likes);
        if (input.dislikes) updateData.dislikes = JSON.stringify(input.dislikes);

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: updateData
        });

        const output = { 
            likes: JSON.parse(updatedUser.likes),
            dislikes: JSON.parse(updatedUser.dislikes)
        };
        
        logToolCall('update_preferences', input, startTime, true);
        return {
            content: [{ type: 'text' as const, text: JSON.stringify(output) }],
            structuredContent: output
        };
    } catch (error) {
        logToolCall('update_preferences', input, startTime, false, error as Error);
        throw error;
    }
}

export async function manageFavoritesHandler(input: { 
    email: string;
    recipeId: string;
    action: 'add' | 'remove';
}) {
    const startTime = Date.now();
    try {
        const user = await getOrCreateUser(input.email);
        
        if (input.action === 'add') {
            await prisma.favorite.create({
                data: {
                    userId: user.id,
                    recipeId: input.recipeId
                }
            });
        } else {
            await prisma.favorite.deleteMany({
                where: {
                    userId: user.id,
                    recipeId: input.recipeId
                }
            });
        }

        logToolCall('manage_favorites', input, startTime, true);
        return {
            content: [{ type: 'text' as const, text: `Successfully ${input.action}ed favorite` }],
            structuredContent: { success: true }
        };
    } catch (error) {
        logToolCall('manage_favorites', input, startTime, false, error as Error);
        throw error;
    }
}

export async function addNoteHandler(input: {
    email: string;
    recipeId: string;
    stepId?: string;
    text: string;
}) {
    const startTime = Date.now();
    try {
        const user = await getOrCreateUser(input.email);
        
        if (input.stepId) {
            await prisma.stepNote.create({
                data: {
                    userId: user.id,
                    stepId: input.stepId,
                    text: input.text
                }
            });
        } else {
            await prisma.recipeNote.create({
                data: {
                    userId: user.id,
                    recipeId: input.recipeId,
                    text: input.text
                }
            });
        }

        logToolCall('add_note', input, startTime, true);
        return {
            content: [{ type: 'text' as const, text: 'Note added' }],
            structuredContent: { success: true }
        };
    } catch (error) {
        logToolCall('add_note', input, startTime, false, error as Error);
        throw error;
    }
}

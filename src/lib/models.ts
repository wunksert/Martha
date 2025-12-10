import prisma from '../prisma.js';

/**
 * Get user by email, creating if they don't exist
 * @param email User email address
 * @returns User ID
 */
export async function getUser(email: string): Promise<string> {
    let user = await prisma.user.findUnique({
        where: { email }
    });
    
    if (!user) {
        user = await prisma.user.create({
            data: { email }
        });
    }
    
    return user.id;
}


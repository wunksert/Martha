import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v3';
import { 
    saveRecipeHandler, 
    listRecipesHandler, 
    searchRecipesHandler, 
    getRecipeHandler, 
    getUploadGuidanceHandler 
} from './handlers/recipe.js';
import { 
    updatePreferencesHandler, 
    manageFavoritesHandler, 
    addNoteHandler 
} from './handlers/user.js';
import { addTodoHandler, deleteAllTodos } from "./handlers/todo.js";

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
                // "openai/visibility": "private", 
            },
            annotations: {
                destructiveHint: true
            }
        },
        deleteAllTodos as any
    )

    // --- Recipe Tools ---

    server.registerTool(
        "save_recipe",
        {
            title: "Save Recipe",
            description: "Save a new recipe with structured ingredients and steps.",
            inputSchema: z.object({
                title: z.string(),
                description: z.string().optional(),
                prepTime: z.number().optional(),
                cookTime: z.number().optional(),
                servings: z.number().optional(),
                sourceUrl: z.string().optional(),
                ingredients: z.array(z.object({
                    name: z.string(),
                    quantity: z.number().optional(),
                    unit: z.string().optional()
                })),
                steps: z.array(z.object({
                    order: z.number(),
                    text: z.string()
                }))
            }) as any
        },
        saveRecipeHandler as any
    );

    server.registerTool(
        "list_recipes",
        {
            title: "List Recipes",
            description: "List all available recipes.",
            _meta: {
                'openai/outputTemplate': 'ui://widget/recipes-list.html',
                'openai/toolInvocation/invoking': 'Loading recipes',
                'openai/toolInvocation/invoked': 'Recipes loaded',
            },
            annotations: {
                readOnlyHint: true
            }
        },
        listRecipesHandler as any
    );

    server.registerTool(
        "search_recipes",
        {
            title: "Search Recipes",
            description: "Search recipes by title, description, or ingredients.",
            inputSchema: z.object({
                query: z.string()
            }) as any,
            outputSchema: z.object({
                recipes: z.array(z.object({
                    id: z.string(),
                    title: z.string(),
                    description: z.string().optional()
                }))
            }) as any
        },
        searchRecipesHandler as any
    );

    server.registerTool(
        "get_recipe",
        {
            title: "Get Recipe",
            description: "Get full details of a specific recipe.",
            inputSchema: z.object({
                id: z.string()
            }) as any
        },
        getRecipeHandler as any
    );

    server.registerTool(
        "get_upload_guidance",
        {
            title: "Get Upload Guidance",
            description: "Get instructions on how to upload recipes.",
            annotations: {
                readOnlyHint: true
            }
        },
        getUploadGuidanceHandler as any
    );

    // --- User Tools ---

    server.registerTool(
        "update_preferences",
        {
            title: "Update Preferences",
            description: "Update user food likes and dislikes.",
            inputSchema: z.object({
                email: z.string(),
                likes: z.array(z.string()).optional(),
                dislikes: z.array(z.string()).optional()
            }) as any
        },
        updatePreferencesHandler as any
    );

    server.registerTool(
        "manage_favorites",
        {
            title: "Manage Favorites",
            description: "Add or remove a recipe from favorites.",
            inputSchema: z.object({
                email: z.string(),
                recipeId: z.string(),
                action: z.enum(['add', 'remove'])
            }) as any
        },
        manageFavoritesHandler as any
    );

    server.registerTool(
        "add_note",
        {
            title: "Add Note",
            description: "Add a note to a recipe or a specific step.",
            inputSchema: z.object({
                email: z.string(),
                recipeId: z.string(),
                stepId: z.string().optional(),
                text: z.string()
            }) as any
        },
        addNoteHandler as any
    );
}

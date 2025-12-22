# Architecture

## Table of Contents

- [Overview](#overview)
- [Interesting demos](#interesting-demos)
- [Gotchas](#gotchas)
- [Best Practices](#best-practices)
- [Opportunities](#opportunities)
- [Local UI Development](#local-ui-development)
  - [How It Works](#how-it-works)
  - [File Structure](#file-structure)
  - [Usage](#usage)
  - [Creating a New Dev Page](#creating-a-new-dev-page)
  - [What Gets Stubbed](#what-gets-stubbed)
- [Building](#building)
  - [Vite vs esBuild](#vite-vs-esbuild)
- [Technology Stack](#technology-stack)
- [Architecture Layers](#architecture-layers)
  - [HTTP Transport Layer](#1-http-transport-layer-srcserverts)
  - [MCP Server Layer](#2-mcp-server-layer-srcserverts)
  - [Tools & Resources Layer](#3-tools--resources-layer-srctoolsts)
  - [Data Access Layer](#4-data-access-layer-srcprismats)
- [Managing State](#managing-state)
  - [High level data flow](#high-level-data-flow)
  - [Types of state and how to use it](#types-of-state-and-how-to-use-it)
- [Data Model](#data-model)
  - [User](#user)
  - [Product](#product)
  - [WishlistItem](#wishlistitem)
- [MCP Tools](#mcp-tools)
- [MCP Resources](#mcp-resources)
- [ChatGPT-Specific Features](#chatgpt-specific-features)
  - [Tool Metadata (`_meta` fields)](#tool-metadata-_meta-fields)
  - [Structured Content in Tool Responses](#structured-content-in-tool-responses)
  - [UI Resources](#ui-resources)
  - [Client-Side APIs (`window.openai`)](#client-side-apis-windowopenai)
  - [Example: Complete Integration Flow](#example-complete-integration-flow)
- [Key Design Patterns](#key-design-patterns)
- [Project Structure](#project-structure)
- [Database](#database)
- [Development Workflow](#development-workflow)

## Overview

This project is a **Model Context Protocol (MCP) server** that provides wishlist management functionality. It exposes tools and resources for managing products and user wishlists through the MCP protocol over HTTP.

## Interesting demo ideas
1. A partner exposes their app inside chatGPT so merchant and merchant staff can interact with it
2. A merchant creates a custom Shopify app and creates a suite of tools for managing their store via chatGPT (discount products, etc)
2.a A merchant creates a 
3. A merchant creates a brand app for customers

## Gotchas
1. doublel check React.StrictMode. some with some without.
2. full urls for JS assets (since relative goes to OAI domains)
4. CORS on the server:
```
app.use(cors({
    origin: "*", //allow all origins
    credentials: false 
}))
```

## Opportunities
- HMR for sure - one instance of the app is live at a time, and it basically just does AJAX via tools. Even if I send a new message (both same and new chat) the HTML isn't updated. I guess it's because the resource needs to get reregistered? i.e. server restarted. 
    - server.server.sendResourceUpdated({uri: "ui://widget/todo.html"}) is how the server can push an update but the client needs to respect it (don't think GPT does yet)
    - GPT aggressively caches ui:// resources, so you need to manually refresh. I tried to change the scheme to wgt:// and teh cache was just as aggressive so it must be resource-wide

- window.openai.sendFollowupMessage sends another prompt to the LLM as if it were the user. It seems to execute the tool call again though? idk why.
- display mode: "pip", inline, and fullscreen refer to the display mode (how the widget is being shown). These are two different categories.

- fullscreen mode: Just to clarify: mobile, desktop, tablet, and unknown refer to the device type (what kind of device the user is on)
- Use the Apps SDK for consistent styling: https://openai.github.io/apps-sdk-ui/?path=/docs/overview-introduction--docs
- Built-in MCP inspector with better tooling (UI rendering etc)
- How can we use our own framework for the web component? Confirmed react CAN be used, just needs to be built into html so the template can access the HTML (typically from dist)
- Fully leverage window.openai API:  [here](https://developers.openai.com/apps-sdk/build/chatgpt-ui)
- Easy testing and verification. UI, Logic, different model behaviour
- Easy incredible UX via all the [Animations](https://openai.github.io/apps-sdk-ui/?path=/docs/transitions-animate--docs&globals=theme:dark) in the component lib.
- More visibility into the call chain. There's GPT -> server -> Tool -> handler and there seems to be failure modes in GPT -> Server that don't exist in MCP Inspector -> Server. Also,  debug why GPT may not render the UI when it should
- optimize metadata: https://developers.openai.com/apps-sdk/guides/optimize-metadata
- Deployment: Some good stuff to abstract here: https://developers.openai.com/apps-sdk/deploy


### CSP
remember to set CSP for widgets
https://developers.openai.com/apps-sdk/build/mcp-server/#build-your-mcp-server

## Local UI Development

Widgets normally only render inside ChatGPT's iframe, where `window.openai` is populated by the host. This makes iterating on UI painful since you need to rebuild and wait for ChatGPT's aggressive caching to clear.

The solution is a **dev-only HTML entry point** that stubs `window.openai` with mock data fetched from a local JSON file, enabling Vite's HMR for rapid iteration.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  products-list.dev.html                                     │
│  1. fetch('/mocks/products.json')                           │
│  2. Stub window.openai.toolOutput with mock data            │
│  3. import('./widgets/ProductListWidget.tsx')  ← HMR here   │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
ui/
├── products-list.html       # Production: loads bundled JS from tunnel URL
├── products-list.dev.html   # Dev: fetches mock data, imports widget directly
├── styles/
│   └── products-list.css    # Shared styles (both HTML files link to this)
├── mocks/
│   └── products.json        # Mock data for local development
└── widgets/
    └── ProductListWidget.tsx
```

### Usage

```bash
npm run dev:ui
# Navigate to http://localhost:5173/products-list.dev.html
```

- **Component changes**: HMR updates instantly
- **Mock data changes**: Edit `ui/mocks/products.json` and refresh the page
- **Style changes**: HMR updates instantly (shared CSS)

### Creating a New Dev Page

1. Create `ui/mocks/<widget-name>.json` with mock data matching what `toolOutput` would contain
2. Create `ui/<widget-name>.dev.html`:
   - Link the shared stylesheet
   - Fetch the mock JSON
   - Stub `window.openai` with the mock data
   - Dynamically import the widget TSX
3. Add the dev HTML to `vite.config.ts` rollup inputs (optional, for build parity)

### What Gets Stubbed

The dev HTML stubs the full `window.openai` interface:

| Property | Stubbed Value |
|----------|---------------|
| `toolOutput` | Fetched from mock JSON |
| `toolInput` | Empty object |
| `theme` | `'dark'` |
| `displayMode` | `'inline'` |
| `callTool()` | No-op async function |
| `requestClose()` | No-op |
| ... | Other API methods stubbed as no-ops |

This allows widgets that read from `useToolOutput()` or other hooks to work without modification.

## Building
### Vite vs esBuild
You can use both Vite and esbuild

Vite (build:ui) — for:
- Dev server with HMR
- Building HTML entry points
- More complex build configs

esbuild (build:widget) — for:
- Simple, fast single-component bundles
- Matches the OpenAI docs pattern
- Smaller, focused output
Recommendation
Keep both:
Use npm run dev:ui (Vite) for development
Use npm run build:widget (esbuild) for the production widget bundle



## Technology Stack

- **Runtime**: Node.js with TypeScript (ES modules)
- **Server Framework**: Express.js
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **Database**: SQLite via Prisma ORM
- **Database Adapter**: `@prisma/adapter-better-sqlite3`
- **Validation**: Zod v4
- **Build Tool**: TypeScript compiler (`tsc`) + Vite (for UI components)

## Architecture Layers

### 1. HTTP Transport Layer (`src/server.ts`)
- Express.js server listening on port 3000 (configurable via `PORT` env var)
- Exposes `/mcp` POST endpoint for MCP protocol communication
- Uses `StreamableHTTPServerTransport` for request/response handling
- Serves static UI files from `dist/ui/` at `/ui` endpoint
- Health check endpoint at `/health`
- Graceful shutdown with database disconnection

### 2. MCP Server Layer (`src/server.ts`)
- `McpServer` instance named `prisma-mcp-server`
- Registers tools and resources on startup
- Creates new transport instance per request to prevent ID collisions

### 3. Tools & Resources Layer (`src/tools.ts`)
- **Tools**: Executable functions that AI models can call
- **Resources**: URI-addressable data that clients can access
- All tools interact with Prisma for data persistence

### 4. Data Access Layer (`src/prisma.ts`)
- Prisma Client configured with Better SQLite3 adapter
- Database path: `prisma/dev.db` (default) or `DATABASE_URL` env var
- Generated Prisma client located at `src/generated/prisma`

## Managing State

### High level data flow
Server state <--> ChatGPT host globals state (client API) <--> Component state

### Types of state and how to use it

| State type | Owned by | Lifetime | Examples |
| --- | --- | --- | --- |
| Business data (authoritative) | MCP server or backend service | Long-lived | Tasks, tickets, documents |
| UI state (ephemeral) | The widget instance inside ChatGPT | Only for the active widget | Selected row, expanded panel, sort order |
| Cross-session state (durable) | Your backend or storage | Cross-session and cross-conversation | Saved filters, view mode, workspace selection |

- **Server state (source of truth):** Prisma-backed data lives in SQLite and is mutated only through MCP tools (`list_products`, `add_product_to_wishlist`, etc.). Tool responses return both text and `structuredContent`; ChatGPT pushes updates to the widget via `openai:set_globals`.
- **Client state (React widget):** UI reads host globals with `useOpenAiGlobal(...)` from `ui/hooks.ts`, which subscribes to `openai:set_globals` and treats the host as authoritative. When a host `setWidgetState` setter is available, a `useWidgetState` wrapper can call that setter and mirror the latest `widgetState`, but the subscription to `openai:set_globals` still drives resync so local state can never diverge from host-persisted state.


## Data Model

### User
- `id` (UUID, primary key)
- `email` (unique, indexed)
- `wishlistItems` (one-to-many relation)

### Product
- `id` (UUID, primary key)
- `shopifyId` (unique, indexed)
- `shop` (indexed)
- Product metadata: `title`, `handle`, `status`, `description`, `descriptionHtml`, pricing, media
- `wishlistItems` (one-to-many relation)

### WishlistItem
- `id` (UUID, primary key)
- `userId` (foreign key, indexed)
- `productId` (foreign key, indexed)
- `note` (optional user note)
- Unique constraint on `[userId, productId]` to prevent duplicates
- Cascade delete on user/product deletion

## MCP Tools

1. **`list_products`** - List products filtered by userId (wishlist) or shop
2. **`get_product`** - Get product by ID or Shopify ID
3. **`add_product_to_wishlist`** - Add product to user's wishlist (creates user if needed)
4. **`remove_product_from_wishlist`** - Remove product from wishlist
5. **`add_note`** - Add/update note for wishlist item
6. **`view_wishlist`** - View all products in user's wishlist
7. **`search_products`** - Search wishlist by title, description, or note

## MCP Resources

1. **`product://{id}`** - Access product data by ID
2. **`checkout://{query_string}`** - Checkout link resource (placeholder)
3. **`ui://widget/wishlist.html`** - Wishlist UI widget rendered in ChatGPT iframe

## ChatGPT-Specific Features

This MCP server uses OpenAI's Apps SDK extensions to integrate with ChatGPT. These features enable rich UI components and enhanced user experience within ChatGPT conversations.

### Tool Metadata (`_meta` fields)

Tools can include a `_meta` object with ChatGPT-specific metadata:

- **`openai/outputTemplate`**: Specifies a UI widget URI to render when the tool completes. ChatGPT will display the widget in an iframe instead of just showing text output.
  ```typescript
  _meta: {
    'openai/outputTemplate': 'ui://widget/wishlist.html'
  }
  ```

- **`openai/toolInvocation/invoking`**: A message shown to the user while the tool is executing (e.g., "Loading wishlist").
  - **Why it's necessary**: Provides user feedback during potentially slow operations, improving perceived responsiveness.

- **`openai/toolInvocation/invoked`**: A message shown after the tool completes successfully (e.g., "Wishlist loaded").
  - **Why it's necessary**: Confirms completion and provides context about what just happened.

### Structured Content in Tool Responses

All tools return both `content` (text) and `structuredContent` (JSON):

```typescript
return {
  content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
  structuredContent: output
};
```

- **What it does**: Provides data in two formats - human-readable text for the conversation and structured JSON for UI components.
- **Why it's necessary**: ChatGPT can display text in the conversation while UI widgets can access structured data via `window.openai.toolOutput`. This dual format ensures compatibility with both text-based and visual interfaces.

### UI Resources

UI resources are registered with special metadata for ChatGPT rendering:

- **MIME Type**: `text/html+skybridge`
  - **What it does**: Tells ChatGPT this is a UI widget that should be rendered in an iframe.
  - **Why it's necessary**: Without this MIME type, ChatGPT would treat the HTML as plain text instead of rendering it as an interactive component.


### Client-Side APIs (`window.openai`)
missing some here.
UI components can interact with ChatGPT and the MCP server through the `window.openai` API:

- **`window.openai.toolOutput`**: Access structured data returned by the tool that invoked this widget.
  - **What it does**: Provides the `structuredContent` from the tool response.
  - **Why it's necessary**: Allows widgets to render data without making additional API calls. The data is passed directly from the tool execution.

- **`window.openai.callTool(name, payload)`**: Call MCP tools from within the UI component.
  - **What it does**: Invokes an MCP tool and returns its result.
  - **Why it's necessary**: Enables interactive widgets that can trigger actions (e.g., adding items, updating state) without requiring the user to type commands in the chat.

- **`openai:set_globals` Event**: Listen for global state updates.
  - **What it does**: Fires when ChatGPT updates global state that should be reflected in the widget.
  - **Why it's necessary**: Allows widgets to reactively update when data changes elsewhere in the conversation or when tools are called that affect the widget's data.

### Example: Complete Integration Flow

1. **User asks**: "Show me my wishlist"
2. **ChatGPT calls**: `view_wishlist` tool (which has `_meta` with `openai/outputTemplate`)
3. **Tool executes**: Returns `structuredContent` with products array
4. **ChatGPT renders**: Loads `ui://widget/wishlist.html` in an iframe
5. **Widget initializes**: Reads `window.openai.toolOutput.products` to display data
6. **User interacts**: Widget can call `window.openai.callTool()` to add/remove items
7. **State updates**: `openai:set_globals` event fires to update the widget

This creates a seamless, interactive experience where ChatGPT orchestrates the conversation while your custom UI handles the visual presentation and user interactions.

## Key Design Patterns

- **User Auto-Creation**: `ensureUserExists()` helper creates users on-demand when they don't exist
- **Structured Output**: All tools return both `content` (text) and `structuredContent` (JSON) for compatibility
- **Request Isolation**: New transport instance per request prevents state leakage
- **Type Safety**: Zod schemas for input/output validation, TypeScript for compile-time safety

## Project Structure

```
src/
├── server.ts          # Express server + MCP server setup
├── tools.ts           # MCP tools and resources registration
├── prisma.ts          # Prisma client configuration
└── generated/
    └── prisma/        # Generated Prisma client

ui/
├── wishlist.html      # Wishlist UI component
└── README.md          # UI development guide

prisma/
├── schema.prisma      # Database schema definition
├── dev.db            # SQLite database file
└── migrations/        # Database migration history

dist/
├── ui/                # Built UI components (generated by Vite)
└── [compiled JS]     # Compiled TypeScript (generated by tsc)
```

## Database

- **Provider**: SQLite
- **Location**: `prisma/dev.db` (default)
- **Migrations**: Managed via Prisma Migrate
- **Client Generation**: Custom output path `src/generated/prisma`

## Development Workflow

1. **Schema Changes**: Edit `prisma/schema.prisma`
   - **What it does**: Modify the database schema definition to add, remove, or change tables, fields, relationships, or constraints.
   - **Why it's necessary**: The schema file is the single source of truth for your database structure. Changes here define what data can be stored and how tables relate to each other. Without updating the schema, you can't add new fields or tables to your database.

2. **Generate Client**: `npm run prisma:generate`
   - **What it does**: Generates TypeScript types and a Prisma Client based on your current schema file. Creates type-safe database access code in `src/generated/prisma/`.
   - **Why it's necessary**: After schema changes, the Prisma Client must be regenerated so your TypeScript code has the correct types and methods. Without this step, your code would reference outdated types and might fail at runtime or have type errors.

3. **Run Migrations**: `npm run prisma:migrate`
   - **What it does**: Applies schema changes to the actual database file (`prisma/dev.db`). Creates migration files that record the changes and updates the database structure to match your schema.
   - **Why it's necessary**: Schema changes in the `.prisma` file don't automatically update the database. Migrations translate schema changes into SQL commands that modify the database structure. This ensures your database matches your schema definition and preserves data integrity.

4. **Build UI Components**: `npm run build:ui`
   - **What it does**: Uses Vite to compile and bundle UI components from the `ui/` directory into static assets in `dist/ui/`. Processes HTML, CSS, and JavaScript, optimizing them for production.
   - **Why it's necessary**: The MCP server needs pre-built UI files to serve to ChatGPT's iframe. Vite handles bundling, minification, and asset optimization. The server reads these built files when registering UI resources.

5. **Development**: `npm run dev` (uses `tsx --watch`)
   - **What it does**: Starts the Express server in development mode with hot-reloading. Watches for TypeScript file changes and automatically restarts the server when you save changes.
   - **Why it's necessary**: Provides a fast feedback loop during development. You can see changes immediately without manually rebuilding and restarting. `tsx` runs TypeScript directly without a separate compilation step, speeding up iteration.

6. **Development (UI)**: `npm run dev:ui`
   - **What it does**: Starts Vite's development server on port 5173 with hot module replacement (HMR). Allows you to preview and develop UI components with instant updates when you change files.
   - **Why it's necessary**: Enables rapid UI development with live reloading. You can test UI components independently before integrating them with the MCP server. HMR updates the browser instantly without full page reloads.

7. **Development (All)**: `npm run dev:all`
   - **What it does**: Runs both the MCP server (`npm run dev`) and Vite dev server (`npm run dev:ui`) concurrently using `concurrently`.
   - **Why it's necessary**: Allows you to develop both the backend server and UI components simultaneously. Both servers run in parallel, so you can test the full integration while making changes to either side.

8. **Build**: `npm run build` (TypeScript compilation + Vite build)
   - **What it does**: Compiles TypeScript source files to JavaScript in `dist/` and builds UI components to `dist/ui/`. Creates production-ready code optimized for performance.
   - **Why it's necessary**: Production deployments need compiled JavaScript (Node.js can't run TypeScript directly) and pre-built UI assets. The build process also performs optimizations like tree-shaking, minification, and type checking that catch errors before deployment.

9. **Production**: `npm start` (runs compiled `dist/server.js`)
   - **What it does**: Starts the server using the compiled JavaScript files from `dist/`. Assumes you've already run `npm run build` to generate the production artifacts.
   - **Why it's necessary**: Production environments need stable, optimized code. Running compiled JavaScript is faster and more reliable than running TypeScript directly. This command also serves the pre-built UI files from `dist/ui/` that were created during the build step.


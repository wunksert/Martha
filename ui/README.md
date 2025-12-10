# UI Components

This directory contains UI components that will be rendered in ChatGPT's iframe.

## Structure

- `wishlist.html` - Wishlist widget component

## Development

### Build UI components

```bash
npm run build:ui
```

### Development mode with hot reload

```bash
npm run dev:ui
```

This will start Vite dev server on `http://localhost:5173` with hot module replacement.

### Build everything (server + UI)

```bash
npm run build
```

### Development mode (server + UI)

```bash
npm run dev:all
```

This runs both the MCP server and Vite dev server concurrently.

## Adding New Components

1. Create a new HTML file in the `ui/` directory
2. Add it to `vite.config.ts` rollupOptions.input
3. Register it as a resource in `src/tools.ts` registerResources function
4. Use it in your tools by adding `_meta` with `openai/outputTemplate` pointing to your widget URI

## Component Communication

Components communicate with ChatGPT via:

- `window.openai.toolOutput` - Access tool output data
- `window.openai.callTool(name, payload)` - Call MCP tools
- `openai:set_globals` event - Listen for global updates

See `wishlist.html` for a complete example.

